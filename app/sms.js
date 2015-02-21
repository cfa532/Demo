"use strict";

(function() {
	G_VARS.weiboApp
	.controller("chatController", ["$window", "$scope", "msgService", 'SMSService', "$modal",
	                               function($window, $scope, msgService, SMSService, $modal) {
		debug.log("in SMS controller")
		
		//take a UserInfo obj as param. Ask for the user to become friend
		$scope.openRequest = function(ui) {
			msgService.sendRequest(ui.bid, "request to be added");
			
			//Assume the request will be accepted. get detailed friends information
			$scope.myUserInfo.addFriend(ui);
			delete $scope.usrList[ui.bid];
		};
		
		//called by processMsg when a new msg is received
		var sort = function(bid) {
			$scope.chatSessions[bid].messages.sort(function(a,b) {return a.timeStamp - b.timeStamp})
			$scope.$apply();
		};
		//register this scope with SMS service
		SMSService.regScope(sort);
		
		//start to chat with a friend. Take a UserInfo as input.
		$scope.startChat = function(friend)
		{
			//call a jQuery function defined in html, to open chat box
			$window.showChat();
			$scope.chatFriend = friend;
			debug.log(friend);
			var wtf = $('#myChatBox1');		//for scroll to the bottom
			
			if ($scope.chatSessions[friend.bid]) {
				//there is an ongoing conversation with the friend
				//any incoming message will be populated by processMsg();
				$scope.chatSessions[friend.bid].messages.sort(function(a,b) {return a.timeStamp - b.timeStamp});
				wtf.scrollTop(wtf[0].scrollHeight);
				//$scope.$apply();
			} else {
				//no existing chat session, open one. Clean unread msgs only when user opened a new chat session
				//assume that is when the user read any old msgs
				var cs = new ChatSession();
				cs.bid = friend.bid, cs.friend = friend;
				$scope.chatSessions[friend.bid] = cs;
				//first check if there are unread msgs in SMSUnread db
				G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, G_VARS.UnreadSMS, friend.bid, function(data) {
					if (data[1]) {
						cs.messages = cs.messages.concat(data[1]);
						cs.messages.sort(function(a,b) {return a.timeStamp - b.timeStamp});
						wtf.scrollTop(wtf[0].scrollHeight);
						//$scope.$apply();
					} else {
						//no unread msgs, load msgs from last day
						//get all of them for now
						debug.log("no unread msgs");
						G_VARS.httpClient.hkeys(G_VARS.sid, G_VARS.bid, friend.bid, function(ts) {
							if (ts!==null && ts.length>0) {
								for (var i=0; i<ts.length; i++) {
									G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, friend.bid, ts[i], function(msg) {
										if (msg[1]) {
											cs.messages.unshift(msg[1]);
											cs.messages.sort(function(a,b) {return a.timeStamp - b.timeStamp});
											$scope.$apply();
											wtf.scrollTop(100000);
										};
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
					G_VARS.httpClient.hdel(G_VARS.sid, G_VARS.bid, G_VARS.UnreadSMS, friend.bid, function() {
						debug.log("unread msgs deleted");
					}, function(name, err) {
						debug.error(err);
					});
				});
			};
		};
		
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
			$scope.chatSessions[bid].messages.push(m);
			$scope.chatSessions[bid].timeStamp = m.timeStamp;
			$scope.txtChat = '';
			
			//save it in db as conversation
			SMSService.saveSMS(bid, m);
		};
		
		//get the css class for each message
		$scope.getMsgClass = function(bid, line) {
			if (bid === G_VARS.bid) {
				if (line === 1)
					return "msg_bubble_list bubble_r";
				else
					return "W_arrow_bor  W_arrow_bor_r";
			} else {
				if (line === 1)
					return "msg_bubble_list bubble_l";
				else
					return "W_arrow_bor  W_arrow_bor_l";
			};
		};
		
		$scope.getOnlineUsers = function() {
			//get all my friends list, again
			//$scope.myUserInfo.getFriends($scope);
			
			//get nearby users those are not friends
			G_VARS.httpClient.getvar(G_VARS.sid, "usernearby", function(data) {
				//an array of userid on the same node
				//debug.log(data);
				$scope.usrList = {};
				angular.forEach(data, function(bid) {
					if (bid!==G_VARS.bid && bid!==null && !$scope.myUserInfo.isFriend(bid)) {
						getUI($scope.usrList, bid);
					};
				});
			});
		};
		
		var getUI = function(ht, bid) {
			var ui = new UserInfo();
			ht[bid] = ui;
			ui.get(bid).then(function(readOK) {
				if (readOK) {
					debug.log(ui);
					$scope.$apply();
				};
			});
		};
		
		$scope.getOnlineNodes = function() {
			G_VARS.httpClient.getvar(G_VARS.sid, "onlinehost", function(data) {
			});
		};
		//$scope.getOnlineUsers();
	}])
	.service("SMSService", ['$rootScope', function($rootScope) {
		debug.log("in SMS Service");
		
		//refresh chatbox content to show new messages
		var chatScopes = [];
		this.regScope = function(sort) {
			chatScopes.push(sort);
		};
		
		this.processMsg = function(htSMS) {
			//htSMS is a hashtable indexed by bid, value is an array of sms from the bid			
			for (var bid in htSMS) {
				//if there are open chat sessions, attach msgs to it
				if ($rootScope.chatSessions[bid]) {
					$rootScope.chatSessions[bid].messages = $rootScope.chatSessions[bid].messages.concat(htSMS[bid]);
					
					//make the new messages shown in chat box
					for (var i=0; i<chatScopes.length; i++) {
						//sort msgs differently inPage and floating window
						chatScopes[i](bid);
					};
				};
				
				//update unread msg records
				//first get old unread msgs
				G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, G_VARS.UnreadSMS, bid, function(data) {
					if (data[1]) {
						for (var i=0; i<data[1].length; i++) {
							var m = new WeiboMessage();
							angular.copy(data[1][i], m);
							htSMS[bid].push(m);
						};
					};

					//update unread msgs with both old and new ones
					G_VARS.httpClient.hset(G_VARS.sid, G_VARS.bid, G_VARS.UnreadSMS, bid, htSMS[bid], function() {
						//debug.log(htSMS[bid]);
					}, function(name, err) {
						debug.error(err);
					});
				}, function(name, err) {
					debug.error(err);
				});								

				//save the new message into permanent db
				for (var i=0; i<htSMS[bid].length; i++) {
					this.saveSMS(bid, htSMS[bid][i]);
				};
			};
		};
		
		//bid is the chatting friend's bid
		this.saveSMS = function(bid, msg) {
			//debug.log(msg);
			G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, bid, msg.timeStamp, function(data) {
				if (data[1]) {
					//most unlikely, but 2 msgs happened at the same time
					msg.timeStamp++;	//try a different timestamp by adding 1 millisecond
					this.saveSMS(msg);
				} else {
					G_VARS.httpClient.hset(G_VARS.sid, G_VARS.bid, bid, msg.timeStamp, msg, function() {
						debug.log("msg saved in db", msg);

						//make the new messages shown in chat box
						for (var i=0; i<chatScopes.length; i++) {
							//sort msgs differently inPage and floating window
							chatScopes[i](bid);
						};
					}, function(name, err) {
						debug.error(err);
					});
				};
			}, function(name, err) {
				debug.error(err);
			});
		};
	}])
})();