//review.js
"use strict";

//handle review, relay and favorite
(function() {
	//angular.module("reviewModule", [])
	G_VARS.weiboApp
	.controller("reviewController", ['$rootScope','$scope', '$http',
	                                 function($rootScope, $scope, $http) {
		//console.log("Here in review module")

	}])
	.service("reviewService", ["$q", "$rootScope", function($q, $rootScope) {
		this.processMsg = function(htReview) {
			//process reviews and relays Weibo by Weibo. ht is a hashtable, key is wbID,
			//value is review or relay messages to the corresponding weibo
			for(var id in htReview) {
				console.log("readMsg: htReview["+id+"]=");
				//console.log(htReview[id]);
				proc(id, htReview[id]);
			};
		};
		
		var proc = function(wbID, ht) {
			//Last parameter ht is a hashtable with 2 keys: reviews and relays
			//corresponding value is array of reviews or relays. Save each of them
			var wb = new WeiboPost();
			wb.get(G_VARS.bid, wbID).then(function(readOK) {
				var ds = [];
				var r = new WeiboReview();
				//store all reviews and relays in db and put corresponding keys in Weibo obj
				//iterate REVIEWS and RELAYS column
				for (var k in ht) {
					//iterate each review or relay
					for (var i=0; i<ht[k].length; i++) {
						ds.push($q(function(resolve, reject) {
							//make a copy of relay or review as new WeiboReview
							//to make hProse happy
							angular.copy(ht[k][i], r);
							
							//save review and relay one by one, and put their keys
							//into each Weibo's reviews and relays
							G_VARS.httpClient.setdata(G_VARS.sid, G_VARS.bid, r, function(key) {
								if (wb[k] === null) {
									wb[k] = [key];
								} else {
									wb[k].push(key);
								};
								resolve(key);
							}, function(name, err) {
								console.log("processMsg err=" +err);
								reject(err);
							});
						}));
					};
				};
			
				//after all reviews data are saved correctly, put Weibo back into DB
				$q.all(ds).then(function(keys) {
					wb.update().then(function() {
						console.log("key="+wbID+"\n"+keys.length + " messages accepted");
						for (var i=0; i<$rootScope.weiboList.length; i++) {
							if ($rootScope.weiboList[i].wbID===wbID && $rootScope.weiboList[i].authorID===G_VARS.bid) {
								$rootScope.weiboList[i].reviews = wb.reviews;
								$rootScope.weiboList[i].relays = wb.relays;
							};
						};
						$rootScope.$apply();
					}, function(reason) {
						debug.warn(reason);
					});
				});
			}, function(reason) {
				debug.warn(reason);
			});
		};
	}])
})();