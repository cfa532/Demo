"use strict";

//handle review, relay and favorite
(function() {
	//angular.module("reviewModule", [])
	G_VARS.weiboApp
	.controller("reviewController", ['$rootScope','$scope', '$http',
	                                 function($rootScope, $scope, $http) {
		//console.log("Here in review module")
		$scope.R = {
				reviewedWeibo	: null,
				relayedWeibo	: null,
				favoriteWeibo	: null
		};

		//publish a new Post with a ParentID
		$scope.relayPost = function(relayText, parentWB) {
			console.log("in relayPost()");
			console.log(parentWB)
			var wb = new WeiboPost();
			if (parentWB.parentID !== null) {
				//we are relaying a weibo that has been relayed at least once.
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
			
			wb.set().then(function() {
				$scope.weiboList.unshift(wb);
				G_VARS.slice($scope.weiboList, $scope.currentList, ($scope.global.currentPage-1)*$scope.global.itemsPerPage, $scope.global.currentPage*$scope.global.itemsPerPage);
				console.log(wb);
				$scope.$apply();
				$scope.myUserInfo.weiboCount++;
				$scope.myUserInfo.setLastWeibo(wb);
			});
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
			G_VARS.httpClient.get(G_VARS.sid, G_VARS.bid, wbID, function(data) {
				//get the weibo being reviewed
				var wb = new WeiboPost();
				angular.copy(data[1], wb);
				//console.log(ht);
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
			
				//after all reviews data are saved correctly, put Weibo obj back into DB
				$q.all(ds).then(function(keys) {
					G_VARS.httpClient.set(G_VARS.sid, G_VARS.bid, wbID, wb, function() {
						console.log("key="+wbID+"\n"+keys.length + " messages accepted");
						for (var i=0; i<$rootScope.weiboList.length; i++) {
							if ($rootScope.weiboList[i].wbID===wbID && $rootScope.weiboList[i].authorID===G_VARS.bid) {
								$rootScope.weiboList[i].reviews = wb.reviews;
								$rootScope.weiboList[i].relays = wb.relays;
							};
						};
						//for (var i=0; i<$rootScope.currentList.length; i++) {
						//	if ($rootScope.currentList[i].wbID===wbID && $rootScope.currentList[i].authorID===G_VARS.bid) {
						//		$rootScope.currentList[i].reviews = wb.reviews;
						//		$rootScope.currentList[i].relays = wb.relays;
						//	};
						//};
						$rootScope.$apply();
					}, function(name, err) {
						console.log("readMsg err1=" +err);
					});
				});
			}, function(name, err) {
				console.log("readMsg err2=" +err);
			});
		};
	}])
})();