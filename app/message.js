//message.js
"use strict";

(function() {
	//angular.module("msgModule", [])
	G.weiboApp
	.service("msgService", ["$q", "$rootScope", "reviewService", "SMSService",
	                        function($q, $rootScope, reviewService, SMSService) {
		//var q = angular.injector(['ng']).get('$q');
		debug.log("in msgService");
		var self = this;
		
		//send a review message to the author of a post being reviewed
		this.sendReview = function(review, destID) {
			var r = new WeiboMessage();
			r.type = 2;		//reviews
			r.content = review;
			r.authorID = G.bid;
			
			var msg = new Message();
			msg.from = r.authorID;
			msg.to = destID;
			msg.data = r;
			
			G.leClient.sendmsg(G.sid, msg, function() {
				debug.log("In sendReview, msg sent OK", msg);
			}, function(name, err) {
				debug.error("In sendReview, err=" + err);
			});
		};

		//send a relay message to the post author
		this.sendRelay = function(relay, destID) {
			var r = new WeiboMessage();
			r.type = 3;		//relays
			r.content = relay;
			r.authorID = G.bid;

			var msg = new Message();
			msg.from = G.bid;
			msg.to = destID;
			msg.data = r;
			
			G.leClient.sendmsg(G.sid, msg, function() {
				debug.log("In sendRelay, msg sent OK", msg);
			}, function(name, err) {
				debug.error("In sendRelay, err=" + err);
			});
		};

		//request to become friends
		this.sendRequest = function(destID, text) {
			var r = new WeiboMessage();
			r.bid = G.bid;
			r.type = 0;				//request to add friends
			r.content = text;

			var msg = new Message();
			msg.from = G.bid;
			msg.to = destID;
			msg.data = r;
			
			G.leClient.sendmsg(G.sid, msg, function() {
				debug.log("In send request, msg sent OK", msg);
			}, function(name, err) {
				debug.error("In send request, err=" + err);
			});
		};
		
		this.sendSMS = function(destID, data) {
			var msg = new Message();
			msg.from = G.bid;
			msg.to = destID;
			msg.data = data;

			G.leClient.sendmsg(G.sid, msg, function() {
				debug.log("In sendSMS, msg sent OK", msg);
			}, function(name, err) {
				debug.error("In send request, err=" + err);
			});
		};
		
		//read inbound message and process them accordingly
		//take 2 call back functions as param to process reviews and SMS
		this.readMsg = function(scope) {
			G.leClient.readmsg(G.sid, function(msgs) {
				//debug.info("readMsg: ", msgs);
				//iterate through msg list and combine msgs to the same Weibo into an array
				//then store the msg array in a hash table, indexed by wbID
				var htReview = {};		//hashtable to hold reviews and relays message
				var htSMS = {};			//hashtable to hold sms
				for (var i=0; i<msgs.length; i++) {
					var msg = msgs[i][0].Data;			//App defined WeiboMessage type
					debug.log(msg);
					switch (msg.type) {
					case 0:
						//request to become friends. 
						var fromID = msgs[i][0].From;
						msg.viewed = null;
						var m = new WeiboMessage();
						angular.copy(msg, m);
						G.leClient.hset(G.sid, G.bid, G.Request, fromID, m, function() {
							// only the newest request is saved
							debug.log("saved request from "+fromID, m);
							
							//approve it for now, add a friend automatically
							var f = new UserInfo(m.bid);
							f.get(function(readOK) {
								if (readOK) {
									$rootScope.myUserInfo.addFriend(f);
									//if(scope) scope.$apply();
								};
							});
						}, function(name, err) {
							debug.warn(err);
						});
						break;
					case 1:
						//sms
						var m = new WeiboMessage();
						angular.copy(msg, m);
						if (angular.isUndefined(htSMS[m.bid])) {
							htSMS[m.bid] = [m];
						} else {
							htSMS[m.bid].unshift(m);
						};
						//debug.log(m);
						break;
					case 2:
						var wbID = msg.content.parentID;		//wb to be reviewed
						if (angular.isUndefined(htReview[wbID])) {
							htReview[wbID] = {};
							htReview[wbID]["reviews"] = [msg.content];
						} else {
							htReview[wbID]["reviews"].push(msg.content);
						};
						break;
					case 3:
						var wbID = msg.content.parentID;		//wb to be relayed
						if (angular.isUndefined(htReview[wbID])) {
							htReview[wbID] = {};
							htReview[wbID]["relays"] = [msg.content];
						} else {
							htReview[wbID]["relays"].push(msg.content);
						};
						break;
					}
				};
				reviewService.processMsg(htReview);
				SMSService.processMsg(htSMS);
				self.readMsg();
			}, function(name, err) {
				debug.error("read msg failed = " +err, new Date());
				self.readMsg(scope);
			});
		};
	}])
})();