// functions for Post operations
"use strict";

(function() {	
	G_VARS.weiboApp
	.run(function($state, $rootScope) {
		//$state.go("root")
		function message(to, toP, from, fromP) { return from.name  + angular.toJson(fromP) + " -> " + to.name + angular.toJson(toP); }
		$rootScope.$on("$stateChangeStart", function(evt, to, toP, from, fromP) { console.log("Start:   " + message(to, toP, from, fromP)); });
		$rootScope.$on("$stateChangeSuccess", function(evt, to, toP, from, fromP) { console.log("Success: " + message(to, toP, from, fromP)); });
		$rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) { console.log(error); });
	})
	.config(["logonServiceProvider", "$stateProvider", "$logProvider", "$urlRouterProvider",
	         function(logonServiceProvider, $stateProvider, $logProvider, $urlRouterProvider) {
		$logProvider.debugEnabled(true);
		
		$stateProvider
		.state("root", {
			abstract : true,
			url : "/root",
			template : "<div ui-view></div>",
			resolve : {
				logon : function(logonService, $q, $rootScope) {
					console.log("S>>>>>>>>>>>>>>>>>>>>>>start login process>>>>>>>>>>>>>>>>>>>>>>>>>S")
					var deferredStart = $q.defer();
					logonService.getSysUser().then(function(sysdata) {
						console.log(sysdata);
						var bidPath = window.location.pathname+"/appID/userID";
						$rootScope.user = sysdata[0];
						$rootScope.ver = sysdata[1];
						G_VARS.sid = sessionStorage.sid;
						G_VARS.bid = $rootScope.user.id;
						localStorage[bidPath] = G_VARS.bid;
						console.log("E<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<login done<<<<<<<<<<<<<<<<<<<<<<<<<<<<E")

						//login succeed, read owner's data
						console.log("login bid="+G_VARS.bid);
						$rootScope.myUserInfo.get(G_VARS.bid).then(function(readOK) {
							if (!readOK) {
								//UserInfo does not exit, create a default one
								$rootScope.myUserInfo.bid = G_VARS.bid;
								//save the newly created UserInfo
								$rootScope.myUserInfo.set().then(function() {
									//console.log($rootScope.myUserInfo);
									deferredStart.resolve(321);									
								}, function(reason) {
									console.log(reason);
								});
							} else {
								//get my head pic
								deferredStart.resolve(123);
							};
						}, function(reason) {
							console.log(reason);
						});
					});
					return deferredStart.promise;
				}
			},
			controller : function(logon, $q, $scope, msgService, reviewService, SMSService) {
				console.log("in root state controller = " +logon);
				console.log($scope.myUserInfo)
				
				//check for new message every 5 seconds
				var checkMsgLoop = function() {
					//process incoming new messages and save them in db, in case the login user does not read them.
					msgService.readMsg(reviewService.processMsg, SMSService.processMsg);
					setTimeout(function() {checkMsgLoop();}, 5000);
				};
				setTimeout(function() {checkMsgLoop();}, 5000);

				var myChatBox = angular.element(document.getElementById("myChatBox")).scope();
				myChatBox.getOnlineUsers();
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
			controller : function($scope) {
				console.log("in chat history controller");
				console.log($scope.myUserInfo.b)

				var getLastSMS = function(bid) {
					if ($scope.myUserInfo.friends[bid]) {
						G_VARS.httpClient.hkeys(G_VARS.sid, G_VARS.bid, bid, function(data) {
							if (data.length > 0) {
								data.sort(function(a, b) {return b-a});
								console.log(data[0] + " " +bid);
								G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, bid, data[0], function(m) {
									$scope.myUserInfo.friends[bid].lastSMS = m[1];
									$scope.$apply();
								}, function(name, err) {
									console.log(err);
								});
							};
						}, function(name, err) {
							console.log(err);
						});
					} else {
						var f = new UserInfo();
						f.get(bid).then(function(readOK) {
							if (readOK) {
								$scope.myUserInfo.friends[bid] = f;
								G_VARS.httpClient.hkeys(G_VARS.sid, G_VARS.bid, bid, function(data) {
									if (data.length > 0) {
										data.sort(function(a, b) {return b-a});
										G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, bid, data[0], function(m) {
											$scope.myUserInfo.friends[bid].lastSMS = m[1];
											$scope.$apply();
											console.log(m);
										}, function(name, err) {
											console.log(err);
										});
									};
								}, function(name, err) {
									console.log(err);
								});
							};
						}, function(reason) {
							console.log(reason);
						});
					};
				};
				for (var i=0; i<$scope.myUserInfo.b.friends.length; i++) {
					getLastSMS($scope.myUserInfo.b.friends[i].bid);
				};
			}
		})
		.state("root.chat.detail", {
			url : "/detail/{bid}",
			templateUrl : "chatdetail.html",
			resolve : {
				initUI : function(logon, $q, $stateParams, $rootScope) {
					var df = $q.defer();
					if ($rootScope.myUserInfo.friends[$stateParams.bid]) {
						df.resolve($rootScope.myUserInfo.friends[$stateParams.bid]);
					} else {
						var ui = new UserInfo();
						ui.get($stateParams.bid).then(function(readOK) {
							if (readOK) {
								df.resolve(ui);
							};
						}, function(reason) {
							df.reject(reason);
						});
					};
					return df.promise;
				},
			},
			controller : function(initUI, $scope, $rootScope, $stateParams, msgService, SMSService) {
				$rootScope.currUserInfo = initUI;
				console.log(initUI);
				$scope.inPageBid = $stateParams.bid;	//bid of user I am talking to
				$scope.inPageMsgs = [];
				$scope.C = {
						sentOK			: false,
						txtInvalid		: true,
						chCounter		: G_VARS.MaxWeiboLength,
				};
				
				//called by processMsg when a new msg is received
				var sort = function(bid) {
					if (bid !== $stateParams.bid) return;	//a new msg other bid come in, ingore it
					
					$scope.inPageMsgs.length = 0;
					for (var i=0; i<$scope.chatSessions[bid].messages.length; i++) {
						$scope.inPageMsgs.push($scope.chatSessions[bid].messages[i]);
					};
					$scope.inPageMsgs.sort(function(a,b) {return b.timeStamp - a.timeStamp})
					$scope.$apply();
				};
				//register this function with SMS service
				SMSService.regScope(sort);

				//take the chatting friend's bid as parameter
				$scope.sendSMS = function(bid) {
					if ($scope.txtChat.toString().replace(/\s+/g,"") === '' )
						return;
					var m = new WeiboMessage();
					m.bid = G_VARS.bid;
					m.type = 1;				//SMS
					m.contentType = 0;		//text
					m.content = $scope.txtChat;
					m.viewed = 0;
					m.timeStamp = new Date().getTime();
					msgService.sendSMS(bid, m);
					
					console.log($scope.chatSessions[bid]);
					$scope.chatSessions[bid].messages.unshift(m);
					$scope.chatSessions[bid].timeStamp = m.timeStamp;
					$scope.txtChat = '';
					$scope.txtChanged();
					
					//save it in db as conversation
					SMSService.saveSMS(bid, m);
				};
				
				//message input in the textarea
				$scope.txtChanged = function() {
					//console.log($scope.txtChat)
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

				var getChatHistory = function(bid) {
					$scope.inPageMsgs.length = 0;
					if ($scope.chatSessions[bid]) {
						//a chat with a friend is going on. resort the msgs for in page display
						for (var i=0; i<$scope.chatSessions[bid].messages.length; i++) {
							$scope.inPageMsgs.push($scope.chatSessions[bid].messages[i]);
						};
						$scope.inPageMsgs.sort(function(a,b) {return b.timeStamp - a.timeStamp})
						$scope.$apply();
					} else {
						//no existing chat session, open one. Clean unread msgs only when user opened a new chat session
						//assume that is when the user read any old msgs
						var cs = new ChatSession();
						cs.bid = bid;
						if ($scope.myUserInfo.friends[bid])
							cs.friend = $scope.myUserInfo.friends[bid];
						else {
							var f = new UserInfo();
							f.get(bid).then(function(readOK) {
								if (readOK) {
									cs.friend = f;
								};
							}, function(reason) {
								console.log(reason);
							});
						};
						$scope.chatSessions[bid] = cs;
						//first check if there are unread msgs in SMSUnread db
						G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, G_VARS.UnreadSMS, bid, function(data) {
							if (data[1]) {
								cs.messages = cs.messages.concat(data[1]);
								for (var i=0; i<cs.messages.length; i++) {
									$scope.inPageMsgs.push(cs.messages[i]);
									$scope.$apply();
								};
								$scope.inPageMsgs.sort(function(a,b) {return b.timeStamp - a.timeStamp});
							} else {
								//no unread msgs, load msgs from last day
								//get all of them for now
								//console.log($("#myChatBox")[0]);
								G_VARS.httpClient.hkeys(G_VARS.sid, G_VARS.bid, bid, function(ts) {
									if (ts!==null && ts.length>0) {
										//console.log(ts);
										//console.log(bid);
										for (var i=0; i<ts.length; i++) {
											G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, bid, ts[i], function(msg) {
												if (msg[1]) {
													//console.log(msg[1]);
													$scope.chatSessions[bid].messages.push(msg[1]);
													$scope.inPageMsgs.push(msg[1]);
													$scope.inPageMsgs.sort(function(a,b) {return b.timeStamp - a.timeStamp});
													$scope.$apply();
												}
											}, function(name, err) {
												console.log(err);
											});
										};
									};
								}, function(name, err) {
									console.log(err);
								});
							};
							
							//delete unread msgs record
							G_VARS.httpClient.hdel(G_VARS.sid, G_VARS.bid, G_VARS.UnreadSMS, bid, function() {
								console.log("unread msgs deleted");
							}, function(name, err) {
								console.log(err);
							});
						});
					};
				};
				getChatHistory($stateParams.bid);
			},
		})
		.state("root.main", {
			abstract : true,
			url : "/main",
			templateUrl : "main.html",
			controller : function(logon, $scope, $rootScope) {
				console.log("in main state controller="+logon);
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
			resolve : {
				initUI : function(logon, $q, $stateParams, $rootScope) {
					var df = $q.defer();
					if (!$stateParams.bid || $stateParams.bid===G_VARS.bid) {
						//console.log("look at me")
						$rootScope.currUserInfo = $rootScope.myUserInfo;
						df.resolve();
					}
					else {
						if ($rootScope.myUserInfo.friends[$stateParams.bid]) {
							$rootScope.currUserInfo = $rootScope.myUserInfo.friends[$stateParams.bid];
							df.resolve();
						} else {
							var ui = new UserInfo();
							ui.get($stateParams.bid).then(function(readOK) {
								if (readOK) {
									console.log(ui);
									$rootScope.currUserInfo = ui;
									$rootScope.myUserInfo.friends[$stateParams.bid] = ui;
									df.resolve();
								};
							}, function(reason) {
								console.log(reason);
								df.reject(reason);
							});
						};
					};
					return df.promise;
				},
			},
			controller : function(initUI, $scope, $rootScope, $stateParams) {
				console.log("in personal state ctrl, bid="+$stateParams.bid);			
			}
		})
		.state("root.personal.friends", {
			url : "/friends",
			templateUrl : "friends.html",
			controller : function(logon, $scope) {				
				console.log("in personal.friends ctrl, logon=" + logon);			
				if ($scope.myUserInfo.bid === $scope.currUserInfo.bid) {
					//only show my friends list for now
					for (var i=0; i<$scope.myUserInfo.b.friends.length; i++) {
						var bid = $scope.myUserInfo.b.friends[i].bid;
						if ($scope.myUserInfo.friends[bid]) {
							$scope.myUserInfo.friends[bid].getLastWeibo().then(function(wb) {
								$scope.$apply();
							}, function(reason) {
								console.log(reason);
							});
						} else {
							var f = new UserInfo();
							f.get(bid).then(function(readOK) {
								if (readOK) {
									$scope.myUserInfo.friends[bid] = f;
									f.getLastWeibo().then(function(wb) {
										$scope.$apply();
									}, function(reason) {
										console.log(reason);
									});
								};
							}, function(reason) {
								console.log(reason);
							});
						};
					};
				};
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
	.controller("weiboController", ["$state", "$stateParams", "$scope",
	                                function($state, $stateParams, $scope) {
		console.log("in weibo controller")
		var q = angular.injector(['ng']).get('$q');
		
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
			console.log("in getAllPosts(), page num=" +$scope.global.currentPage+" current day="+currentDay);
			$scope.totalItems = $scope.global.currentPage * $scope.global.itemsPerPage + 1;
			G_VARS.slice($scope.weiboList, $scope.currentList, ($scope.global.currentPage-1)*$scope.global.itemsPerPage, $scope.global.currentPage*$scope.global.itemsPerPage);

			if (wbListLen < $scope.global.currentPage * $scope.global.itemsPerPage) {
				getPostPerDay(currentDay, original);
				if (wbDay-currentDay > 5) {
					wbDay = currentDay-1;	//remember the last day from which post is read
					console.log("get out of loop, " + currentDay)
					return;
				} else {
					currentDay--;
					setTimeout(function() {
						getAllPosts(currentDay, original);
					}, 1000);		//if no enough items, read more for me every 1 second
				};
			} else {
				//remember the last date of weibo read and exit
				wbDay = currentDay;
			};
		};
		
		var getPostPerDay = function(day, original) {
			//read all posts into a list, including self
			//read my own weibo
			G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, G_VARS.Posts, day, function(keys) {
				if (keys[1]) {
					wbListLen += keys[1].length;
					//make sure there is weibo in the list
					for(var j=0; j<keys[1].length; j++) {
						getWeibo(G_VARS.bid, keys[1][j], original);
					};
				};
			}, function(name, err) {
				console.log("getAllPosts err= " + err);
			});
			//read my friend's weibo
			for (var f in $scope.myUserInfo.friends) {
				getWeiboList(f, day, original);
			};
		};

		//read weibo of a certain person on a given day
		var getWeiboList = function(bid, day, original) {
			//console.log("in getWeiboList()");
			if (angular.isUndefined($scope.myUserInfo.friends[bid]) && bid!==G_VARS.bid) {
				//the friend's UserInfo is not ready, get it
				var ui = new UserInfo();
				//console.log(ui)
				ui.get(bid).then(function(readOK) {
					if (readOK) {							
						//also get the head pic of this user
						$scope.myUserInfo.friends[bid] = ui;
						G_VARS.httpClient.hget(G_VARS.sid, bid, G_VARS.Posts, day, function(keys) {
							if (keys[1]) {
								wbListLen += keys[1].length;
								//make sure there is weibo in the list
								for(var j=0; j<keys[1].length; j++) {
									getWeibo(bid, keys[1][j], original);
								};
							};
						}, function(name, err) {
							console.log("getAllPosts err= " + err);
						});
					};
				});
			} else {
				G_VARS.httpClient.hget(G_VARS.sid, bid, G_VARS.Posts, day, function(keys) {
					if (keys[1]) {
						wbListLen += keys[1].length;
						//make sure there is weibo in the list
						for(var j=0; j<keys[1].length; j++) {
							getWeibo(bid, keys[1][j], original);
						};
					};
				}, function(name, err) {
					console.log("getAllPosts err= " + err);
				});
			};
		};
		
		//read one weibo and add it to weiboList
		var getWeibo = function(bid, key, original) {
			var wb = new WeiboPost($scope);
			wb.get(bid, key, original).then(function(readOK) {
				//if (readOK && G_VARS.search($scope.weiboList, wb) === -1) {
				if (readOK) {
					$scope.weiboList.push(wb);
					//sort array in descending order, worked like a charm
					$scope.weiboList.sort(function(a,b) {return b.timeStamp - a.timeStamp})
					G_VARS.slice($scope.weiboList, $scope.currentList, ($scope.global.currentPage-1)*$scope.global.itemsPerPage, $scope.global.currentPage*$scope.global.itemsPerPage);
					$scope.$apply();
				};
			});
		};
		
		//var wbCount = 0;	//weibo already read into memory
		var getWeiboOfDay = function(bid, days, i, original) {
			if (i >= days.length) return;
			G_VARS.httpClient.hget(G_VARS.sid, bid, G_VARS.Posts, days[i], function(keys) {
				//console.log(keys[1]);
				for (var j=0; j<keys[1].length; j++) {
					getWeibo(bid, keys[1][j], original);
				};
				wbListLen += keys[1].length;
				if (wbListLen > $scope.global.currentPage*$scope.global.itemsPerPage) {
					iDay = i+1;
					console.log("iDay="+iDay)
					return;
				} else {
					getWeiboOfDay(bid, days, i+1, original);
				};
			});
		};
		
		//read all the post of a certain friend
		var getPosts = function(bid, iDay, original) {
			console.log("in getPosts(), pagenum=" +$scope.global.currentPage+" iDay="+iDay);
			G_VARS.slice($scope.weiboList, $scope.currentList, ($scope.global.currentPage-1)*$scope.global.itemsPerPage, $scope.global.currentPage*$scope.global.itemsPerPage);
			$scope.totalItems = $scope.currUserInfo.weiboCount;
			G_VARS.httpClient.hkeys(G_VARS.sid, bid, G_VARS.Posts, function(days) {
				//get list of date on which there are posts
				days.sort(function(a,b) {return b-a});
				//console.log(days);
				if (iDay < days.length)
					getWeiboOfDay(bid, days, iDay, original);
			}, function(name, err) {
				console.log(err);
			});
		};

		//show all my favorites. key=G_VARS.Favorites, field=authorID, value=[wbIDs,....]
		var showFavorites = function(bid) {
			console.log("in showFavorites");
			$scope.totalItems = 0;
			G_VARS.slice($scope.weiboList, $scope.currentList, ($scope.global.currentPage-1)*$scope.global.itemsPerPage, $scope.global.currentPage*$scope.global.itemsPerPage);
			G_VARS.httpClient.hgetall(G_VARS.sid, bid, G_VARS.Favorites, function(data) {
				if (data === null) {
					return;
				};
				//data (field) is array of author id of favorites
				//data[i].value is array of wbID by a certain author
				for(var i=0; i<data.length; i++) {
					//count the total number of favorites to be displayed
					$scope.totalItems += data[i].value.length;
					for (var j=0; j<data[i].value.length; j++) {
						//console.log(data[i].field + " " +data[i].value[j]);
						getWeibo(data[i].field, data[i].value[j], false);
					};
				};
			}, function(name, err) {
				console.log("showFavorite err=" +err);
			});
		};

		$scope.showFullPic = function(src) {
			window.open(src, "_blank");
		};
		
		//state switch
		var iDay = 0;			//index of the most recent day, used by getPosts() to read single user's posts
		var wbListLen = 0;		//length of weibo list
		//starting from today, read each day's weibo backward. Until we have enough posts for on screen display
		var wbDay = parseInt(new Date().getTime()/86400000);
		$scope.weiboList.length = 0;
		$scope.currentList.length = 0;
		$scope.global.currentPage = 1;
				
		if ($state.is("root.main.allPosts")) {
			//everytime the controller is loaded, refresh all the weibo list
			console.log("state is main.allPosts");
			getAllPosts(wbDay, false);
		}
		else if ($state.is("root.main.original")) {
			console.log("state is main.original");
			getAllPosts(wbDay, true);
		}
		else if ($state.is("root.main.favorite")) {
			console.log("state is favorite");
			showFavorites(G_VARS.bid);
		}
		else if ($state.is("root.personal.allPosts")) {
			console.log("state is personal.allposts");
			getPosts($stateParams.bid, iDay, false);
		}
		else if ($state.is("root.personal.original")) {
			console.log("state is personal.original");
			getPosts($stateParams.bid, iDay, true);
		}
		else if ($state.is("root.personal.favorite")) {
			console.log("state is favorite");
			showFavorites($stateParams.bid);
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
		}
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
			}
		}
	})
	.filter("bracket", function() {
		return function(n) {
			if (n===0) {
				return null;
			} else if (n<1000) {
				return "("+n+")";
			} else {
				return "(999+)";
			}
		}
	})
})();

