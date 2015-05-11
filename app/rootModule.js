//rootModule.js
"use strict";
(function() {
	G_VARS.weiboApp
	.controller("appController", function($scope, $rootScope, $window) {
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

		var request = window.indexedDB.open("weiboDB", G_VARS.idxDBVersion);
		request.onerror = function(event) {
			debug.error("open indexedDB error", event.target.errorCode);
		};
		request.onsuccess = function(event) {
			G_VARS.idxDB = request.result;		//event.target.result;		//IDBDatabase object
			G_VARS.idxDB.onerror = function(e) {
				//generic handler for all error in this db
				debug.warn("weiboDB error, errorCode=" + e.target.errorCode);
			};
			debug.log("idxDB opened OK");
		};
		request.onupgradeneeded = function(event) {
			debug.info("here is db upgrade")
			G_VARS.idxDB = request.result;
			G_VARS.idxDB.createObjectStore(G_VARS.objStore.picture, {keyPath : "id"});
		};
	})
	//get weibo list and display them nicely
	.controller("weiboController", ["$state", "$stateParams", "$scope", "$rootScope", "$timeout",
	                                function($state, $stateParams, $scope, $rootScope, $timeout) {
		debug.log("in weibo controller")
		G_VARS.spinner.spin(document.getElementById('myAppRoot'));

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
			if (G_VARS.bid !== wb.authorID) return;
			debug.info(wb);
			wb.del(function() {
				var i = G_VARS.search($scope.weiboList, wb);
				if (i !== -1) {
					$scope.weiboList.splice(i, 1);
				};
				i = G_VARS.search($scope.currentList, wb);
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
			//G_VARS.spinner.spin(document.getElementById("pic_slider"));
			$rootScope.slides = [];
			angular.forEach(wb.pictures, function(pic, i) {
				$rootScope.slides.push({
					image : pic.dataURI,
					text : i
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
				showFavorites(G_VARS.bid);
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
			G_VARS.slice($scope.weiboList, $scope.currentList, ($scope.global.currentPage-1)*$scope.global.itemsPerPage, $scope.global.currentPage*$scope.global.itemsPerPage);

			if (wbListLen < $scope.global.currentPage * $scope.global.itemsPerPage) {
				//read my own weibo
				getPostPerDay(G_VARS.bid, currentDay, original);
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
			G_VARS.httpClient.hget(G_VARS.sid, bid, G_VARS.Posts, day, function(keys) {
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
			var wb = new WeiboPost(key, bid, original, $scope);
			wb.get(function() {
				//debug.log(wb);
				$scope.myUserInfo.checkFavorite(wb);
				$scope.weiboList.push(wb);
				//sort array in descending order, worked like a charm
				$scope.weiboList.sort(function(a,b) {return b.timeStamp - a.timeStamp})
				G_VARS.slice($scope.weiboList, $scope.currentList, ($scope.global.currentPage-1)*$scope.global.itemsPerPage, $scope.global.currentPage*$scope.global.itemsPerPage);
				$scope.$apply();
				$timeout(function() {G_VARS.spinner.stop();});		//stop loading sign
			});
		};
		
		//var wbCount = 0;	//weibo already read into memory
		var getWeiboOfDay = function(bid, days, i, original) {
			if (i >= days.length) return;
			G_VARS.httpClient.hget(G_VARS.sid, bid, G_VARS.Posts, days[i], function(keys) {
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
			G_VARS.slice($scope.weiboList, $scope.currentList, ($scope.global.currentPage-1)*$scope.global.itemsPerPage, $scope.global.currentPage*$scope.global.itemsPerPage);
			$scope.totalItems = $scope.currUserInfo.weiboCount;
			G_VARS.httpClient.hkeys(G_VARS.sid, bid, G_VARS.Posts, function(days) {
				//get list of date on which there are posts
				days.sort(function(a,b) {return b-a});
				//debug.log(days);
				if (iDay < days.length)
					getWeiboOfDay(bid, days, iDay, original);
			}, function(name, err) {
				debug.error(err);
			});
		};

		//show all my favorites. key=G_VARS.Favorites, field=authorID, value=[wbIDs,....]
		var showFavorites = function(bid) {
			debug.log("in showFavorites");
			$scope.totalItems = 0;

			G_VARS.httpClient.hgetall(G_VARS.sid, bid, G_VARS.Favorites, function(data) {
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
			p.get(function(uri) {
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
			wb.body = wb.body.toString().slice(0, G_VARS.MaxWeiboLength);
			wb.timeStamp = new Date().getTime();
			wb.authorID = G_VARS.bid;
			wb.author = $scope.myUserInfo.nickName;
			
			wb.set(function() {
				$scope.weiboList.unshift(wb);
				G_VARS.slice($scope.weiboList, $scope.currentList, ($scope.global.currentPage-1)*$scope.global.itemsPerPage, $scope.global.currentPage*$scope.global.itemsPerPage);
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
			showFavorites(G_VARS.bid);
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
	.controller("sidebarController", ["$stateParams", "$scope", "$location", function($stateParams, $scope, $location) {
		debug.log("in sidebar controller");
	}])
	.controller("pictureController", ["$state", "$stateParams", "$scope", "$timeout",
	                                  function($state, $stateParams, $scope, $timeout) {
		debug.log("in picture controller");
		G_VARS.spinner.spin(document.getElementById('myAppRoot'));
		
		//pic keys are saved in G_VARS.PostPics, indexed by weibo date
		//for now, read all pics into the following list without pagination.
		$scope.myPicUrls = [];
		
		function onlyUnique(value, index, self) { 
		    return self.indexOf(value) === index;
		};
		
		var getPicsOfDay = function(day, bid) {
			G_VARS.httpClient.hget(G_VARS.sid, bid, G_VARS.PostPics, day, function(keys) {
				if (keys[1]) {
					//keys is array of wbID whose weibo has picture
					angular.forEach(keys[1], function(wbID) {
						G_VARS.httpClient.get(G_VARS.sid, bid, wbID, function(wb) {
							//wb[1] is a WBASE object
							//debug.log(wb[1]);
							angular.forEach(wb[1].pictures, function(picKey) {
								var p = new WeiboPicture(picKey, bid);
								p.get(function(uri) {
									//do nothing other than get the picture
									$scope.myPicUrls.push(p);
									$timeout(function() {G_VARS.spinner.stop()});
								});
							});
						}, function(name, err) {
							debug.error(err);
						});
					});
				} else {
					G_VARS.spinner.stop();
				};
			}, function(name, err) {
				debug.error(err);
			});
		};
		
		//get all the pics of a user. Pic keys are saved in a global list
		function getUserPics(bid) {
			debug.log("in getUserPics", bid);
			G_VARS.httpClient.hkeys(G_VARS.sid, bid, G_VARS.PostPics, function(wbDays) {
				debug.log(wbDays);
				if (wbDays.length>0) {
					wbDays.sort(function(a,b) {return b-a;});
					for (var i=0; i<wbDays.length && i<7; i++) {
						getPicsOfDay(wbDays[i], bid);
					};
				} else {
					G_VARS.spinner.stop();
				};
			}, function(name, err) {
				debug.error("pic controller err= " + err);
			});
		};
		
		$scope.showFullPic = function(pic) {
			G_VARS.httpClient.get(G_VARS.sid, pic.wb.authorID, pic.id, function(data) {
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
			getUserPics(G_VARS.bid);
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
				chCounter		: G_VARS.MaxWeiboLength,
				submitStyle		: "send_btn W_btn_v_disable",
				showPicUpload	: false
		};
		var tmpPicFiles = [];	//save selected picture files for upload
		$scope.tmpPicUrls = [];
		
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
			//prevent duplicated submission
			$scope.P.txtInvalid = true;
			G_VARS.spinner.spin(document.getElementById('myAppRoot'));
			
			var wb = new WeiboPost($scope);
			wb.body = $scope.wbText;
			wb.timeStamp = new Date().getTime();
			wb.authorID = G_VARS.bid;
			wb.author = $scope.myUserInfo.nickName;

			//upload attached pictures
			var ds = [];
			angular.forEach(tmpPicFiles, function(picFile) {
				var df = $q.defer();
				var r = new FileReader();
				r.onloadend = function(e) {
					var p = new WeiboPicture();
					p.set(e.target.result, function(setOK) {
						if (setOK) {
							wb.pictures.push(p);
							df.resolve();
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
					G_VARS.slice($scope.weiboList, $scope.currentList, 0, $scope.global.itemsPerPage);
					$scope.global.currentPage = 1;
					$scope.$apply();
					G_VARS.spinner.stop();
					
					//save id of weibo that have pictures in a global list. The same pic will generate the same Key
					if (wb.pictures.length > 0) {
						var day = parseInt(wb.timeStamp/86400000);
						G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, G_VARS.PostPics, day, function(keys) {
							//debug.log(keys[1], wb)
							if (keys[1])
								keys[1].push(wb.wbID);
							else
								keys[1] = [wb.wbID];
							G_VARS.httpClient.hset(G_VARS.sid, G_VARS.bid, G_VARS.PostPics, day, keys[1], function() {
								debug.log("wbID with pic added to global list =" + keys[1]);
							}, function(name, err) {
								debug.error(err);
							});
						}, function(name, err) {
							debug.error(err);
						});
					} else {
					};
				}, function(reason) {
					debug.error(reason);
					G_VARS.spinner.stop();
				});
			}, function(reason) {
				debug.warn(reason);
			});
		};

		//display thumbnails of selected image files in the pic selection box
		$scope.fileSelected = function(files) {
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

		//add a picture to Weibo post
		var addPictures = function(wb) {
		};
		
		//changed the style of submit button by checking validity of input text
		//limit the number of input to 140
		$scope.wbtxtChanged = function() {
			if (angular.isUndefined($scope.wbText) || $scope.wbText.toString().replace(/\s+/g,"") === '') {
				$scope.P.submitStyle = "send_btn W_btn_v_disable";
				$scope.P.txtInvalid = true;
				$scope.P.chCounter = G_VARS.MaxWeiboLength;
			} else {
				$scope.P.submitStyle = "send_btn W_btn_v";
				$scope.P.txtInvalid = false;
				if ($scope.wbText.toString().length > G_VARS.MaxWeiboLength) {
					//no more, remove the last char input
					$scope.wbText = $scope.wbText.toString().slice(0, G_VARS.MaxWeiboLength);
					
					//there is a problem of Chinese char input at end of weibo. The code checks for
					//pinyin input instead of Kanji character.
				} else {
					$scope.P.chCounter = G_VARS.MaxWeiboLength - $scope.wbText.toString().length;
				}
			};
		};

		//jQuery code to show the picture file selector
		document.getElementById('btnMonth').onclick = function(){
			easyDialog.open({
				container : 'dlgSend',
				fixed : true,
				drag : true,
				overlay : true
			});
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
				return "("+n+")";
			} else {
				return "(999+)";
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
})();