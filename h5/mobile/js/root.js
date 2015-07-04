//rootModule.js
"use strict";

G.weiboApp
.controller("inviteController", function($scope) {
	$scope.inviteFriend = function() {
		debug.log("invite friends");
		G.leClient.createinvcode(G.sid, G.bid, 24 * 3600, 20, 40, function (invcode) {
			//get template code
			G.leClient.get(G.sid, G.appBid, G.makefile.system.invite.fileKey, function(tmp) {
				var r = new FileReader();
				r.onloadend = function(e) {
					var htmlTemplate = r.result;
					//add inviter's bid to template
					htmlTemplate = htmlTemplate.replace('%%inviter%%', G.bid);
					//debug.log(htmlTemplate);
					//set template with invcode
					G.leClient.setinvtemplate(G.sid, G.bid, invcode, htmlTemplate, function() {
						debug.info("template set ok", invcode);
						$scope.invCode = "http://"+G.currentIP+"/getres?key="+G.makefile.files.inviteFile.fileKey+"&bid="+G.appBid+"&sid="+G.sid+"&invcode="+invcode+"&sender="+G.bid;
						$scope.$apply();
						
						G.leClient.getinvcodeinfo(G.sid, G.bid, invcode, function(info) {
							debug.info(info);
							$scope.friendCount = info.friendCount;
							$scope.hourCounter = parseInt(info.validity/3600)+1;
							$scope.$apply();
						}, function(name, err) {
							debug.warn(err);
						});
					}, function(name, err) {
						debug.warn(err);
					});
				};
				r.readAsText(new Blob([tmp[1]], {type : 'utf-8'}));
			}, function(name, err) {
				debug.warn(err);
			});
		}, function(name, err) {
			debug.warn(err);
		});
	};
	
	$scope.copyLink = function() {
		//copy the invite link into clipboard
		//window.clipboardData.setData("Text", $scope.invContent);	//works only in IE
		if (navigator.userAgent.indexOf('Macintosh') !== -1)
			window.prompt("复制到剪贴板按住Command+C, 然后按回车键", $scope.invCode);
		else
			window.prompt("复制到剪贴板按住Ctrl+C, 然后按回车键", $scope.invCode);
	};
})
.controller("appController", function($rootScope) {
	console.log("In app controller");	//the very root of this app
	
	//do little here, just initiate some global variables
	//var myRootScope = angular.element(document.getElementById("myAppRoot")).scope();
	$rootScope.weiboList = [];			//all the weibos read into memory
	$rootScope.currentList = [];		//weibo being displayed in current page
	$rootScope.appID = "newWeibo";
	$rootScope.chatSessions = {};
	$rootScope.global = {
		currentPage : 1,
		itemsPerPage : 10,
	};
})
//get weibo list and display them nicely
.controller("weiboController", ["$state", "$stateParams", "$scope", "$rootScope", "$timeout",
                                function($state, $stateParams, $scope, $rootScope, $timeout) {
	debug.log("in weibo controller")
	G.spinner.spin(document.getElementById('myAppRoot'));

	//state switch
	var iDay = 0;			//index of the most recent day, used by getPosts() to read single user's posts
	var wbListLen = 0;		//length of weibo list
	//starting from today, read each day's weibo backward. Until we have enough posts for on screen display
	var wbDay = parseInt(new Date().getTime()/86400000);
	$scope.weiboList.length = 0;
	$scope.currentList.length = 0;
	$scope.global.currentPage = 1;
	$rootScope.slides = [];
			
	$scope.R = {
			reviewedWeibo	: null,
			relayedWeibo	: null,
			favoriteWeibo	: null
	};

	$scope.showPostDetail = function(wb) {
		$rootScope.currentWB = wb;
		$state.go("root.post");
	};
	
	$scope.showRelay = function(wb) {
		$scope.R.reviewedWeibo = null;
		$scope.R.favoriteWeibo = null;
		if ($scope.R.relayedWeibo === wb.wbID) {
			//this reviews are being shown. Close it
			$scope.R.relayedWeibo = null;
		} else {
			$scope.R.relayedWeibo = wb.wbID;		//reviews of this weibo will be loaded.
		}
	};
	
	$scope.showReview = function(wb) {
		$scope.R.relayedWeibo = null;
		$scope.R.favoriteWeibo = null;
		if ($scope.R.reviewedWeibo === wb.wbID) {
			//this reviews are being shown. Close it
			$scope.R.reviewedWeibo = null;
		} else {
			$scope.R.reviewedWeibo = wb.wbID;		//reviews of this weibo will be loaded.
		}
	};
	
	$scope.deleteWeibo = function(wb) {
		if (G.bid !== wb.authorID) return;
		wb.del(function() {
			var i = G.search($scope.weiboList, wb);
			if (i !== -1) {
				$scope.weiboList.splice(i, 1);
			};
			i = G.search($scope.currentList, wb);
			if (i !== -1)
				$scope.currentList.splice(i, 1);
			$scope.myUserInfo.weiboCount--;
			if ($scope.myUserInfo.checkFavorite(wb))
				$scope.myUserInfo.favortieCount--;
			$scope.$apply();
		});
	};

	$scope.showPicSlider = function(wb) {
		if (wb.pictures.length === 0)
			return;
		$rootScope.slides = [];
		angular.forEach(wb.pictures, function(pic, i) {
			var p = new WeiboPicture(pic.id, wb.authorID);
			p.get(0, function(uri) {	//get the original pic, not cropped one
				$rootScope.slides.push({
					image : p.dataURI,
					text : i
				});	
				$scope.$apply();
			});
		});

		easyDialog.open({
			container : 'pic_slider',
			fixed : false,
			drag : true,
			overlay : true
			});
	};
	
	$scope.pageChanged = function() {
		if ($state.is("root.main.allPosts")) {
			//everytime the controller is loaded, refresh all the weibo list
			getAllPosts(wbDay, false);
		}
		else if ($state.is("root.main.original")) {
			getAllPosts(wbDay, true);
		}
		else if ($state.is("root.main.favorite")) {
			showFavorites(G.bid);
		}
		else if ($state.is("root.personal.allPosts")) {
			getPosts($stateParams.bid, iDay, false);
		}
		else if ($state.is("root.personal.original")) {
			getPosts($stateParams.bid, iDay, true);
		}
		else if ($state.is("root.personal.favorite")) {
			showFavorites($stateParams.bid);
		};
	};
	
	// if original is true, get only the original ones.
	//try to read all the weibos from the last 5 days
	var getAllPosts = function(currentDay, original) {
		//debug.log("in getAllPosts(), page num=" +$scope.global.currentPage+" current date="+currentDay+ " wbLen="+wbListLen);
		$scope.totalItems = wbListLen + $scope.global.itemsPerPage;
		G.slice($scope.weiboList, $scope.currentList, ($scope.global.currentPage-1)*$scope.global.itemsPerPage, $scope.global.currentPage*$scope.global.itemsPerPage);

		if (wbListLen < $scope.global.currentPage * $scope.global.itemsPerPage) {
			//read my own weibo
			getPostPerDay(G.bid, currentDay, original);
			for (var i=0; i<$scope.myUserInfo.b.friends.length; i++) {
				//read weibo of a certain friend on a given day		
				getPostPerDay($scope.myUserInfo.b.friends[i].bid, currentDay, original);
			};

			if (wbDay-currentDay > 60) {	//look for weibo in the past month
				wbDay = currentDay-1;		//remember the last day from which post is read
				debug.log("get out of loop, " + currentDay)
				return;
			} else {
				currentDay--;
				$timeout(function() {return getAllPosts(currentDay, original)});
			};
		} else {
			//remember the last date of weibo read and exit
			debug.info("current day="+wbDay);
			wbDay = currentDay;
		};
	};
	
	var getPostPerDay = function(bid, day, original) {
		G.leClient.hget(G.sid, bid, G.Posts, day, function(keys) {
			if (keys[1]) {
				wbListLen += keys[1].length;
				$scope.totalItems = wbListLen + $scope.global.itemsPerPage;
				//make sure there is weibo in the list
				for(var j=0; j<keys[1].length; j++) {
					getWeibo(bid, keys[1][j], original);
				};
			};
		}, function(name, err) {
			debug.error(err, bid, day);
		});
	};
	
	//read one weibo and add it to weiboList
	var getWeibo = function(bid, key, original) {
		var wb = new WeiboPost(key, bid, $scope);
		wb.get(original, function(readOK) {
			if (readOK) {
				debug.log(wb);
				$scope.myUserInfo.checkFavorite(wb);
				$scope.weiboList.push(wb);
				//sort array in descending order, worked like a charm
				$scope.weiboList.sort(function(a,b) {return b.timeStamp - a.timeStamp})
				G.slice($scope.weiboList, $scope.currentList, ($scope.global.currentPage-1)*$scope.global.itemsPerPage, $scope.global.currentPage*$scope.global.itemsPerPage);
				$scope.$apply();
				$timeout(function() {G.spinner.stop();});		//stop loading sign					
			};
		});
	};
	
	//var wbCount = 0;	//weibo already read into memory
	var getWeiboOfDay = function(bid, days, i, original) {
		if (i >= days.length) return;
		G.leClient.hget(G.sid, bid, G.Posts, days[i], function(keys) {
			debug.log("in getWeiboOfDay(), pagenum=" +$scope.global.currentPage+" iDay="+days[i]);
			//debug.log(keys[1]);
			for (var j=0; j<keys[1].length; j++) {
				getWeibo(bid, keys[1][j], original);
			};
			wbListLen += keys[1].length;
			if (wbListLen > $scope.global.currentPage*$scope.global.itemsPerPage) {
				iDay = i+1;
				debug.log("iDay="+iDay)
				return;
			} else {
				getWeiboOfDay(bid, days, i+1, original);
			};
		});
	};
	
	//read all the post of a certain friend
	var getPosts = function(bid, iDay, original) {
		//debug.log("in getPosts(), pagenum=" +$scope.global.currentPage+" iDay="+iDay);
		G.slice($scope.weiboList, $scope.currentList, ($scope.global.currentPage-1)*$scope.global.itemsPerPage, $scope.global.currentPage*$scope.global.itemsPerPage);
		$scope.totalItems = $scope.currUserInfo.weiboCount;
		G.leClient.hkeys(G.sid, bid, G.Posts, function(days) {
			//get list of date on which there are posts
			days.sort(function(a,b) {return b-a});
			//debug.log(days);
			if (iDay < days.length)
				getWeiboOfDay(bid, days, iDay, original);
		}, function(name, err) {
			debug.error(err);
		});
	};

	//show all my favorites. key=G.Favorites, field=authorID, value=[wbIDs,....]
	var showFavorites = function(bid) {
		debug.log("in showFavorites");
		$scope.totalItems = 0;

		G.leClient.hgetall(G.sid, bid, G.Favorites, function(data) {
			if (data === null) {
				return;
			};
			//data[i].field is author id of favorites
			//data[i].value is array of wbID by the author
			for(var i=0; i<data.length; i++) {
				//count the total number of favorites to be displayed
				$scope.totalItems += data[i].value.length;
				for (var j=0; j<data[i].value.length; j++) {
					//debug.log(data[i].field + " " +data[i].value[j]);
					getWeibo(data[i].field, data[i].value[j], false);
				};
			};
		}, function(name, err) {
			debug.error("showFavorite err=" +err);
		});
	};

	$scope.showFullPic = function(wb, picKey) {
		var p = new WeiboPicture(picKey, wb.authorID);
		p.get(1, function(uri) {
			window.open(uri, "_self");
		});
	};
	
	//publish a new Post with a ParentID
	$scope.relayPost = function(relayText, parentWB) {
		console.log("in relayPost()");
		var wb = new WeiboPost();
		if (parentWB.parentID !== null) {
			//relaying a weibo that has been relayed at least once.
			//attach its text to the new review and update the parent
			wb.body = relayText+"://@"+parentWB.author+":"+parentWB.body;		//these 2 fields have value only in a relayed post
			wb.parentID = parentWB.parentID;
			wb.parentAuthorID = parentWB.parentAuthorID;
			wb.parentWeibo = parentWB.parentWeibo;
		} else {
			wb.body = relayText;				
			wb.parentID = parentWB.wbID;
			wb.parentAuthorID = parentWB.authorID;
			wb.parentWeibo = parentWB;
		}
		wb.body = wb.body.toString().slice(0, G.MaxWeiboLength);
		wb.timeStamp = new Date().getTime();
		wb.authorID = G.bid;
		wb.author = $scope.myUserInfo.nickName;
		
		wb.set(function() {
			$scope.weiboList.unshift(wb);
			G.slice($scope.weiboList, $scope.currentList, ($scope.global.currentPage-1)*$scope.global.itemsPerPage, $scope.global.currentPage*$scope.global.itemsPerPage);
			$scope.myUserInfo.weiboCount++;
			$scope.myUserInfo.setLastWeibo(wb);
			
			//close review window and roll to the top of page where the new forward is displayed
			$scope.R.relayedWeibo = null;
			scrollTo(0,200);
			$scope.$apply();
		});
	};

	if ($state.is("root.main.allPosts")) {
		//everytime the controller is loaded, refresh all the weibo list
		debug.log("state is main.allPosts");
		getAllPosts(wbDay, false);
	}
	else if ($state.is("root.main.original")) {
		debug.log("state is main.original");
		getAllPosts(wbDay, true);
	}
	else if ($state.is("root.main.favorite")) {
		debug.log("state is favorite");
		showFavorites(G.bid);
	}
	else if ($state.is("root.personal.allPosts")) {
		debug.log("state is personal.allposts");
		getPosts($stateParams.bid, iDay, false);
	}
	else if ($state.is("root.personal.original")) {
		debug.log("state is personal.original");
		getPosts($stateParams.bid, iDay, true);
	}
	else if ($state.is("root.personal.favorite")) {
		debug.log("state is favorite");
		showFavorites($stateParams.bid);
	};
}])
.controller("pictureController", ["$state", "$stateParams", "$scope", "$timeout",
                                  function($state, $stateParams, $scope, $timeout) {
	debug.log("in picture controller");
	G.spinner.spin(document.getElementById('myAppRoot'));
	
	//pic keys are saved in G.PostPics, indexed by weibo date
	//for now, read all pics into the following list without pagination.
	$scope.myPicUrls = [];
	
	function onlyUnique(value, index, self) { 
	    return self.indexOf(value) === index;
	};
	
	var getPicsOfDay = function(day, bid) {
		G.leClient.hget(G.sid, bid, G.PostPics, day, function(keys) {
			if (keys[1]) {
				//keys is array of wbID whose weibo has picture
				angular.forEach(keys[1], function(wbID) {
					//debug.log(wbID);
					G.leClient.get(G.sid, bid, wbID, function(wb) {
						//wb[1] is a WBASE object
						angular.forEach(wb[1].pictures, function(picKey) {
							var p = new WeiboPicture(picKey, bid);
							p.get(1, function(uri) {
								//do nothing other than get the picture
								p.dataURI = uri;
								$scope.myPicUrls.push(p);
								$timeout(function() {G.spinner.stop()});
							});
						});
					}, function(name, err) {
						debug.error(err);
					});
				});
			} else {
				G.spinner.stop();
			};
		}, function(name, err) {
			debug.error(err);
		});
	};
	
	//get all the pics of a user. Pic keys are saved in a global list
	function getUserPics(bid) {
		debug.log("in getUserPics", bid);
		G.leClient.hkeys(G.sid, bid, G.PostPics, function(wbDays) {
			debug.log(wbDays);
			if (wbDays.length>0) {
				wbDays.sort(function(a,b) {return b-a;});
				for (var i=0; i<wbDays.length && i<7; i++) {
					getPicsOfDay(wbDays[i], bid);
				};
			} else {
				G.spinner.stop();
			};
		}, function(name, err) {
			debug.error("pic controller err= " + err);
		});
	};
	
	$scope.showFullPic = function(pic) {
		G.leClient.get(G.sid, pic.wb.authorID, pic.id, function(data) {
			if (data[1]) {
				var r = new FileReader();
				r.onloadend = function(e) {
					window.open(e.target.result, "_blank");
				};
				r.readAsDataURL(new Blob([data[1]], {type: 'image/png'}));
			};
		}, function(name, err) {
			debug.warn(err);
		});
	};

	function getAllPics() {
		//read all posts into a list, including self
		getUserPics(G.bid);
		for(var i=0; i< $scope.myUserInfo.b.friends.length; i++) {
			getUserPics($scope.myUserInfo.b.friends[i].bid);
		};
	};
	
	if ($state.is("root.main.pictureGrid")) {
		debug.log("in main picture state");
		getAllPics();
	} else if ($state.is("root.personal.pictureGrid")) {
		debug.log("in personal picture state");
		getUserPics($stateParams.bid);
	};
}])
.controller("postController", ["$scope", "$rootScope", "$state", "$q",
                               function($scope, $rootScope, $state, $q) {
	//publish new post
	debug.log("In Post controller")
	//var q = angular.injector(['ng']).get('$q');
	$scope.P = {
			txtInvalid		: true,
			chCounter		: G.MaxWeiboLength,
			submitStyle		: "send_btn W_btn_v_disable",
			showPicUpload	: false
	};
	var tmpPicFiles = [];	//save selected picture files for upload
	$scope.tmpPicUrls = [];
	
	$scope.delPic = function(i) {
		$scope.tmpPicUrls.splice(i, 1);
	};
	
	$scope.selectPics = function() {
		if ($scope.P.showPicUpload === false) {
			//open the pic selected area and open file selection dialog
			$scope.P.showPicUpload = true;
			//simulate a click event to open the picture selection dialog
			//var ev = document.createEvent('HTMLEvents').initEvent('click', false, true); 
            document.getElementById("wbPicUpload").dispatchEvent(new Event('click'));
		} else {
			$scope.P.showPicUpload = false;
		};
	};
	
	//publish a new Post, which doesn't have a ParentID
	$scope.addNewPost = function() {
		debug.log("add new post");
		//prevent duplicated submission
		$scope.P.txtInvalid = true;
		
		var wb = new WeiboPost();
		wb.body = $scope.wbText;
		wb.timeStamp = new Date().getTime();
		wb.authorID = G.bid;
		wb.author = $scope.myUserInfo.nickName;

		//upload attached pictures
		var ds = [];
		debug.info("number of tmppictures ="+tmpPicFiles.length);
		angular.forEach(tmpPicFiles, function(picFile) {
			var df = $q.defer();
			var r = new FileReader();
			r.onloadend = function(e) {
				var p = new WeiboPicture();
				p.set(r.result, function(setOK) {
					if (setOK) {
						p.get(1, function(uri) {
							p.dataURI = uri;
							wb.pictures.push(p);								
							df.resolve();
						});
					} else {
						df.reject();
					};
				});
			};
			r.readAsDataURL(picFile);
			ds.push(df.promise);
		});
		//create new post after all pics are submitted
		$q.all(ds).then(function() {
			//pic files uploaded ok, clear tmp files
			tmpPicFiles.length = 0;
			$scope.tmpPicUrls.length = 0;
			$scope.P.showPicUpload = false;
							
			//add a new post to DB and the new postKey to a list
			wb.set(function() {
				debug.log("addNewPost:", wb);
				//successfully added a new weibo key. Now clear up
				$scope.global.weiboCount++;
				$scope.wbText = '';
				$scope.wbtxtChanged();
				
				//update user's more recent active time
				$scope.myUserInfo.weiboCount++;
				$scope.myUserInfo.setLastWeibo(wb);
				
				//display the sent OK label for 5000 milliseconds
				$("#wbSubmitOK").fadeIn('slow').delay(3000).fadeOut('slow');
				$scope.weiboList.unshift(wb);
				G.slice($scope.weiboList, $scope.currentList, 0, $scope.global.itemsPerPage);
				$scope.global.currentPage = 1;
				$state.go("root.main.allPosts");
			}, function(reason) {
				debug.error(reason);
			});
		}, function(reason) {
			debug.warn(reason);
		});
	};

	//display thumbnails of selected image files in the pic selection box
	$scope.fileSelected = function(files) {
		//debug.log("new file selected");
		for (var i=0; i<files.length; i++) {
			tmpPicFiles.push(files[i]);			//remember all the files selected
			//$scope.tmpPicUrls.push(window.URL.createObjectURL(files[i]));		//works too
			
			var r = new FileReader();
			r.onloadend = function(e) {
				$scope.tmpPicUrls.push(e.target.result);	//display as thumbnail in file selection box
				$scope.$apply();
			};
			r.readAsDataURL(files[i], {type: 'image/png'});
		};
	};
	
	//changed the style of submit button by checking validity of input text
	//limit the number of input to 140
	$scope.wbtxtChanged = function() {
		if (angular.isUndefined($scope.wbText) || $scope.wbText.toString().replace(/\s+/g,"") === '') {
			$scope.P.submitStyle = "send_btn W_btn_v_disable";
			$scope.P.txtInvalid = true;
			$scope.P.chCounter = G.MaxWeiboLength;
		} else {
			$scope.P.submitStyle = "send_btn W_btn_v";
			$scope.P.txtInvalid = false;
			if ($scope.wbText.toString().length > G.MaxWeiboLength) {
				//no more, remove the last char input
				$scope.wbText = $scope.wbText.toString().slice(0, G.MaxWeiboLength);
				
				//there is a problem of Chinese char input at end of weibo. The code checks for
				//pinyin input instead of Kanji character.
			} else {
				$scope.P.chCounter = G.MaxWeiboLength - $scope.wbText.toString().length;
			}
		};
	};
}])
.filter("chatTime", function() {
	return function(ts) {
		if (!ts)
			return "无纪录";
		var d = new Date(ts);
		var y, mo, h, min, day;
		h = d.getHours();		//hour
		min = d.getMinutes();	//minute
		mo = d.getMonth();		//month
		y = d.getFullYear();	//year
		day = d.getDate();
		
		var t = parseInt((new Date().getTime() - ts)/3600000);
		if (t <= 24) {
			//if (m<10) m="0"+m.toString()
			return h+ "点" +min+"分";
		}
		else if (t>24 && t<8760) {
			return (mo+1)+"月"+day+"日"+h+ "点" +min+"分";
		}
		else {
			return y+"年"+(mo+1)+"月"+day+"日"+h+ "点" +min+"分";
		};
	};
})
.filter("timePassed", function() {
	return function(t) {
		t = parseInt((new Date().getTime() - t)/60000);
		if (t < 6) {
			return "刚刚";
		} else if (t < 60) {
			return t+"分钟前";
		} else if (t/60 < 24) {
			return parseInt(t/60)+"小时前";
		} else {
			return parseInt(t/1440) +"天前";
		};
	};
})
.filter("bracket", function() {
	return function(n) {
		if (n===0) {
			return null;
		} else if (n<1000) {
			return ""+n+"";
		} else {
			return "999+";
		};
	};
})
.filter("fileName", function() {
	return function(t) {				//t is a file name
		//limit the displayed file name to 20 chars
		if (t && t.toString().length > 20) {
			t = t.substr(0, 17) + "...";
		};
		return t;
	};
})
.filter("message", function() {
	return function(m) {					//m is a message
		if (!m) return;
		if (m.contentType === 2)	{		// a file
			var arr = m.content.toString().split("\t");
			if (arr[0].toString().length > 20) {
				return arr[0].toString().substr(0, 17) + "...";
			};
			return arr[0];
		}
		else if (m.contentType === 1) {  	// a picture
			;
		} else {
			return m.content;		//text message
		};
	};
})
