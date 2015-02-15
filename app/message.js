"use strict";

(function() {
	//angular.module("msgModule", [])
	G_VARS.weiboApp
	.service("msgService", ["$q", "$rootScope", "reviewService", "SMSService",
	                        function($q, $rootScope, reviewService, SMSService) {
		//var q = angular.injector(['ng']).get('$q');
		console.log("in msgService");
		
		//send a review message to the author of a post being reviewed
		this.sendReview = function(review, destID) {
			var r = new WeiboMessage();
			r.type = 2;		//reviews
			r.content = review;
			r.authorID = G_VARS.bid;
			
			var msg = new Message();
			msg.from = r.authorID;
			msg.to = destID;
			msg.data = r;
			
			G_VARS.httpClient.sendmsg(G_VARS.sid, msg, function() {
				console.log("In sendReview, msg sent OK");
			}, function(name, err) {
				console.log("In sendReview, err=" + err);
			});
		};

		//send a relay message to the post author
		this.sendRelay = function(relay, destID) {
			var r = new WeiboMessage();
			r.type = 3;		//relays
			r.content = relay;
			r.authorID = G_VARS.bid;

			var msg = new Message();
			msg.from = G_VARS.bid;
			msg.to = destID;
			msg.data = r;
			
			G_VARS.httpClient.sendmsg(G_VARS.sid, msg, function() {
				console.log(msg);
				console.log("In sendRelay, msg sent OK");
			}, function(name, err) {
				console.log("In sendRelay, err=" + err);
			});
		};

		//request to become friends
		this.sendRequest = function(destID, text) {
			var r = new WeiboMessage();
			r.bid = G_VARS.bid;
			r.type = 0;				//request to add friends
			r.content = text;

			var msg = new Message();
			msg.from = G_VARS.bid;
			msg.to = destID;
			msg.data = r;
			
			G_VARS.httpClient.sendmsg(G_VARS.sid, msg, function() {
				console.log("In send request, msg sent OK");
				console.log(msg);
			}, function(name, err) {
				console.log("In send request, err=" + err);
			});
		};
		
		this.sendSMS = function(destID, data) {
			var msg = new Message();
			msg.from = G_VARS.bid;
			msg.to = destID;
			msg.data = data;

			G_VARS.httpClient.sendmsg(G_VARS.sid, msg, function() {
				console.log(msg);
				console.log("In send request, msg sent OK");
			}, function(name, err) {
				console.log("In send request, err=" + err);
			});
		};
		
		//read inbound message and process them accordingly
		//take 2 call back functions as param to process reviews and SMS
		this.readMsg = function(processReviews, processSMS) {
			G_VARS.httpClient.readmsg(G_VARS.sid, function(msgs) {
				console.log("readMsg: number of msg=" +msgs.length);
				
				//iterate through msg list and combine msgs to the same Weibo into an array
				//then store the msg array in a hash table, indexed by wbID
				var htReview = {};		//hashtable to hold reviews and relays message
				var htSMS = {};			//hashtable to hold sms
				for (var i=0; i<msgs.length; i++) {
					var msg = msgs[i][0].Data;			//App defined WeiboMessage type
					console.log(msg);
					switch (msg.type) {
					case 0:
						//request to become friends. 
						var fromID = msgs[i][0].From;
						msg.viewed = null;
						var m = new WeiboMessage();
						angular.copy(msg, m);
						G_VARS.httpClient.hset(G_VARS.sid, G_VARS.bid, G_VARS.Request, fromID, m, function() {
							// only the newest request is saved
							console.log("saved request from "+fromID)
							
							//approve it for now
							var f = new Friend();
							f.bid = m.bid;
							f.group = "friend";
							f.type = 1;
							$rootScope.myUserInfo.friends[f.bid] = f;
							$rootScope.myUserInfo.set();
						}, function(name, err) {
							console.log(err);
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
						console.log(m);
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
			}, function(name, err) {
				console.log("read msg failed = " +err);
			});
		};
	}])
})();