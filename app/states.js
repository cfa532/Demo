//state.js
"use strict";

(function() {	
	G.weiboApp
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
					var deferredStart = $q.defer();
					//open indexedDB before starting app
					var request = window.indexedDB.open("weiboDB", G.idxDBVersion);
					request.onerror = function(event) {
						debug.error("open indexedDB error", event.target.errorCode);
						deferredStart.reject("open indexedDB error");
					};
					request.onupgradeneeded = function(event) {
						debug.info("indexedDB upgrade")
						G.idxDB = request.result;
						G.idxDB.createObjectStore(G.objStore.picture, {keyPath : "id"});
						G.idxDB.createObjectStore(G.objStore.user, {keyPath : "bid"});
					};
					request.onsuccess = function(event) {
						G.idxDB = request.result;		//event.target.result;		//IDBDatabase object
						G.idxDB.onerror = function(e) {
							//generic handler for all error in this db
							debug.warn("weiboDB error, errorCode=" + e.target.errorCode);
							deferredStart.reject("open idxDB error");
						};
						debug.log("idxDB opened OK");
						
						$rootScope.myUserInfo = new UserInfo(G.bid);
						$rootScope.myUserInfo.get(function(readOK) {
							if (!readOK) {
								//UserInfo does not exit, create a default one
								$rootScope.myUserInfo.set(function() {
									//all assignment to currUserInfo must be in rootScope, otherwise shadow copy will be created
									$rootScope.currUserInfo = $rootScope.myUserInfo;
									deferredStart.resolve(321);
								});
							} else {
								//get my head pic
								$rootScope.currUserInfo = $rootScope.myUserInfo;
								deferredStart.resolve(123);
							};
						});
					};
					return deferredStart.promise;
				}
			},
			controller : function(logon, $scope, msgService, $interval, $timeout) {
				debug.log("in root, Login user", $scope.myUserInfo);

				//begin to check for new message
				msgService.readMsg($scope);
				var myChatBox = angular.element(document.getElementById("myChatBox")).scope();
				
				//check if there is a inviter
				debug.info(G.inviter, G.bid)
				if (G.inviter!=='%%inviter%%' && !$scope.myUserInfo.isFriend(G.inviter)) {
					//add inviter as friend
					var fri = new UserInfo(G.inviter);
					fri.get(function(readOK) {
						if (readOK) {
							debug.log("add friend", fri);
							$scope.myUserInfo.addFriend(fri);
							msgService.sendRequest(fri.bid, "request to be added");
							myChatBox.getOnlineUsers();		//unknown user may cause a problem
							//delete $scope.usrList[fri.bid];
						};
					});
				};
				myChatBox.getOnlineUsers();		//unknown user may cause a problem

				G.spinner = new Spinner(	// show the onload spinner
				{
					lines: 15,				// The number of lines to draw
					length: 20,				// The length of each line
					width: 12,				// The line thickness
					radius: 32,				// The radius of the inner circle
					corners: 1,				// Corner roundness (0..1)
					rotate: 30,				// The rotation offset
					direction: 1,			// 1: clockwise, -1: counterclockwise
					color: '#999',			// #rgb or #rrggbb or array of colors
					speed: 1,				// Rounds per second
					trail: 76,				// Afterglow percentage
					shadow: true,			// Whether to render a shadow
					hwaccel: false,			// Whether to use hardware acceleration
					className: 'spinner',	// The CSS class to assign to the spinner
					zIndex: 2e9,			// The z-index (defaults to 2000000000)
					top: '50%',				// Top position relative to parent
					left: '50%'				// Left position relative to parent
				}).spin(document.getElementById('myAppRoot'));
				$timeout(function() {G.spinner.stop();}, 10000);		//stop the spinner after 30s nonetheless
			}
		})
		.state("root.chat", {
			abstract : true,
			url : "/chat",
			templateUrl : "chat.html",
			controller : function(logon, $scope) {
			}
		})
		.state("root.chat.history", {
			url : "/history",
			templateUrl : "chathistory.html",
			controller : function($scope, $rootScope, $timeout) {
				debug.log("in chat history controller");
				$rootScope.currUserInfo = $scope.myUserInfo;	//display my userInfo at upper right corner

				angular.forEach($scope.myUserInfo.friends, function(ui, bid) {
					G.spinner.spin(document.getElementById('myAppRoot'));
					G.leClient.hkeys(G.sid, G.bid, bid, function(data) {
						if (data.length > 0) {
							data.sort(function(a, b) {return b-a});
							G.leClient.hget(G.sid, G.bid, bid, data[0], function(m) {
								if (m[1].contentType === 1) {
									var p = new WeiboPicture(m[1].content, m[1].bid);
									p.get(0, function(uri) {
										m[1].dataURI = uri;
										ui.lastSMS = m[1];
										$scope.$apply();
										G.spinner.stop();
									});
								} else {
									ui.lastSMS = m[1];
									$scope.$apply();
									G.spinner.stop();
								};
							}, function(name, err) {
								debug.error(err);
							});
						} else {
							G.spinner.stop();
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
				G.spinner.spin(document.getElementById('myAppRoot'));
				
				$rootScope.currUserInfo = $rootScope.myUserInfo.friends[$stateParams.bid];
				debug.log($rootScope.myUserInfo.friends[$stateParams.bid]);
				$scope.inPageBid = $stateParams.bid;	//bid of user I am talking to
				$scope.inPageMsgs = [];
				$scope.C = {
						sentOK			: false,
						txtInvalid		: true,
						chCounter		: G.MaxWeiboLength,
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

				//take the chatting friend's bid as parameter
				$scope.sendSMS = function(bid) {
					if ($scope.txtChat && $scope.txtChat.toString().replace(/\s+/g,"") !== '') {
						var m = new WeiboMessage();
						m.bid = G.bid;
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
							G.leClient.setdata(G.sid, G.bid, e.target.result, function(picKey) {
								var m = new WeiboMessage();
								m.bid = G.bid;
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
							G.leClient.setdata(G.sid, G.bid, e.target.result, function(fileKey) {
								var m = new WeiboMessage();
								m.bid = G.bid;
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
					G.leClient.get(G.sid, m.bid, arr[2], function(data) {
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
						if ($scope.txtChat.toString().length > G.MaxWeiboLength) {
							//no more, remove the last char input
							$scope.txtChat = $scope.txtChat.toString().slice(0, G.MaxWeiboLength);
						} else {
							$scope.C.chCounter = G.MaxWeiboLength - $scope.txtChat.toString().length;
						}
					} else {
						$scope.C.txtInvalid = true;
						$scope.C.chCounter = G.MaxWeiboLength;
					};
				};

				var getMsgPic = function(m) {
					if (m.contentType === 1) {
						m.dataURI = null;		//prevent browse show an illegal dataURI error
						var p = new WeiboPicture(m.content, m.bid);
						p.get(0, function(uri) {	//show original pic
							m.dataURI = uri;
							$scope.$apply();
						});
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
						G.spinner.stop();
						//$scope.$apply();
					} else {
						//no existing chat session, open one. Clean unread msgs only when user opened a new chat session
						//assume that is when the user read any old msgs
						var cs = new ChatSession();
						cs.bid = bid;
						cs.friend = $scope.myUserInfo.friends[bid];
						$scope.chatSessions[bid] = cs;

						//first check if there are unread msgs in SMSUnread db
						G.leClient.hget(G.sid, G.bid, G.UnreadSMS, bid, function(data) {
							if (data[1]) {
								//there are unread msgs
								cs.messages = cs.messages.concat(data[1]);
								for (var i=0; i<cs.messages.length; i++) {
									getMsgPic(cs.messages[i]);
									$scope.inPageMsgs.push(cs.messages[i]);
									$scope.$apply();
								};
								$scope.inPageMsgs.sort(function(a,b) {return b.timeStamp - a.timeStamp});
								G.spinner.stop();
							} else {
								//no unread msgs, load most recent 50 msgs
								G.leClient.hkeys(G.sid, G.bid, bid, function(ts) {
									if (ts.length>0) {
										ts.sort(function(a,b) {return b-a});
										for (var i=0; i<ts.length && i<50; i++) {
											G.leClient.hget(G.sid, G.bid, bid, ts[i], function(msg) {
												getMsgPic(msg[1]);
												$scope.chatSessions[bid].messages.push(msg[1]);
												$scope.inPageMsgs.push(msg[1]);
												$scope.inPageMsgs.sort(function(a,b) {return b.timeStamp - a.timeStamp});
												G.spinner.stop();
												$scope.$apply();
												//$timeout(function() {$scope.$apply();});
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
							G.leClient.hdel(G.sid, G.bid, G.UnreadSMS, bid, function() {
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
				if (!$stateParams.bid || $stateParams.bid===G.bid) {
					$rootScope.currUserInfo = $rootScope.myUserInfo;
				} else {
					$rootScope.currUserInfo = $rootScope.myUserInfo.friends[$stateParams.bid];
				};
				
				//display thumbnails on the user profile area
				function getPictures(arr, i) {
					if (i>5 || i>=arr.length)
						return;
					angular.forEach(arr[i].value, function(wbID) {
						G.leClient.get(G.sid, $rootScope.currUserInfo.bid, wbID, function(wb) {
							//wb[1] is a WBASE object
							if (wb[1]) {
								//debug.log(wb[1]);
								angular.forEach(wb[1].pictures, function(picKey) {
									var p = new WeiboPicture(picKey, $rootScope.currUserInfo.bid);
									p.get(1, function(uri) {
										//remove duplicated pics
//										for (var j=0; j<$scope.curPics.length; j++) {
//											debug.info(j, p.id);
//											if ($scope.curPics[j].id === p.id)
//												return;
//										};
										$scope.curPics.push(p);
										$scope.$apply();
										if ($scope.curPics.length > 6) {
											$scope.curPics.length = 6;			//display up to 6 pics
											i = arr.length;
											return;
										} else {
											i++;
											getPictures(arr, i);
										};
									});
								});
							};
						}, function(name, err) {
							debug.error(err);
						});
					});							
				};
				
				G.leClient.hgetall(G.sid, $scope.currUserInfo.bid, G.PostPics, function(data) {					
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
			controller : function($scope, $timeout) {
				debug.log("root.personal.friends state")
				$timeout(function() {G.spinner.stop();});		//stop the spinner after 30s nonetheless
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
})();

