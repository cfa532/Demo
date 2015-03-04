//directive.js
"use strict";

(function() {	
	G_VARS.weiboApp
	.directive("leRelay", ["msgService", function(msgService) {
		debug.log("in le-relay constructor");
		return {
			restrict : "E",
			//transclude : true,
			template : function(elem, attrs) {
				return "<div class='zfWrap comt-box' ng-show='show'> \
				<div class='top c_tx5'> \
					<span class='left'> \
						<span class='number cNote'>转播本条微博</span> \
					</span> \
					<a href='javascript:void(0);' class='W_close fr' title='关闭'></a> \
				</div> \
				<div class='cont'> \
					<textarea ng-model='relay' ng-change='txtChanged()' class='inputTxt' style='overflow-y: hidden; height: 37px;'></textarea> \
				</div>\
				<div class='bot'>\
					<div class='fr'>\
						<span ng-show='R.chCounter<=30' class='countTxt'>还能输入<em>{{R.chCounter}}</em>字</span>\
						<a ng-click='(!R.txtInvalid) && addRelay()' class='w_btn_a'><span class='btn_30px'>转发</span></a>\
					</div>\
					<div class='clearfix'></div>\
				</div>\
						<div class='relayList'>				\
							<div class='tabStyle1'>			\
								<b class='line'></b>		\
							</div>							\
							<div class=''>					\
								<ul>						\
									<li ng-repeat='r in relayList track by $index' class='nobor'>	\
										<div class='msgCnt'>											\
											<strong><a ui-sref='root.personal.allPosts({bid:r.authorID})' target='_blank' class='f10a2c7'>{{r.author}}</a>:</strong>	\
											<span class='content'>{{r.body}}</span>			\
										</div>												\
										<div class='pubInfo'>								\
											<span class='cNote'>{{r.timeStamp | timePassed}}</span>	\
											<a href='#' class='alarm'>删除</a>						\
											<a href='#' class='replyCite'>评论</a>					\
										</div>		\
									</li>			\
								</ul>				\
							</div>					\
			<pagination direction-links='false' boundary-links='true' items-per-page='pageSize' total-items='weibo.relays.length' ng-change='pageChanged()' ng-model='currentPage'></pagination>\
												<div class='pages'>		\
							</div>										\
						</div>	\
					</div>"; 
			},
			scope : {
				pageSize : "@",
				weibo : "=",
				showRelay : "@",
				author : "@",
				add : "&"
			},
			link : function(scope, elem, attrs) {
				//debug.log("in relay's link, size=" + scope.pageSize);
				scope.R = {
					sentOK			: false,
					txtInvalid		: true,
					chCounter		: G_VARS.MaxWeiboLength,
				};
				scope.relayList = [];
				scope.currentPage = 1;
				
				//watch if review block of current weibo is shown or hidden
				scope.$watch(function() { return scope.showRelay }, 
						function(newValue, oldValue) {
					if (newValue!==oldValue && newValue==='true') {
						//debug.log(scope.weibo);
						scope.show = true;
						getPage()
					} else {
						scope.show = false;
					};
				});
				
				var getPage = function(nr) {
					scope.relayList.length = 0;
					if (nr) scope.relayList = [nr];		//put new review in front of the list
					
					//debug.log("number of relays = " + scope.weibo.relays.length);
					//debug.log(scope.weibo);
					for(var j=(scope.currentPage-1)*scope.pageSize; j<scope.weibo.relays.length && j<scope.currentPage*scope.pageSize; j++) {
						//iterate every review ID
						G_VARS.httpClient.get(G_VARS.sid, scope.weibo.authorID, scope.weibo.relays[j], function(data) {
							if (data[1] !== null) {
								scope.relayList.push(data[1]);
								//debug.log(data[1])
								scope.relayList.sort(function(a,b) {return b.timeStamp - a.timeStamp});
								scope.$apply();
							};
						}, function(name, err) {
							debug.error("In showRelay err=", err);
						});
					};
				};
				
				scope.pageChanged = function() {
					debug.log("current page="+scope.currentPage);
					getPage();
				};

				//message input in the Review textarea
				scope.txtChanged = function() {
					if (scope.relay.replace(/\s+/g,"") !== '') {
						scope.R.txtInvalid = false;
						if (scope.relay.toString().length > G_VARS.MaxWeiboLength) {
							//no more, remove the last char input
							scope.relay = scope.relay.toString().slice(0, G_VARS.MaxWeiboLength);
						} else {
							scope.R.chCounter = G_VARS.MaxWeiboLength - scope.relay.toString().length;
						}
					} else {
						scope.R.txtInvalid = true;
						scope.R.chCounter = G_VARS.MaxWeiboLength;
					};
				};
				
				scope.addRelay = function() {
					//prevent duplicated submit
					scope.R.txtInvalid = true;

					//add a review to weibo, then add a new post
					//review text added directly from ng-model
					var r = new WeiboReview();
					r.body = scope.relay;
					r.timeStamp = new Date().getTime();
					r.parentID = scope.weibo.wbID;
					r.authorID = G_VARS.bid;	//commenting on other's post
					r.author = scope.author;
								
					//add the relay to db and update the Weibo
					G_VARS.httpClient.setdata(G_VARS.sid, G_VARS.bid, r, function(relayKey) {
						if (scope.weibo.authorID !== G_VARS.bid) {
							//commenting another's weibo
							//send a message to the author of the Post reviewed
							r.key = relayKey;
							msgService.sendRelay(r, scope.weibo.authorID);
							debug.log(scope.weibo);
							scope.relay = '';
							scope.currentPage = 1;
							getPage(r);
							scope.$apply();
							
							//publish a new relayed weibo
							scope.add()(r.body, scope.weibo);		//call relayPost() in reviewController
							
							//update a global key list for all reviews by me
							updateMyReviewList(relayKey);
						} else {						
							//commenting on my own weibo, update relay list directly
							if (scope.weibo.relays === null)
								scope.weibo.relays = [relayKey];
							else
								scope.weibo.relays.unshift(relayKey);
							
							//debug.log(scope.weibo);
							scope.weibo.update().then(function() {
								debug.log("addRelay OK, key="+relayKey);
								scope.relay = '';
								scope.currentPage = 1;
								getPage();
								scope.$apply();

								//it seems work only when the outside function is defined in direct parent scope
								//has to be called after updating current weibo, otherwise scope might change
								scope.add()(r.body, scope.weibo);		//call relayPost() in reviewController

								//update a global key list for all reviews by me
								updateMyReviewList(relayKey);
							}, function(name, err) {
								debug.error("addRelay err1=", err);
								scope.R.txtInvalid = false;
							});
						}
					}, function(name,err) {
						debug.error("add relay err2=", err);
						scope.R.txtInvalid = false;
					})
				};

				//update the global review's keylist
				var updateMyReviewList = function(reviewKey) {
					var currentDay = parseInt(new Date().getTime()/86400000);
					G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, G_VARS.Reviews, currentDay, function(data) {
						if (data[1])
							data[1].unshift(reviewKey);
						else
							data[1] = [reviewKey];
						G_VARS.httpClient.hset(G_VARS.sid, G_VARS.bid, G_VARS.Reviews, currentDay, data[1], function() {
							debug.log("setRelayData: update review keys OK. " +reviewKey);
						}, function(name, err) {
							debug.error("setRelayData: update review keys failed, ", err);
						});
					}, function(name, err) {
						debug.error("setRelayData: get review keys failed, ", err);
					});
				};
			}
		}
	}])
	.directive("leReview", ["msgService", function(msgService) {
		debug.log("in le-review constructor");
		return {
			restrict : "E",
			transclude : true,
			template : function(elem, attrs) {
				//return localStorage.pagination;
				
				return "<div class='zfWrap comt-box' ng-show=show> \
				<div class='top c_tx5'> \
					<span class='left'> \
						<ng-transclude></ng-transclude>\
					</span> \
					<a href='javascript:void(0);' class='W_close fr' title='关闭'></a> \
				</div> \
				<div class='cont'> \
					<textarea ng-model='retext' ng-change='txtChanged()' class='inputTxt' style='overflow-y: hidden; height: 37px;'></textarea> \
				</div>\
				<div class='bot'>\
					<div class='fr'>\
						<span ng-show='R.chCounter<=30' class='countTxt'>还能输入<em>{{R.chCounter}}</em>字</span>\
						<a ng-click='(!R.txtInvalid) && addReview()' class='w_btn_a'><span class='btn_30px'>评论</span></a>\
					</div>\
					<div class='clearfix'></div>\
				</div>\
						<div class='relayList'>				\
							<div class='tabStyle1'>			\
								<b class='line'></b>		\
							</div>							\
							<div class=''>					\
								<ul>						\
									<li ng-repeat='r in reviewList track by $index' class='nobor'>	\
										<div class='msgCnt'>											\
											<strong><a ui-sref='root.personal.allPosts({bid:r.authorID})' target='_blank' class='f10a2c7'>{{r.author}}</a>:</strong>	\
											<span class='content'>{{r.body}}</span>			\
										</div>												\
										<div class='pubInfo'>								\
											<span class='cNote'>{{r.timeStamp | timePassed}}</span>	\
											<a href='#' class='alarm'>删除</a>						\
											<a href='#' class='replyCite'>评论</a>					\
										</div>		\
									</li>			\
								</ul>				\
							</div>					\
			<pagination direction-links='false' boundary-links='true' items-per-page='pageSize' total-items='weibo.reviews.length' ng-change='pageChanged()' ng-model='currentPage'></pagination>\
												<div class='pages'>		\
							</div>										\
						</div>	\
					</div>"; 
			},
			scope : {
				pageSize : "@",
				weibo : "=",
				display : "@",
				author : "@",
			},
			link : function(scope, elem, attrs) {
				//debug.log("in page link, size=" + scope.pageSize);
				scope.R = {
					sentOK			: false,
					txtInvalid		: true,
					chCounter		: G_VARS.MaxWeiboLength,
				};
				scope.reviewList = [];
				scope.currentPage = 1;
				//debug.log(attrs.weibo);
				
				//watch if review block of current weibo is shown or hidden
				scope.$watch(function() {return scope.display}, 
						function(newValue, oldValue) {
					if (newValue!==oldValue && newValue==='true') {
						//debug.log("number of reviews = " + scope.weibo.reviews.length);
						scope.show = true;
						getPage()
					} else {
						scope.show = false;
					};
				}); 
				
				var getPage = function(nr) {
					scope.reviewList.length = 0;
					//if there is a new review just submitted by me, put it in front of the list
					if (nr) scope.reviewList = [nr];
					//debug.log(scope.weibo);
					
					for(var j=(scope.currentPage-1)*scope.pageSize; j<scope.weibo.reviews.length && j<scope.currentPage*scope.pageSize; j++) {
						//iterate every review ID
						G_VARS.httpClient.get(G_VARS.sid, scope.weibo.authorID, scope.weibo.reviews[j], function(data) {
							if (data[1] !== null) {
								scope.reviewList.push(data[1]);
								//debug.log(data[1]);
								scope.reviewList.sort(function(a,b) {return b.timeStamp - a.timeStamp});
								scope.$apply();
							};
						}, function(name, err) {
							debug.error("In showReview err=", err);
						});
					};
				};
				
				scope.pageChanged = function() {
					debug.log("current page="+scope.currentPage);
					getPage();
				};

				//message input in the Review textarea
				scope.txtChanged = function() {
					if (scope.retext.replace(/\s+/g,"") !== '') {
						scope.R.txtInvalid = false;
						if (scope.retext.toString().length > G_VARS.MaxWeiboLength) {
							//no more, remove the last char input
							scope.retext = scope.retext.toString().slice(0, G_VARS.MaxWeiboLength);
							
							//there is a problem of Chinese char input at end of weibo. The code checks for
							//pinyin input instead of Kanji character.
						} else {
							scope.R.chCounter = G_VARS.MaxWeiboLength - scope.retext.toString().length;
						}
					} else {
						scope.R.txtInvalid = true;
						scope.R.chCounter = G_VARS.MaxWeiboLength;
					};
				};

				scope.addReview = function() {
					//prevent duplicated submit
					scope.R.txtInvalid = true;

					var r = new WeiboReview();
					r.body = scope.retext;
					r.timeStamp = new Date().getTime();
					r.parentID = scope.weibo.wbID;
					r.authorID = G_VARS.bid;	//commenting on other's post
					r.author = scope.author;
					
					G_VARS.httpClient.setdata(G_VARS.sid, G_VARS.bid, r, function(reviewKey) {	
						if (scope.weibo.authorID !== G_VARS.bid) {
							//now send a message to the author of the Post reviewed
							r.key = reviewKey;
							msgService.sendReview(r, scope.weibo.authorID);
							
							//debug.log("review message sent, key="+reviewKey);
							scope.weibo.reviews.unshift(reviewKey);
							scope.retext = '';
							scope.currentPage = 1;
							getPage(r);
							scope.$apply();
							updateMyReviewList(reviewKey);
						} else {
							//call this only when reviewing my own post
							scope.weibo.reviews.unshift(reviewKey);
							scope.weibo.update().then(function() {
								debug.log("Review added. key="+ reviewKey);
								scope.retext = '';
								scope.currentPage = 1;
								getPage();
								scope.$apply();
								updateMyReviewList(reviewKey);
							});
						}
					}, function(name, err) {
						debug.error("add review err2=", err);
						scope.R.txtInvalid = false;
					});
				};
				
				var updateMyReviewList = function(reviewKey) {
					var currentDay = parseInt(new Date().getTime()/86400000);
					//now update the global review's keylist
					G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, G_VARS.Reviews, currentDay, function(data) {
						if (data[1] === null)
							data[1] = [reviewKey];
						else
							data[1].unshift(reviewKey);
						G_VARS.httpClient.hset(G_VARS.sid, G_VARS.bid, G_VARS.Reviews, currentDay, data[1], function() {
							debug.log("setReviewData: update review keys OK. "+reviewKey);
						}, function(name, err) {
							debug.error("setReviewData: update review keys failed ", err);
						});
					}, function(name, err) {
						debug.error("setReviewData: get review keys failed ", err);
					});
				};
			}
		}
	}])
	.directive("leSrc", function() {
		debug.log("In directive le-src")
		//Do not use this directive in ng-repeat, might cause problem in race condition.
		return {
			restrict : "A",
			scope : {
				authorid : "@",
				leSrc : "@"
			},
			link : function(scope, element, attrs) {
				scope.$watchGroup(['authorid', 'leSrc'], function(newVal, oldVal) {
					if (newVal[0] && newVal[1])
						loadImg(newVal[0], newVal[1]);
				});

				var loadImg = function(bid, src) {
					if (angular.isUndefined(bid) || bid===null)
						bid = G_VARS.bid;
					G_VARS.httpClient.get(G_VARS.sid, bid, src, function(data) {
						//data[1] is of Uint8Array typed array
						var r = new FileReader();
						r.onloadend = function(e) {
							element[0].src = e.target.result;
							scope.$apply();
						};
						r.readAsDataURL(new Blob([data[1]], {type: 'image/png'}));
					}, function(name, err) {
						debug.error("le-src err=", err);
					});					
				};
				//loadImg(scope.authorid, scope.leSrc);
			}
		};
	})
	.directive("leScript", function() {
		return {
			restrict : "E",
			replace : true,
			scope : {
				src : "@",
				type : "@",
				di : "@"
			},
			link : function(scope, element, attrs) {
				var js = document.createElement("script");
				js.id = "js."+scope.src
				//js.async = "async";
				js.type = scope.type;
				js.textContent = localStorage[G_VARS.bidPath+'js/'+scope.src];
				debug.log(js);
				js.addEventListener("onload", function() {
					//it seems without "src", there is no onload event
					debug.log("js loaded")
				});
				document.getElementsByTagName("body")[0].appendChild(js);
			}
		}
	})
	.directive("leLink", function() {
		function loadCSS(scope) {
			var cs = document.createElement("style");
			cs.id = "css."+scope.href
			cs.rel = scope.rel;
			cs.type = scope.type;
			cs.textContent = localStorage[G_VARS.css[scope.href]];
			debug.log(cs);
			document.getElementsByTagName("head")[0].appendChild(cs);
		};
		return {
			restrict : "E",
			replace : true,
			//template : "<link href='css/addition.css' rel='stylesheet' type='text/css' />",
			scope : {
				href : "@",
				rel : "@",
				type : "@"
			},
			link : function(scope, element, attrs) {
				//debug.log(G_VARS.css[scope.href]);
				if (localStorage[G_VARS.css[scope.href]]===null || typeof(localStorage[G_VARS.css[scope.href]])==='undefined') {
					G_VARS.httpClient.get(G_VARS.sid, G_VARS.dataBid, G_VARS.css[scope.href], function(data) {
						//debug.log(data[1])
						var r = new FileReader();
						r.onload = function(e) {
							localStorage[G_VARS.css[scope.href]] = e.target.result;
							loadCSS(scope);
						};
						r.readAsText(new Blob([data[1]]));
					}, function(name, err) {
						debug.error(err);
					});
				} else {
					//debug.log(localStorage[G_VARS.bidPath+"css."+scope.href]);
					loadCSS(scope);
				};
			}
		};
	})
})();