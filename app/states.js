//state.js
"use strict";

(function() {	
	G_VARS.weiboApp
	.run(function($state, $rootScope) {
		//$state.go("root")
		function message(to, toP, from, fromP) { return from.name  + angular.toJson(fromP) + " -> " + to.name + angular.toJson(toP); }
		$rootScope.$on("$stateChangeStart", function(evt, to, toP, from, fromP) { debug.log("Start:   " + message(to, toP, from, fromP)); });
		$rootScope.$on("$stateChangeSuccess", function(evt, to, toP, from, fromP) { debug.log("Success: " + message(to, toP, from, fromP)); });
		$rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) { debug.log(error); });
	})
	.config(["logonServiceProvider", "$stateProvider", "$logProvider", "$urlRouterProvider", "$compileProvider",
	         function(logonServiceProvider, $stateProvider, $logProvider, $urlRouterProvider, $compileProvider) {
		
		$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|data:image)/);	//allow data:image to href
		
		$stateProvider
		.state("root", {
			abstract : true,
			url : "/root",
			template : "<div ui-view></div>",
			resolve : {
				logon : function(logonService, $q, $rootScope) {
					debug.log("S>>>>>>>>>>>>>>>>>>>>>>start login process>>>>>>>>>>>>>>>>>>>>>>>>>S")
					var deferredStart = $q.defer();
					logonService.getSysUser().then(function(sysdata) {
						debug.log(sysdata);
						var bidPath = window.location.pathname+"/appID/userID";
						$rootScope.user = sysdata[0];
						$rootScope.ver = sysdata[1];
						G_VARS.sid = sessionStorage.sid;
						G_VARS.bid = $rootScope.user.id;
						localStorage[bidPath] = G_VARS.bid;
						debug.log("E<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<login done<<<<<<<<<<<<<<<<<<<<<<<<<<<<E")

						//login succeed, read owner's data
						debug.log("login bid="+G_VARS.bid);
						$rootScope.myUserInfo = new UserInfo(G_VARS.bid);
						$rootScope.myUserInfo.get(function(readOK) {
							if (!readOK) {
								//UserInfo does not exit, create a default one
								$rootScope.myUserInfo.set(function() {
									//debug.log($rootScope.myUserInfo);
									deferredStart.resolve(321);									
								});
							} else {
								//get my head pic
								deferredStart.resolve(123);
							};
						});
					}, function(reason) {
						debug.error(reason);
					});
					return deferredStart.promise;
				}
			},
			controller : function(logon, $scope, msgService, $interval, $timeout) {
				debug.log("in root state controller = " +logon);
				debug.log($scope.myUserInfo);

				//check for new message every 10 seconds
				//$interval(function() {msgService.readMsg();}, 10000);
				var myChatBox = angular.element(document.getElementById("myChatBox")).scope();
				//myChatBox.getOnlineUsers();		//unknown user may cause a problem
				
				$timeout(function() {G_VARS.spinner.stop();}, 30000);		//stop the spinner after 30s nonetheless
			}
		})
		.state("root.chat", {
			abstract : true,
			url : "/chat",
			templateUrl : "chat.html",
			controller : function(logon, $scope) {
				//var myChatBox = angular.element(document.getElementById("myChatBox")).scope();
				//myChatBox.getOnlineUsers();
			}
		})
		.state("root.chat.history", {
			url : "/history",
			templateUrl : "chathistory.html",
			controller : function($scope, $rootScope, $timeout) {
				debug.log("in chat history controller");
				$rootScope.currUserInfo = $scope.myUserInfo;	//display my userInfo at upper right corner

				angular.forEach($scope.myUserInfo.friends, function(ui, bid) {
					G_VARS.spinner.spin(document.getElementById('myAppRoot'));
					G_VARS.httpClient.hkeys(G_VARS.sid, G_VARS.bid, bid, function(data) {
						if (data.length > 0) {
							data.sort(function(a, b) {return b-a});
							G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, bid, data[0], function(m) {
								ui.lastSMS = m[1];
								if (m[1].contentType === 1) {
									new WeiboPicture(m[1].content, m[1].bid).get(function(uri) {
										m[1].dataURI = uri;
									});
								};
								$scope.$apply();
								G_VARS.spinner.stop();
							}, function(name, err) {
								debug.error(err);
							});
						} else {
							G_VARS.spinner.stop();
						};
					}, function(name, err) {
						debug.error(err);
					});
				});
			},
		})
		.state("root.chat.detail", {
			url : "/detail/{bid}",
			templateUrl : "chatdetail.html",
			controller : function($scope, $rootScope, $stateParams, msgService, SMSService, $timeout) {
				//set current UI to the user I am chatting to
				G_VARS.spinner.spin(document.getElementById('myAppRoot'));
				
				$rootScope.currUserInfo = $rootScope.myUserInfo.friends[$stateParams.bid];
				debug.log($rootScope.myUserInfo.friends[$stateParams.bid]);
				$scope.inPageBid = $stateParams.bid;	//bid of user I am talking to
				$scope.inPageMsgs = [];
				$scope.C = {
						sentOK			: false,
						txtInvalid		: true,
						chCounter		: G_VARS.MaxWeiboLength,
				};
				
				//register this function with SMS service to sort inPage message display
				//called by processMsg when a new msg is received
				SMSService.addCallback(function(bid) {
					if (bid !== $stateParams.bid) return;	//a new msg other than current bid come in, ignore it
					
					$scope.inPageMsgs.length = 0;
					for (var i=0; i<$scope.chatSessions[bid].messages.length; i++) {
						$scope.inPageMsgs.push($scope.chatSessions[bid].messages[i]);
					};
					$scope.inPageMsgs.sort(function(a,b) {return b.timeStamp - a.timeStamp})
					$scope.$apply();
				});

				//display chat time every hour
				$scope.showTimeLine = function(mi) {
					// take a Message as param
					// check if the time difference from this message to its previous message cross the hourly border
					if (mi===0 || mi===$scope.chatSessions[$stateParams.bid].messages.length-1) return false;
					var tt = parseInt($scope.chatSessions[$stateParams.bid].messages[mi].timeStamp/1000/3600);
					var pt = parseInt($scope.chatSessions[$stateParams.bid].messages[mi-1].timeStamp/1000/3600);
					if (tt !== pt) 
						return true;
					return false;
				};

				var getMsgPic = function(m) {
					if (m.contentType === 1) {
						new WeiboPicture(m.content, m.bid).get(function(uri) {
							m.dataURI = uri;
						});
					};
				};
				
				//take the chatting friend's bid as parameter
				$scope.sendSMS = function(bid) {
					if ($scope.txtChat && $scope.txtChat.toString().replace(/\s+/g,"") !== '') {
						var m = new WeiboMessage();
						m.bid = G_VARS.bid;
						m.type = 1;				//SMS
						m.contentType = 0;		//text
						m.content = $scope.txtChat;
						m.timeStamp = new Date().getTime();
						msgService.sendSMS(bid, m);
						
						debug.log($scope.chatSessions[bid]);
						$scope.chatSessions[bid].messages.push(m);
						$scope.chatSessions[bid].timeStamp = m.timeStamp;
						$scope.txtChat = '';
						
						//save it in db as conversation
						SMSService.saveSMS(bid, m);
					};
					if ($scope.picFile) {
						var r = new FileReader();
						r.onloadend = function(e) {
							G_VARS.httpClient.setdata(G_VARS.sid, G_VARS.bid, e.target.result, function(picKey) {
								var m = new WeiboMessage();
								m.bid = G_VARS.bid;
								m.type = 1;				//SMS
								m.contentType = 1;		//picture
								m.content = picKey;
								m.timeStamp = new Date().getTime();
								msgService.sendSMS(bid, m);
								
								getMsgPic(m);
								$scope.chatSessions[bid].messages.push(m);
								$scope.chatSessions[bid].timeStamp = m.timeStamp;
								$scope.picUrl = null;
								$scope.picFile = null;
								$scope.$apply();
								//save it in db as conversation
								SMSService.saveSMS(bid, m);
							}, function(name, err) {
								debug.error(err);
							});
						};
						r.readAsArrayBuffer($scope.picFile);
					};
					if ($scope.fileSent) {
						var r = new FileReader();
						r.onloadend = function(e) {
							G_VARS.httpClient.setdata(G_VARS.sid, G_VARS.bid, e.target.result, function(fileKey) {
								var m = new WeiboMessage();
								m.bid = G_VARS.bid;
								m.type = 1;				//SMS
								m.contentType = 2;		//file
								console.log($scope.fileSent)
								m.content = $scope.fileSent.name + "\t" + $scope.fileSent.type + "\t" + fileKey;
								m.timeStamp = new Date().getTime();
								msgService.sendSMS(bid, m);
								
								$scope.chatSessions[bid].messages.push(m);
								$scope.chatSessions[bid].timeStamp = m.timeStamp;
								$scope.fileSent = null;
								
								//save it in db as conversation
								SMSService.saveSMS(bid, m);
							}, function(name, err) {
								debug.error(err);
							});
						};
						r.readAsArrayBuffer($scope.fileSent);
					};
				};
				
				$scope.showBigPic = function(m) {
					$scope.bigPicUrl = m.dataURI;
					$timeout(function() {$scope.$apply();});
					easyDialog.open({
						container : 'big_picture2',
						fixed : false,
						drag : true,
						overlay : true
					});
				};
				
				//upload a picture or file to be sent over SMS
				$scope.sendFile = function(id) {
					//simulate file selection event
		            document.getElementById(id).dispatchEvent(new Event('click'));
				};
				
				$scope.picSelected = function(files) {
					$scope.picUrl = null;
					$scope.fileSent = null;
					if (files!==null && files.length>0) {
						//display pic in send box
						var r = new FileReader();
						r.onloadend = function(e) {
							$scope.picUrl = e.target.result;
							$scope.$apply();
						};
						$scope.picFile = files[0];
						r.readAsDataURL(files[0], {type: 'image/png'});
					};
				};
								
				$scope.fileSelected = function(files) {
					$scope.fileSent = null;
					$scope.picFile = null;
					if (files!==null && files.length>0) {
						$scope.fileSent = files[0];
						$scope.$apply();
					};
				};
				
				$scope.unselectFile = function() {
					$scope.fileSent = null;
					$scope.picFile = null;
				};
				
				//download received file
				$scope.saveFile = function(m) {
					var arr = m.content.toString().split("\t");
					G_VARS.httpClient.get(G_VARS.sid, m.bid, arr[2], function(data) {
						if (data[1]) {
							saveAs(new Blob([data[1]], {type: arr[1]}), arr[0]);
						};
					}, function(name, err) {
						debug.error(err);
					});
				};
								
				//message input in the textarea
				$scope.txtChanged = function() {
					//debug.log($scope.txtChat)
					if ($scope.txtChat.replace(/\s+/g,"") !== '') {
						$scope.C.txtInvalid = false;
						if ($scope.txtChat.toString().length > G_VARS.MaxWeiboLength) {
							//no more, remove the last char input
							$scope.txtChat = $scope.txtChat.toString().slice(0, G_VARS.MaxWeiboLength);
						} else {
							$scope.C.chCounter = G_VARS.MaxWeiboLength - $scope.txtChat.toString().length;
						}
					} else {
						$scope.C.txtInvalid = true;
						$scope.C.chCounter = G_VARS.MaxWeiboLength;
					};
				};

				var getChatDetail = function(bid) {
					$scope.inPageMsgs.length = 0;
					if ($scope.chatSessions[bid]) {
						//a chat with a friend is going on. resort the msgs for in page display
						for (var i=0; i<$scope.chatSessions[bid].messages.length; i++) {
							$scope.inPageMsgs.push($scope.chatSessions[bid].messages[i]);
						};
						$scope.inPageMsgs.sort(function(a,b) {return b.timeStamp - a.timeStamp})
						G_VARS.spinner.stop();
						//$scope.$apply();
					} else {
						//no existing chat session, open one. Clean unread msgs only when user opened a new chat session
						//assume that is when the user read any old msgs
						var cs = new ChatSession();
						cs.bid = bid;
						cs.friend = $scope.myUserInfo.friends[bid];
						$scope.chatSessions[bid] = cs;

						//first check if there are unread msgs in SMSUnread db
						G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, G_VARS.UnreadSMS, bid, function(data) {
							if (data[1]) {
								//there are unread msgs
								cs.messages = cs.messages.concat(data[1]);
								for (var i=0; i<cs.messages.length; i++) {
									getMsgPic(cs.messages[i]);
									$scope.inPageMsgs.push(cs.messages[i]);
									$scope.$apply();
								};
								$scope.inPageMsgs.sort(function(a,b) {return b.timeStamp - a.timeStamp});
								G_VARS.spinner.stop();
							} else {
								//no unread msgs, load most recent 50 msgs
								G_VARS.httpClient.hkeys(G_VARS.sid, G_VARS.bid, bid, function(ts) {
									if (ts.length>0) {
										ts.sort(function(a,b) {return b-a});
										for (var i=0; i<ts.length && i<50; i++) {
											G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, bid, ts[i], function(msg) {
												if (msg[1]) {
													getMsgPic(msg[1]);
													$scope.chatSessions[bid].messages.push(msg[1]);
													$scope.inPageMsgs.push(msg[1]);
													$scope.inPageMsgs.sort(function(a,b) {return b.timeStamp - a.timeStamp});
													G_VARS.spinner.stop();
													$scope.$apply();
													//$timeout(function() {$scope.$apply();});
												}
											}, function(name, err) {
												debug.error(err);
											});
										};
									};
								}, function(name, err) {
									debug.error(err);
								});
							};
							
							//delete unread msgs record
							G_VARS.httpClient.hdel(G_VARS.sid, G_VARS.bid, G_VARS.UnreadSMS, bid, function() {
								debug.log("unread msgs deleted");
							}, function(name, err) {
								debug.error(err);
							});
						});
					};
				};
				getChatDetail($stateParams.bid);

				$("#myChatArea2").keyup(function(e) {	//use keyup to avoid misfire in chinese input
					if (e.keyCode === 13) {
						$scope.sendSMS($stateParams.bid);
						return false;
					};
				});
			},
		})
		.state("root.main", {
			abstract : true,
			url : "/main",
			templateUrl : "main.html",
			controller : function(logon, $scope, $rootScope) {
				debug.log("in main state controller="+logon);
				$rootScope.currUserInfo = $rootScope.myUserInfo;
			}
		})
		.state("root.main.allPosts", {
			url : "/allposts",
			templateUrl : "weiboList.html",
			controller : "weiboController"
		})
		.state("root.main.original", {
			url : "/original",
			templateUrl : "weiboList.html",
			controller : "weiboController"
		})
		.state("root.main.favorite", {
			url : "/favorite",
			templateUrl : "weiboList.html",
			controller : "weiboController"
		})
		.state("root.main.pictureGrid", {
			url : "/pictures",
			templateUrl : "allPics.html",
			controller : "pictureController"
		})
		.state("root.personal", {
			abstract : true,
			url : "/personal/{bid}",
			templateUrl : "personal.html",
			controller : function($scope, $rootScope, $stateParams, $timeout) {
				debug.log("in personal state ctrl, bid="+$stateParams.bid);
				$scope.curPics = [];

				//get current UserInfo object
				if (!$stateParams.bid || $stateParams.bid===G_VARS.bid) {
					$rootScope.currUserInfo = $rootScope.myUserInfo;
				} else {
					$rootScope.currUserInfo = $rootScope.myUserInfo.friends[$stateParams.bid];
				};
				
				//display thumbnails on the user profile area
				function getPictures(arr, i) {
					if (i>5 || i>=arr.length)
						return;
					angular.forEach(arr[i].value, function(wbID) {
						G_VARS.httpClient.get(G_VARS.sid, $rootScope.currUserInfo.bid, wbID, function(wb) {
							//wb[1] is a WBASE object
							if (wb[1]) {
								//debug.log(wb[1]);
								angular.forEach(wb[1].pictures, function(picKey) {
									var p = new WeiboPicture(picKey, $rootScope.currUserInfo.bid);
									p.get(function(uri) {
										$scope.curPics.push(p);
										if ($scope.curPics.length > 6) {
											$scope.curPics.length = 6;			//display up to 6 pics
											i = arr.length;
											return;
										} else {
											i++;
											$timeout(function() {getPictures(arr, i);});
										};
									});
								});
							};
						}, function(name, err) {
							debug.error(err);
						});
					});							
				};
				
				G_VARS.httpClient.hgetall(G_VARS.sid, $scope.currUserInfo.bid, G_VARS.PostPics, function(data) {					
					if (data) {
						//data[i].field is date in which picture is posted
						//data[i].value is array of wbID which has picture by at the day
						data.sort(function(a,b) {return b.field-a.field});
						getPictures(data, 0);
					};
				}, function(name, err) {
					debug.warn(err);
				});
			}
		})
		.state("root.personal.friends", {
			url : "/friends",
			templateUrl : "friends.html",
			controller : function($scope) {
				debug.log("root.personal.friends state")
			},
		})
		.state("root.personal.allPosts", {
			url : "/userposts",
			templateUrl : "weiboList.html",
			controller : "weiboController"
		})
		.state("root.personal.original", {
			url : "/useroriginal",
			templateUrl : "weiboList.html",
			controller : "weiboController"
		})
		.state("root.personal.favorite", {
			url : "/userfavorite",
			templateUrl : "weiboList.html",
			controller : "weiboController"
		})
		.state("root.personal.pictureGrid", {
			url : "/userpictures",
			templateUrl : "allPics.html",
			controller : "pictureController"
		});
		//catch all urls
		$urlRouterProvider.otherwise("/root/main/allposts");
	}])
	//get weibo list and display them nicely
	.controller("weiboController", ["$state", "$stateParams", "$scope", "$rootScope", "$timeout",
	                                function($state, $stateParams, $scope, $rootScope, $timeout) {
		debug.log("in weibo controller")
		G_VARS.spinner.spin(document.getElementById('myAppRoot'));
		var q = angular.injector(['ng']).get('$q');
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
			//G_VARS.slice($scope.weiboList, $scope.currentList, ($scope.global.currentPage-1)*$scope.global.itemsPerPage, $scope.global.currentPage*$scope.global.itemsPerPage);
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
})();

