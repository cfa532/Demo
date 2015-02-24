// functions for Post operations
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
						$rootScope.myUserInfo.get(G_VARS.bid).then(function(readOK) {
							if (!readOK) {
								//UserInfo does not exit, create a default one
								$rootScope.myUserInfo.bid = G_VARS.bid;
								//save the newly created UserInfo
								$rootScope.myUserInfo.set().then(function() {
									//debug.log($rootScope.myUserInfo);
									deferredStart.resolve(321);									
								}, function(reason) {
									debug.error(reason);
								});
							} else {
								//get my head pic
								deferredStart.resolve(123);
							};
						}, function(reason) {
							debug.error(reason);
						});
					}, function(reason) {
						debug.error(reason);
					});
					return deferredStart.promise;
				}
			},
			controller : function(logon, $scope, msgService, $interval) {
				debug.log("in root state controller = " +logon);
				debug.log($scope.myUserInfo)
				
				//check for new message every 5 seconds
				$interval(function() {msgService.readMsg();}, 5000);
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
			controller : function($scope, $rootScope) {
				debug.log("in chat history controller");
				$rootScope.currUserInfo = $scope.myUserInfo;	//display my userInfo at upper right corner

				angular.forEach($scope.myUserInfo.friends, function(ui, bid) {
					G_VARS.httpClient.hkeys(G_VARS.sid, G_VARS.bid, bid, function(data) {
						if (data.length > 0) {
							data.sort(function(a, b) {return b-a});
							G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, bid, data[0], function(m) {
								ui.lastSMS = m[1];
								debug.log(m[1], ui);
								$scope.$apply();
							}, function(name, err) {
								debug.error(err);
							});
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
			controller : function($scope, $rootScope, $stateParams, msgService, SMSService) {
				//set current UI to the user I am chatting to
				$rootScope.currUserInfo = $rootScope.myUserInfo.friends[$stateParams.bid];
				debug.log($rootScope.myUserInfo.friends[$stateParams.bid]);
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
					
					debug.log($scope.chatSessions[bid]);
					$scope.chatSessions[bid].messages.unshift(m);
					$scope.chatSessions[bid].timeStamp = m.timeStamp;
					$scope.txtChat = '';
					$scope.txtChanged();
					
					//save it in db as conversation
					SMSService.saveSMS(bid, m);
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

				var getChatHistory = function(bid) {
					$scope.inPageMsgs.length = 0;
					if ($scope.chatSessions[bid]) {
						//a chat with a friend is going on. resort the msgs for in page display
						for (var i=0; i<$scope.chatSessions[bid].messages.length; i++) {
							$scope.inPageMsgs.push($scope.chatSessions[bid].messages[i]);
						};
						$scope.inPageMsgs.sort(function(a,b) {return b.timeStamp - a.timeStamp})
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
								cs.messages = cs.messages.concat(data[1]);
								for (var i=0; i<cs.messages.length; i++) {
									$scope.inPageMsgs.push(cs.messages[i]);
									$scope.$apply();
								};
								$scope.inPageMsgs.sort(function(a,b) {return b.timeStamp - a.timeStamp});
							} else {
								//no unread msgs, load most recent 50 msgs
								G_VARS.httpClient.hkeys(G_VARS.sid, G_VARS.bid, bid, function(ts) {
									if (ts.length>0) {
										ts.sort(function(a,b) {return b-a});
										for (var i=0; i<ts.length && i<50; i++) {
											G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, bid, ts[i], function(msg) {
												if (msg[1]) {
													//debug.log(msg[1]);
													$scope.chatSessions[bid].messages.push(msg[1]);
													$scope.inPageMsgs.push(msg[1]);
													$scope.inPageMsgs.sort(function(a,b) {return b.timeStamp - a.timeStamp});
													$scope.$apply();
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
				getChatHistory($stateParams.bid);
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
			controller : function($scope, $rootScope, $stateParams) {
				debug.log("in personal state ctrl, bid="+$stateParams.bid);
				//get a list of pics by this user
				if (!$stateParams.bid || $stateParams.bid===G_VARS.bid) {
					$rootScope.currUserInfo = $rootScope.myUserInfo;
				}
				else {
					$rootScope.currUserInfo = $rootScope.myUserInfo.friends[$stateParams.bid];
				}
				$scope.currUserInfo.getPictures($scope).then(function(pics) {
					$scope.myPicKeys = pics;
				}, function(reason) {
					debug.error(reason);
				});
			}
		})
		.state("root.personal.friends", {
			url : "/friends",
			templateUrl : "friends.html",
			controller : function($scope) {				
				for (var i=0; i<$scope.currUserInfo.b.friends.length; i++) {
					(function(bid) {
						if ($scope.currUserInfo.friends[bid]) {
							$scope.currUserInfo.friends[bid].getLastWeibo().then(function(wb) {
								$scope.$apply();
							}, function(reason) {
								debug.error(reason);
							});
						} else {
							var f = new UserInfo();
							$scope.currUserInfo.friends[bid] = f;
							f.get(bid).then(function(readOK) {
								if (readOK) {
									debug.info(f);
									f.getLastWeibo().then(function(wb) {
										$scope.$apply();
									}, function(reason) {
										debug.error(reason);
									});
								};
							}, function(reason) {
								debug.error(reason);
							});
						};
					}($scope.currUserInfo.b.friends[i].bid));
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
		debug.log("in weibo controller")
		var q = angular.injector(['ng']).get('$q');

		$scope.showPicSlider = function(wb) {
			if (wb.pictures.length === 0) return;
			$scope.slides = [];
			for (var i=0; i<wb.pictures.length; i++) {
				$scope.slides.push({
					image : wb.picUrls[i],
					text : i
				});
			};
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

				if (wbDay-currentDay > 30) {	//look for weibo in the past month
					wbDay = currentDay-1;		//remember the last day from which post is read
					debug.log("get out of loop, " + currentDay)
					$(".loader").fadeOut("slow");
					return;
				} else {
					currentDay--;
					getAllPosts(currentDay, original);
				};
			} else {
				//remember the last date of weibo read and exit
				wbDay = currentDay;
				$(".loader").fadeOut("slow");
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
				debug.error(err);
			});
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
			}, function(reason) {
				debug.error(reason);
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
			G_VARS.slice($scope.weiboList, $scope.currentList, ($scope.global.currentPage-1)*$scope.global.itemsPerPage, $scope.global.currentPage*$scope.global.itemsPerPage);
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

