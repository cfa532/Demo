//sms.js
"use strict";

(function() {
	G.weiboApp
	.controller("chatController", ["$window", "$scope", "msgService", 'SMSService', '$timeout',
	                               function($window, $scope, msgService, SMSService, $timeout) {
		console.log("in SMS controller")
		var chatbox1 = $('#myChatBox1');
		$scope.picUrl = null;

		//take a UserInfo obj as param. Ask for the user to become friend
		$scope.openRequest = function(ui) {
			msgService.sendRequest(ui.bid, "request to be added");
			//Assume the request will be accepted. get detailed friends information
			$scope.myUserInfo.addFriend(ui);
			delete $scope.usrList[ui.bid];
		};
		
		//register a callback function to sort messages in chatbox
		SMSService.addCallback(function(bid) {
			//called by processMsg when a new msg is received
			if ($scope.chatSessions[bid]) {
				$scope.chatSessions[bid].messages.sort(function(a,b) {return a.timeStamp - b.timeStamp;})
				$scope.$apply();
				chatbox1.scrollTop(100000);		//scroll to the bottom
			}
		});
		
		var getMsgPic = function(m) {
			if (m.contentType === 1) {
				new WeiboPicture(m.content, m.bid).get(0, function(uri) {
					m.dataURI = uri;
					$scope.$apply();
				});
			};
		};
		
		//start to chat with a friend. Take a UserInfo as input.
		$scope.startChat = function(friend)
		{
			//call a jQuery function defined in html, to open chat box
			$window.showChat();
			$scope.chatFriend = friend;
			debug.log(friend);
			
			if ($scope.chatSessions[friend.bid]) {
				//there is an ongoing conversation with the friend
				//any incoming message will be populated by processMsg();
				$scope.chatSessions[friend.bid].messages.sort(function(a,b) { return a.timeStamp - b.timeStamp;} );
				$timeout(function() {$scope.$apply(); chatbox1.scrollTop(100000)});
			} else {
				//no existing chat session, open one. Clean unread msgs only when user opened a new chat session
				//assume that is when the user read any old msgs
				var cs = new ChatSession();
				cs.bid = friend.bid, cs.friend = friend;
				$scope.chatSessions[friend.bid] = cs;
				
				//first check if there are unread msgs in SMSUnread db
				G.leClient.hget(G.sid, G.bid, G.UnreadSMS, friend.bid, function(data) {
					if (data[1]) {
						//display unread messages
						cs.messages = cs.messages.concat(data[1]);
						cs.messages.sort(function(a,b) {return a.timeStamp - b.timeStamp});
						$timeout(function() {$scope.$apply(); chatbox1.scrollTop(100000)});
						//get local pics for message to display
						angular.forEach(data[1], function(m) {
							getMsgPic(m);
						});
					} else {
						//no unread msgs, load msgs from last day
						//get all of them for now
						debug.log("no unread msgs");
						G.leClient.hkeys(G.sid, G.bid, friend.bid, function(ts) {
							if (ts.length>0) {
								ts.sort(function(a,b) {return a-b});
								//get the past 50 messages
								for (var i=ts.length-1; i>=0 && ts.length-i<50; i--) {
									G.leClient.hget(G.sid, G.bid, friend.bid, ts[i], function(msg) {
										if (msg[1]) {
											getMsgPic(msg[1]);
											cs.messages.unshift(msg[1]);
											cs.messages.sort(function(a,b) {return a.timeStamp - b.timeStamp});
											$timeout(function() {$scope.$apply(); chatbox1.scrollTop(100000)});
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
					G.leClient.hdel(G.sid, G.bid, G.UnreadSMS, friend.bid, function() {
						debug.log("unread msgs deleted");
					}, function(name, err) {
						debug.error(err);
					});
				});
			};
		};
		
		$scope.showBigPic = function(m) {
			$scope.bigPicUrl = m.dataURI;

			easyDialog.open({
				container : 'big_picture',
				fixed : false,
				drag : true,
				overlay : true
			});
		};
				
		//upload a picture to be sent
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
				debug.warn(err);
			});
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
				$scope.$apply(); chatbox1.scrollTop(100000);
				
				//save it in db as conversation
				SMSService.saveSMS(bid, m);
			};
			if ($scope.picUrl) {
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
						$scope.$apply(); chatbox1.scrollTop(100000);
						
						//save message in db as conversation
						SMSService.saveSMS(bid, m);
						
						//save the pic in local indexedDB too
						new WeiboPicture(picKey).set(e.target.result, function(setOK) {
							debug.log("pic in msg saved="+setOK);
						});
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
						console.log($scope.fileSent);
						
						//concat file name, type and key into a string
						m.content = $scope.fileSent.name + "\t" + $scope.fileSent.type + "\t" + fileKey;
						m.timeStamp = new Date().getTime();
						msgService.sendSMS(bid, m);
						
						debug.log($scope.chatSessions[bid]);
						$scope.chatSessions[bid].messages.push(m);
						$scope.chatSessions[bid].timeStamp = m.timeStamp;
						$scope.fileSent = null;
						$scope.$apply();
						chatbox1.scrollTop(100000);		//scroll to bottom
						
						//save it in db as conversation
						SMSService.saveSMS(bid, m);
					}, function(name, err) {
						debug.error(err);
					});
				};
				r.readAsArrayBuffer($scope.fileSent);
			};
		};
		
		//get the css class for each message
		$scope.getMsgClass = function(bid, line) {
			if (bid === G.bid) {
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
		
		$scope.getOnlineNodes = function() {
			G.leClient.getvar(G.sid, "onlinehost", function(data) {
			});
		};

		$scope.getOnlineUsers = function() {
			//get nearby users those are not friends
			G.leClient.getvar(G.sid, "usernearby", function(data) {
				//an array of userid on the same node
				//debug.log(data);
				$scope.usrList = {};
				angular.forEach(data, function(bid) {
					if (bid!==G.bid && !$scope.myUserInfo.isFriend(bid)) {
						(function(bid) {
							var ui = new UserInfo(bid);
							ui.get(function(readOK) {
								if (readOK) {
									$scope.usrList[bid] = ui;
									//debug.info(ui);
									$scope.$apply();
								};
							});
						}(bid));
					};
				});
			});
		};

		$("#myChatArea").keyup(function(e) {	//use keyup to avoid misfire in chinese input
			if (e.keyCode === 13) {
				$scope.sendSMS($scope.chatFriend.bid);
				return false;
			};
		});
	}])
	.service("SMSService", ['$rootScope', function($rootScope) {
		debug.log("in SMS Service");
		
		//refresh chatbox content to show new messages
		var sortFunctions = [];
		this.addCallback = function(callback) {
			sortFunctions.push(callback);
		};
		
		this.processMsg = function(htSMS) {
			//htSMS is a hashtable indexed by bid, value is an array of sms from the bid			
			for (var bid in htSMS) {
				//if there are open chat sessions, attach msgs to it
				if ($rootScope.chatSessions[bid]) {
					$rootScope.chatSessions[bid].messages = $rootScope.chatSessions[bid].messages.concat(htSMS[bid]);
					
					//make the new messages shown in chat box
					for (var i=0; i<sortFunctions.length; i++) {
						//sort msgs differently on inPage and floating window
						sortFunctions[i](bid);
					};
				};
				
				//add new msgs in to unread msgs array
				G.leClient.hget(G.sid, G.bid, G.UnreadSMS, bid, function(data) {
					if (data[1]) {
						for (var i=0; i<data[1].length; i++) {
							var m = new WeiboMessage();
							angular.copy(data[1][i], m);
							htSMS[bid].push(m);
						};
					};

					//update unread msgs with both old and new ones
					G.leClient.hset(G.sid, G.bid, G.UnreadSMS, bid, htSMS[bid], function() {
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
			G.leClient.hget(G.sid, G.bid, bid, msg.timeStamp, function(data) {
				if (data[1]) {
					//most unlikely, but 2 msgs happened at the same time
					msg.timeStamp++;	//try a different timestamp by adding 1 millisecond
					this.saveSMS(bid, msg);
				} else {
					G.leClient.hset(G.sid, G.bid, bid, msg.timeStamp, msg, function() {
						debug.log("msg saved in db", msg);

						//make the new messages shown in chat box
						for (var i=0; i<sortFunctions.length; i++) {
							//sort msgs differently inPage and floating window
							sortFunctions[i](bid);
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