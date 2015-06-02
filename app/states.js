//state.js
"use strict";

G.weiboApp
.run(function($state, $rootScope) {
	//$state.go("root")
	function message(to, toP, from, fromP) { return from.name  + angular.toJson(fromP) + " -> " + to.name + angular.toJson(toP); }
	$rootScope.$on("$stateChangeStart", function(evt, to, toP, from, fromP) { debug.log("Start:   " + message(to, toP, from, fromP)); });
	$rootScope.$on("$stateChangeSuccess", function(evt, to, toP, from, fromP) { debug.log("Success: " + message(to, toP, from, fromP)); });
	$rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) { debug.log(error); });
})
.config(["$stateProvider", "$logProvider", "$urlRouterProvider", "$compileProvider",
         function($stateProvider, $logProvider, $urlRouterProvider, $compileProvider) {
	
	$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|data:image)/);	//allow data:image to href
	
	$stateProvider
	.state("root", {
		abstract : true,
		url : "/root",
		template : "<div ui-view></div>",
		resolve : {
			logon : function($q, $rootScope) {
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
							var cat = "data:image/jpeg;base64,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";
							var hp = new WeiboPicture();
							hp.set(cat, function(setOK) {
								$rootScope.myUserInfo.headPicKey = hp.id;
								$rootScope.myUserInfo.nickName = "User"+Math.floor(Math.random()*100000000);	
								$rootScope.myUserInfo.headPicUrl = cat;
								$rootScope.myUserInfo.set(function() {
									//all assignment to currUserInfo must be in rootScope, otherwise shadow copy will be created
									$rootScope.currUserInfo = $rootScope.myUserInfo;
									deferredStart.resolve(321);
								});
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
//									for (var j=0; j<$scope.curPics.length; j++) {
//										debug.info(j, p.id);
//										if ($scope.curPics[j].id === p.id)
//											return;
//									};
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

