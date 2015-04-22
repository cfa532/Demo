//rootModule.js
"use strict";
(function() {
	G_VARS.weiboApp
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
				debug.log(keys[1]);
				if (keys[1]) {
					//keys is array of wbID whose weibo has picture
					angular.forEach(keys[1], function(wbID) {
						G_VARS.httpClient.get(G_VARS.sid, bid, wbID, function(wb) {
							if (wb[1]) {
								debug.log(wb[1])
								angular.forEach(wb[1].pictures, function(pic) {
									pic.wb = wb[1];
									$scope.myPicUrls.push(pic);
									$timeout(function() {G_VARS.spinner.stop()});
								});
							};
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
	.controller("postController", ["$scope", "$rootScope", "$state", function($scope, $rootScope, $state) {
		//publish new post
		debug.log("In Post controller")
		var q = angular.injector(['ng']).get('$q');
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
			addPictures(wb).then(function() {
				//pic files uploaded ok, clear tmp files
				debug.log("number of pics =" + wb.pictures.length);
				tmpPicFiles.length = 0;
				$scope.tmpPicUrls.length = 0;
				$scope.P.showPicUpload = false;
								
				//add a new post to DB and the new postKey to a list
				wb.set().then(function() {
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
							debug.log(keys[1], wb)
							if (keys[1])
								keys[1].push(wb.wbID);
							else
								keys[1] = [wb.wbID];
							G_VARS.httpClient.hset(G_VARS.sid, G_VARS.bid, G_VARS.PostPics, day, keys[1], function() {
								debug.log("pic keys added to global list =" + keys[1]);
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
				});
			});
		};

		//display thumb nails of selected image files in the pic selection box
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
			var ds = [];
			angular.forEach(tmpPicFiles, function(picFile, i) {
				ds.push(q(function(resolve, reject) {					
					var r = new FileReader();
					r.onloadend = function(e) {
						G_VARS.httpClient.setdata(G_VARS.sid, G_VARS.bid, e.target.result, function(picKey) {
							var wp = new WeiboPicture();
							wp.id = picKey;
							
							//draw a thumbnail of the original picture
							var tmpCanvas = document.createElement("canvas");
							var img = new Image();
							img.onload = function(e) {
								tmpCanvas.width = "120";
								tmpCanvas.height = "120";
								tmpCanvas.getContext("2d").drawImage(img, 0, 0, tmpCanvas.width, tmpCanvas.height);
								wp.thumbnail = tmpCanvas.toDataURL();
								wb.pictures.push(wp);
								resolve();
							};
							img.src = $scope.tmpPicUrls[i];
						}, function(name, err) {
							reject(err);
						});
					};
					r.readAsArrayBuffer(picFile);				
				}));		
			});
			return q.all(ds);
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
})();