/** GlobalDataStruct.js
 *  definition of global data structures, constructors
 */
"use strict";

function UIBase() {
	this.bid = null;			//block ID
	this.nickName = "author nick name";
	this.intro = null;		//a brief self-introduction
	this.mobile = null;		//cellular number used for verifying user's authenticity
	this.email = null;
	this.location = null;
	this.version = null;		//version number
	this.timeStamp = new Date().getTime();	//last time user data is modified
	this.headPicKey = null;		//head icon of the user
	this.passwd = null;
	this.favoriteCount = 0;
	this.weiboCount = 0;
	this.lastPostKey = null;		//key of last weibo by this user
	this.friends = [];			//Friend array of my friends
};

function UserInfo() {
	this.b = new UIBase();		//UIBase object.
	this.nickName = "author nick name";
	this.intro = null;		//a brief self-introduction
	this.mobile = null;		//cellular number used for verifying user's authenticity
	this.email = null;
	this.location = null;
	this.version = null;		//version number
	this.headPicKey = null;		//head icon of the user
	this.passwd = null;
	this.favoriteCount = 0;
	this.weiboCount = 0;
	this.friendCount = 0;
	this.headPicUrl = null;
	this.lastPost = null;		//a weibo obj
	this.friends = {};			//associate array of my friends
	this.favorites = {};		//associate array of my favorites {bid : [wbIDs]}

	var self = this;
	var q = angular.injector(['ng']).get('$q');

	//save UI obj into DB
	this.set = function() {
		return q(function(resolve, reject) {
			self.b.bid = self.bid;
			self.b.nickName = self.nickName;
			self.b.intro = self.intro;
			self.b.mobile = self.mobile;
			self.b.email = self.email;
			self.b.location = self.location;
			self.b.version = self.version;
			self.b.timeStamp = new Date().getTime();	//last time the UI is changed
			self.b.headPicKey = self.headPicKey;
			self.b.passwd = self.passwd;
			self.b.favoriteCount = self.favoriteCount;
			self.b.weiboCount = self.weiboCount;
			//self.b.friends is maintained by other functions
			
			var t = new UIBase();
			angular.copy(self.b, t);
			t.friends.length = 0;
			for (var i=0; i<self.b.friends.length; i++) {
				var f = new Friend();
				angular.copy(self.b.friends[i], f);
				t.friends.push(f);
			};
			G_VARS.httpClient.hset(G_VARS.sid, G_VARS.bid, G_VARS.UserInfo, G_VARS.bid, t, function() {
				debug.log("UserInfo set ok");
				resolve();
			}, function(name, err) {
				reject(err);
			});
		});			
	};
	
	//populate UI object with data of given userid (bid)
	this.get = function(bid) {
		self.bid = bid;
		return q(function(resolve, reject) {
			G_VARS.httpClient.hget(G_VARS.sid, bid, G_VARS.UserInfo, bid, function(data) {
				if (data[1]) {
					angular.copy(data[1], self.b);
					self.nickName = self.b.nickName;
					self.intro = self.b.intro;
					self.mobile = self.b.mobile;
					self.email = self.b.email;
					self.location = self.b.location;
					self.version = self.b.version;
					self.headPicKey = self.b.headPicKey;
					self.passwd = self.b.passwd;
					self.friendCount = self.b.friends.length;

					if (bid === G_VARS.bid) {
						//only read login user's weibo count
						self.getFavoriteCount().then(function(count) {
							self.favoriteCount = count;	
							if (self.favoriteCount !== self.b.favoriteCount) {
								//update
								self.set();
							};
						}, function(reason) {
							debug.error(reason);
						});
						
						self.getWeiboCount().then(function(count) {
							self.weiboCount = count;
							if (self.weiboCount !== self.b.weiboCount) {
								self.set();
							};
						}, function(reason) {
							debug.error(reason);
						});
						//get deep copy of each friend, asynchronously
						//!!!VERY important to be called here. Init the loading of all friends UserInfo
						self.getFriends();
						
						G_VARS.httpClient.hkeys(G_VARS.sid, G_VARS.bid, G_VARS.Favorites, function(data) {
							//data[i].field is author id of favorites
							//data[i].value is array of wbID by the author
							if (data.length > 0) {
								var ds = [];
								angular.forEach(data, function(bid) {
									ds.push(q(function(resolve, reject) {
										G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, G_VARS.Favorites, bid, function(wbKeys) {
											self.favorites[bid] = wbKeys[1];
											resolve();
										}, function(name, err) {
											reject();
										});
									}));
								});
								q.all(ds).then(function() {
									resolve(true);
								}, function(reason) {
									reject(reason);
								});
							} else {
								resolve(true);		//no favorites, do nothing
							};
						}, function(name, err) {
							reject(err);
						});
					} else {
						//reading someone else's UI, read a shallow copy
						//self.friends = self.b.friends;
						self.weiboCount = self.b.weiboCount;
						self.favoriteCount = self.b.favoriteCount;
						//self.getLastWeibo();
						resolve(true);
					};
					
					//read user's head photo into Data URL format
					var hp = "data:image/jpeg;base64,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";
					if (self.headPicKey===null) {
						self.headPicUrl = hp;
						//resolve(true);
					} else {
						G_VARS.httpClient.get(G_VARS.sid, self.bid, self.headPicKey, function(data) {
							var r = new FileReader();
							r.onloadend = function(e) {
								if (e.target.result==="data:image/png;base64,bnVsbA==")
									self.headPicUrl = hp;
								else
									self.headPicUrl = e.target.result;
								//resolve(true);
							};
							r.readAsDataURL(new Blob([data[1]], {type: 'image/png'}));
						}, function(name, err) {
							//reject(err);
						});
					};
				} else {
					//data[1] is null, no data to be read
					resolve(false);
					//reject("no UI data for ", bid)
				};
			}, function(name, err) {
				reject(err);
			});
		});
	};
	
	//return all pictures each time this is called
	this.getPictures = function(scope) {
		var df = q.defer();
		var picList = [];
		G_VARS.httpClient.hgetall(G_VARS.sid, self.bid, G_VARS.PostPics, function(data) {
			if (data) {
				//data[i].field is date in which picture is posted
				//data[i].value is array of wbID by at the day
				data.sort(function(a,b) {return b.field-a.field});
				for(var i=0; i<data.length; i++) {
					picList = picList.concat(data[i].value);
				};
				if (picList.length > 6) picList.length=6;
				df.resolve(picList);
			};
		}, function(name, err) {
			df.reject(err);
		});
		return df.promise;
	};
	
	//get a full copy of friends UI
	this.getFriends = function(scope) {
		angular.forEach(self.b.friends, function(f) {
			if (!self.friends[f.bid]) {
				var ui = new UserInfo();
				self.friends[f.bid] = ui;
				ui.get(f.bid).then(function(readOK) {
					if (readOK) {
						debug.log(ui);
						if (scope) scope.$apply();
					} else {
						debug.error("Friend UI not exist ", ui);
					};
				}, function(reason) {
					debug.error(reason);
				});
			};
		});
	};
	
	//add a new friend
	this.addFriend = function(ui) {
		if (self.isFriend(ui.bid)) return;
		self.friends[ui.bid] = ui;
		var f = new Friend();
		f.bid = ui.bid;
		f.type = 1;
		f.group = "default";
		self.b.friends.push(f);
		self.friendCount = self.b.friends.length;
		self.set().then(function() {
			debug.info("friend added", f);
		}, function(reason) {
			debug.error(reason);
		});
	};
	
	//delete a friend
	this.delFriend = function(bid) {
		delete self.friends[bid];
		for (var i=0; i<self.b.friends.length; i++) {
			if (self.b.friends[i].bid === bid) {
				self.b.friends.splice(i, 1);
				self.friendCount = self.b.friends.length;;
				break;
			};
		};
		self.set().then(function() {
			debug.info("friend deleted", bid);
		}, function(reason) {
			debug.error(reason);
		});
	};
	
	//get number of weibo by me
	this.getWeiboCount = function() {
		var df = q.defer();
		var count = 0;
		G_VARS.httpClient.hgetall(G_VARS.sid, self.b.bid, G_VARS.Posts, function(data) {
			if (data) {
				//data[i].field is date in which weibo is posted
				//data[i].value is array of wbID by at the day
				for(var i=0; i<data.length; i++) {
					count += data[i].value.length;
				};
			};
			self.weiboCount = count;
			df.resolve(count);
		}, function(name, err) {
			debug.error(err);
			df.reject(err);
		});
		return df.promise;
	};

	//get number of my favorites
	this.getFavoriteCount = function() {
		var df = q.defer();
		var count = 0;
		G_VARS.httpClient.hgetall(G_VARS.sid, self.b.bid, G_VARS.Favorites, function(data) {
			if (data !== null) {
				//data[i].field is author id of favorites
				//data[i].value is array of wbID by a certain author
				for(var i=0; i<data.length; i++) {
					count += data[i].value.length;
				};
			};
			self.favoriteCount = count;
			df.resolve(count);
		}, function(name, err) {
			debug.error(err);
			df.reject(err);
		});
		return df.promise;
	};
	
	//check if this weibo is a favorite of this user
	this.checkFavorite = function(wb) {
		if (self.favorites[wb.authorID] && self.favorites[wb.authorID].indexOf(wb.wbID) !== -1) {
			wb.isFavorite = true;
		};
	};
	
	this.toggleFavorite = function(wb) {
		if (wb.isFavorite) {
			//remove favorite
			wb.isFavorite = false;
			self.favoriteCount--;
			G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, G_VARS.Favorites, wb.authorID, function(keys) {
				if (keys[1]) {
					//remove this wbID from favorite list
					keys[1].splice(keys[1].indexOf(wb.wbID), 1);
					G_VARS.httpClient.hset(G_VARS.sid, G_VARS.bid, G_VARS.Favorites, wb.authorID, keys[1], function() {
						debug.info("favorite removed", wb);
					}, function(name, err) {
						debug.error("Remove favorite err=" +err);
					});
					
					//update in memory hashtable
					if (self.favorites[wb.authorID].length > 1) {
						// more than one favorites from this author
						self.favorites[wb.authorID].splice(self.favorites[wb.authorID].indexOf(wb.wbID), 1);
					} else {
						delete self.favorites[wb.authorID];
					};
				};
			}, function(name, err) {
				debug.error("Remove favorite err=" +err);
			});
		} else {
			//add favorite
			wb.isFavorite = true;
			self.favoriteCount++;
			G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, G_VARS.Favorites, wb.authorID, function(keys) {
				if (keys[1]) {
					//add this wbID to favorite list
					keys[1].unshift(wb.wbID);
				} else {
					keys[1] = [wb.wbID];
				};
				G_VARS.httpClient.hset(G_VARS.sid, G_VARS.bid, G_VARS.Favorites, wb.authorID, keys[1], function() {
					debug.info("favorite added", wb);
				}, function(name, err) {
					debug.error("Add favorite err=" +err);
				});
				
				if (!self.favorites[wb.authorID]) {
					self.favorites[wb.authorID] = [wb.wbID];
				} else {
					self.favorites[wb.authorID].push(wb.wbID);
				};
			}, function(name, err) {
				debug.error("Add favorite err=" +err);
			});
		};
		self.set();
	};
	
	this.getLastWeibo = function() {
		//read the latest weibo of this user
		var df = q.defer();
		G_VARS.httpClient.get(G_VARS.sid, self.bid, self.b.lastPostKey, function(data) {
			if (data[1]) {
				self.lastPost = data[1];
			} else {
				self.lastPost = new WeiboPost();
			};
			debug.info(self.lastPost);
			df.resolve(self.lastPost);
		}, function(name, err) {
			df.reject(err);
		});
		return df.promise;
	};
	
	this.setLastWeibo = function(wb) {
		self.lastPost = wb;
		self.b.lastPostKey = wb.wbID;
		self.set();
	}

	this.isFriend = function(bid) {
		for (var i=0; i<self.b.friends.length; i++) {
			if (bid === self.b.friends[i].bid)
				return true;
		};
		return false;
	};
};

function ChatSession() {
	this.bid = null;		//bid of the friend I am talking to
	this.timeStamp = null;	//last time we have chatted.
	this.messages = [];		//message chains loaded from db, and messages of ongoing chat
};

//data struct for save friends data in DB
function Friend() {
	this.bid = null;
	this.type = 1;		//1: friend, 0: not friend, -1: blacklist
	this.group = 'default';
};
	
//Data structure of Weibo post information
function WBase() {
	this.parentID = null;		//the post reviewed by this post, if any
	this.parentAuthorID = null;	//author of the parent post
	this.body = '';				//text of the post
	this.tags = [];				//array of tags
	this.timeStamp = null;
	this.reviews = [];			//array of reviews to the Post
	this.relays = [];			//array of relays of the post
	this.rating = 0;			//number of Praise
	this.author = null;			//author's nick name
	this.authorID = null;		//if null, use login user ID
	this.pictures = [];			//key list of pictures
	this.videos = [];			//key list of videos
};

function WeiboPicture() {
	this.id = null;				//key of the image file
	//this.dataURI = null;		//dataURI of full image, for display only
	//this.wbID = null;			//weibo this pic belongs to
	this.thumbnail = null;		//dataURI of thumbnail, for both storage and display
}

//scope where post is displayed
function WeiboPost(scope)
{
	this.authorID = null;		//if null, use login user ID
	this.wbID = null;
	this.author = null;			//author's nick name
	this.parentID = null;		//the post reviewed by this post, if any
	this.parentAuthorID = null;	//author of the parent post
	this.body = '';				//text of the post
	this.tags = [];				//array of tags
	this.timeStamp = null;
	this.reviews = [];			//array of reviews to the Post
	this.relays = [];			//array of relays of the post
	this.rating = 0;			//number of Praise
	this.pictures = [];			//key list of pictures
	this.picUrls = [];			//data URL of each picture
	this.videos = [];			//key list of videos
	this.parentWeibo = [];
	this.isFavorite = false;
	var self = this;
	var q = angular.injector(['ng']).get('$q');
	
	this.update = function() {
		//update weibo record with new data
		return q(function(resolve, reject) {
			var wb = new WBase();
			wb.authorID = G_VARS.bid;		//if null, use login user ID
			wb.parentID = self.parentID;		//the post reviewed by this post, if any
			wb.parentAuthorID = self.parentAuthorID;	//author of the parent post
			wb.body = self.body;				//text of the post
			wb.tags = self.tags;				//array of tags
			wb.timeStamp = self.timeStamp;
			wb.reviews = self.reviews;			//array of reviews to the Post
			wb.relays = self.relays;			//array of relays of the post
			wb.rating = self.rating;			//number of Praise
			wb.author = self.author;			//author's nick name
			wb.pictures = self.pictures;		//key list of pictures
			wb.videos = self.videos;			//key list of videos
			
			G_VARS.httpClient.set(G_VARS.sid, G_VARS.bid, self.wbID, wb, function() {
				debug.info("update weibo ok");
				resolve();
			}, function(name, err) {
				debug.error(err);
				reject();
			});
		});
	};

	this.get = function(authorID, key, original) {
		return q(function(resolve, reject) {
			G_VARS.httpClient.get(G_VARS.sid, authorID, key, function(data) {
				if (!data[1]) {
					debug.warn("no weibo data, bid="+authorID+" wbID="+key);
					resolve(false);
					return;
				};
				self.authorID = authorID;				//if null, use login user ID
				self.wbID = key;
				self.parentID = data[1].parentID;		//the post reviewed by self post, if any
				self.parentAuthorID = data[1].parentAuthorID;	//author of the parent post
				self.body = data[1].body;				//text of the post
				self.tags = data[1].tags;				//array of tags
				self.timeStamp = data[1].timeStamp;
				self.reviews = data[1].reviews;			//array of reviews to the Post
				self.relays = data[1].relays;			//array of relays of the post
				self.rating = data[1].rating;			//number of Praise
				self.author = data[1].author;			//author's nick name
				self.pictures = data[1].pictures;		//key list of pictures
				self.videos = data[1].videos;			//key list of videos;
				self.picUrls = [];						//images' DataURI arrays, for display
				self.isFavorite = false;
				
				//if (authorID==='n1VYjWmCIYM0tmRsshgKZZ3ECzTZuJQ_4enJptTJRjU')
				//	debug.info("wb.body=" + self.body);
				//load attached pictures async
/*
				var imgholder = "data:image/png;base64,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";
				for (var i=0; i<self.pictures.length; i++) {
					self.picUrls.push(imgholder);
					G_VARS.httpClient.get(G_VARS.sid, authorID, self.pictures[i].id, function(imgData) {
						var r = new FileReader();
						r.onloadend = function(e) {
							self.picUrls.unshift(e.target.result);
							self.picUrls.pop();
							if (scope) scope.$apply();
							
							$(".img-group").colorbox({rel:'img-group'+self.wbID});
							$(".inline").colorbox({inline:true, width:"50%"});
							$("#click").click(function(){ 
								$('#click').css({"background-color":"#f00", "color":"#fff", "cursor":"inherit"}).text("Open this window again and this message will still be here.");
								return false;
							});
						};
						r.readAsDataURL(new Blob([imgData[1]], {type: 'image/png'}));
					});
				};
*/
				if (self.parentID !== null) {
					if (original === true) {
						//only look for original post, return a false
						resolve(false);
						return;
					};
					//there is a parent weibo, load it.
					//Notice: make sure only to read one direct parent weibo
					//a weibo that can be a parentWeibo must be original itself
					var pw = new WeiboPost(scope);
					pw.get(self.parentAuthorID, self.parentID).then(function(readOK) {
						if (readOK) {
							self.parentWeibo = pw;
						} else {
							self.parentWeibo = null;
						};
					}, function(reason) {
						debug.error(reason);
					});
				};
				resolve(true);
			}, function(name, err) {
				debug.error(err, self);
				reject(err);
			});
		});
	};
	
	this.set = function() {
		return q(function(resolve, reject) {
			var wb = new WBase();
			wb.authorID = G_VARS.bid;		//if null, use login user ID
			wb.parentID = self.parentID;		//the post reviewed by this post, if any
			wb.parentAuthorID = self.parentAuthorID;	//author of the parent post
			wb.body = self.body;				//text of the post
			wb.tags = self.tags;				//array of tags
			wb.timeStamp = self.timeStamp;
			wb.reviews = self.reviews;			//array of reviews to the Post
			wb.relays = self.relays;			//array of relays of the post
			wb.rating = self.rating;			//number of Praise
			wb.author = self.author;			//author's nick name
			wb.pictures = [];					//array of WeiboPicture objects
			for (var i=0; i<self.pictures.length; i++) {
				var t = new WeiboPicture();
				t.id = self.pictures[i].id;
				t.thumbnail = self.pictures[i].thumbnail;
				wb.pictures.push(t);
			}
			wb.videos = self.videos;			//key list of videos
			
			G_VARS.httpClient.setdata(G_VARS.sid, G_VARS.bid, wb, function(wbKey) {
				self.wbID = wbKey;
				
				//add new Key to Weibo list, always add newest post to the front(left)
				var wbDay = parseInt(new Date().getTime()/86400000);
				G_VARS.httpClient.hget(G_VARS.sid, G_VARS.bid, G_VARS.Posts, wbDay, function(keylist) {
					if (keylist[1] === null) {
						keylist[1] = [wbKey];
					} else {
						keylist[1].unshift(wbKey);	//add new key to the beginning of keylist
					}
					// weibo is indexed by the Day of posting.
					G_VARS.httpClient.hset(G_VARS.sid, G_VARS.bid, G_VARS.Posts, wbDay, keylist[1], function() {
						resolve();
					}, function(name, err) {
						debug.error(err);
						reject(err);
					});
				}, function(name, err) {
					debug.error(err);
					reject(err);
				});
			}, function(name, err) {
				debug.error(err);
				reject(err);
			});
		});
	};
};

function WeiboReview()
{
	this.authorID = null;		//userID who write this post. May not be the same as this user,
								//because review submitted by others is treated as user's data
	this.author = null;			//author's nick name
	this.body = '';				//text of the post
	this.timeStamp = null;
	this.rating = 0;
	this.parentID = null;		//ID of the post reviewed
	this.key = null;			//exit only when sent as a message
}

//general message struct for all SMS message type
function WeiboMessage()
{
	this.bid = null			//bid of the sender
	this.type = null;		//0: request to add as friend, 1: instant message, 2: reviews, 3: relays
	this.contentType = 0;	//0: text, 1: pic, 2: voice, 3: video
	this.content = null;	//type=0: request to be added, type=1: instant message, type=2: reviews msg, type=3: relays msg
	this.timeStamp = null;	//time message received or sent
	this.viewed = null;		//type=0: null--not processed, 0--reject, 1--accepted; type=1: 0--not viewed, 1: viewed
};

//system message struct, a partial view
function Message() {
	this.from = null;
	this.to = null;
	this.msg = null;
	this.data = null;		//body of the message, required
};
