//account.js
"use strict";
(function() {
	//angular.module("accountModule", [])
	G_VARS.weiboApp
	.provider("logonService", [function() {
	    this.$get = ["$q", function($q) {
	        return new logon($q);
	    }];
	    
	    var bidPath = window.location.pathname+"/appID/userID";
	    //debug.log("userid path="+userid);
	    function logon($q) {
			//retrieve user information
			this.getSysUser = function() {
				//debug.log(userid);
				var deferredUser = $q.defer();
				var deferredVer = $q.defer();
//				var dePage = $q.defer();

				//make an asynchronous call to get sid, then return the promise
				getSid().then(function(sid) {
					//resolved handler
					sessionStorage.sid = sid;
					
					//get system user object, which is different from Weibo user object
					G_VARS.httpClient.getvar(sid, 'self', function(usr) {
						deferredUser.resolve(usr);
					}, function(name, err) {
						debug.log("getSysUser err=" + err);
						deferredUser.reject("Failed to obtain system User object");
					});
					
					G_VARS.httpClient.getvar(sid, 'ver', function(ver) {
						deferredVer.resolve(ver);
					}, function(name, err) {
						debug.log("getSysUser err2=" +err);
						deferredVer.reject("Failed to obtain version #");
					});
					
					G_VARS.httpClient.getvar(sid, 'ppt', function(ppt) {
						debug.log('ppt=' +ppt);
					}, function(name, err) {
						debug.error(err);
					});
				}, function(reason) {
					// handle error
					debug.error("getSysUser err3=" +reason);
					$q.reject(reason);
				});
				return $q.all([deferredUser.promise, deferredVer.promise]);
			};
			
			//retrieve SessionID, sid, that will be used through out the app
			var getSid = function() {
				var sid = $q.defer();
				sid.resolve(G_VARS.sid);
				return sid.promise;
				
				if (angular.isUndefined(localStorage[bidPath]) || localStorage[bidPath]===null) {
					//invalid userid, need to create a new userid
					//userid is same as bid (block ID)
					G_VARS.httpClient.register(function(id) {
						debug.log("New User created, id=" + id);
						localStorage[bidPath] = id;
						login().then(function(data) {
							sid.resolve(data);
					});
					}, function(name, err) {
						debug.error("Failed to register, err=" + err);
						sid.reject(err);
					});
				} else {
					debug.log("userID is valid " + localStorage[bidPath]);
					login().then(function(data) {
						sid.resolve(data);
					});
				};
				return sid.promise;
			};
			
			var login = function() {
				return $q(function(resolve, reject) {
					//get session id that will be used thorough out the app
					G_VARS.httpClient.login(null, G_VARS.ppt, function(sid) {
						debug.log("login with ppt")
						resolve(sid);
					}, function(name, err) {
						debug.log("Login err=" +err);
						//delete old userid and try to login again
						localStorage.removeItem(bidPath);
						G_VARS.httpClient.register(function(newid) {
							debug.warn("Re-create Userid=" + newid);
							localStorage[bidPath] = newid;
							
							//try again to get a sid
							//test user cases
							//data = "jLZLO7LwRS0I_aiFcnP8uZ5AJ14vUY_DIApwmDU4JZA"
							G_VARS.httpClient.login(newid, "ppt", function(sid2) {
								debug.warn("in getSid2="+sid2+" new userid="+localStorage[bidPath]);
								resolve(sid2);
							});
						}, function(name, err) {
							debug.error("Failed to register, err=" + err);
						});
					});
				});
			};

			//retrieve  nearby user list
			this.getNeighbours = function() {
				//when this function is called, the login process should be done
				var nl = $q.defer();
				G_VARS.httpClient.getvar(sessionStorage.sid, "usernearby", function(data) {
					//an array of userid strings
					resolve();
				});
			};
		};
	}])
	.controller("accountController", ["$state", "$scope", "$window", "$rootScope",
	                                  function($state, $scope, $window, $rootScope) {
		debug.log("in account controller");
		$scope.alerts = [];
		$scope.saveAccount = function() {
			//should check validity of input here
			var headpic = document.getElementById("myUploadIcon").files[0];
			var r = new FileReader();
			r.onloadend = function(e) {
				//store the head photo of user
				G_VARS.httpClient.setdata(G_VARS.sid, G_VARS.bid, e.target.result, function(key) {
					$scope.myUserInfo.headPicKey = key;
					var f = new FileReader();
					f.onloadend = function(e) {
						//draw a thumbnail of the original picture
						var tmpCanvas = document.createElement("canvas");
						var img = new Image();
						img.onload = function(e) {
							tmpCanvas.width = "200";
							tmpCanvas.height = "200";
							tmpCanvas.getContext("2d").drawImage(img, 0, 0, tmpCanvas.width, tmpCanvas.height);
							
							$scope.myUserInfo.headPicUrl = tmpCanvas.toDataURL();
							$scope.myUserInfo.set().then(function() {
								//my icon pic is changed, has to update the corresponding page
								for (var i=0; i<$scope.weiboList.length; i++) {
									if ($scope.weiboList[i].authorID === G_VARS.bid) {
										$scope.weiboList[i].headPicUrl = e.target.result;
									};
								};
							}, function(reason) {
								$scope.alerts[0] = {type: 'danger', msg: 'Account NOT updated'};
								debug.error("set myUserInfo err="+reason);
							});
						};
						img.src = e.target.result;

						headpic = null;
						$scope.alerts[0] = {type: 'success', msg: 'Account updated OK with picture'};
						$scope.$apply();
					};
					f.readAsDataURL(headpic);
					
				}, function(name, err) {
					$scope.alerts[2].show = true;
					debug.error("saveAccount err2=" +err);
				});
			};
			if (headpic) {
				r.readAsArrayBuffer(headpic);
			} else {
				$scope.myUserInfo.set().then(function() {
					$scope.alerts[0] = {type: 'success', msg: 'Account updated OK without picture'};
					$scope.$apply();
				});
			};
		};
		
		$scope.closeAlert = function(index) {
			$scope.alerts.length = 0;
		};
		
		$window.uploadMyIcon = function() {
			var img = document.getElementById("myUserIcon");
			var file = document.getElementById("myUploadIcon").files[0];
			if (file) {
				var r = new FileReader();
				r.onloadend = function(e) {
					img.setAttribute("src", e.target.result);
				};
				r.readAsDataURL(file);
			};
		};

		//jQuery for showing account manager box
		$("#set_icon").click(function(){
			easyDialog.open({
			container : 'user_set',
			fixed : false,
			drag : true,
			overlay : true
			});
		});
	}])
})();