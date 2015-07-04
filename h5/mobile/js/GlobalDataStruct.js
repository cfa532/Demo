/** GlobalDataStruct.js
 *  definition of global data structures, constructors
 */
"use strict";

var G = {
		IPList :["112.124.113.235:30003","97.74.126.127:4800","218.74.25.10:8100"],		//api for IP lists
		IPNum : 0,
		currentIP : "112.124.113.235:30003",
		leClient : leither.client("112.124.113.235:30003"),
		sid : 'bf3d208cba14c5f7e037b9acd0fc1d2e27a588ed',
		//bid : 'KtXm2MOMx5bKd0qpxjGiWpxwpIO1wCnDRjWlGBG5zI0',
		appBid : 'KtXm2MOMx5bKd0qpxjGiWpxwpIO1wCnDRjWlGBG5zI0',	//from which JS data are read, the APP ID
		appPpt : "L_-LAwEBA1BQVAH_jAABAwECSUQBDAABBFNpZ24BDAABCFZhbGlkaXR5Af-OAAAAEP-NBQEBBFRpbWUB_44AAAAw_4wBK0t0WG0yTU9NeDViS2QwcXB4akdpV3B4d3BJTzF3Q25EUmpXbEdCRzV6STAA",
		leither : '_leither_cloud_js', 	//leither-cloud.js has to be loaded on server
		makefileKey	: "_makefile.json_1.0.10",		//where K-V of js, templates and css code stored
		makefile : null,		//makefile object, store keys for js, css, templates
//appowner
		userid : "%%userid%%",
		userppt : "%%ppt%%",
		inviter : '%%inviter%%',
};

var G = (function(_g) {		//augment global variable G, defined in release.html
	_g.bidPath = window.location.pathname + "/appID/userID/",
	_g.spinner = null, // spinning image while loading
	_g.weiboApp = null, // ["ui.bootstrap", "ui.router"]
	_g.MaxWeiboLength = 140,
	_g.idxDB = null, // handle of indexedDB
	_g.idxDBVersion = 4,
	_g.objStore = {
		picture : "_siyu_picture_store",
		user : "_siyu_user_object_store"
	},
	_g.MaxHeight = 768, // max height and width of pictures uploaded
	_g.MaxWidth = 1024,

	// define global variables used as KEY
	_g.Posts = "_array_of_all_weibo_keys", // keys for all the posts by user, post
										// date is used as Field in hset()
	_g.PostPics = "_pictures_of_all_posts", // SET= [keys]
	_g.Favorites = "_favorite_posts_array", // favorites are stored by user as
											// Post. HSET= Key, bid, key of the
											// favorite post
	_g.UserInfo = "_app_user_information", // user information for weibo app
	_g.Reviews = "_array_of_review_keys", // all of the reviews send by user, post
										// date is used as Field
	_g.Request = "_request_to_become_friends",
	_g.Friends = "_friends_in_weibo_app",
	_g.UnreadSMS = "_tmp_unread_sms_message",
	_g.Version = "_database_version_in_DB", // where database version number is
											// stored
	_g.Upgrade = "_upgrade_file_location",

	// create a shallow copy of an array of objects
	_g.slice = function(src, target, start, end) {
		// clear target array without creating a shadow
		target.length = 0;
		for (var i = start; i < end && i < src.length; i++) {
			target.push(src[i]);
		};
	},
	// search items by weibo ID
	_g.search = function(items, value) {
		for (var i = 0; i < items.length; i++) {
			if (items[i].wbID == value.wbID) {
				return i;
			};
		};
		return -1;
	},
	// resize a photo propotionally
	_g.scaleSize = function(maxW, maxH, currW, currH) {
		var ratio = currH / currW;
		if (currW >= maxW && ratio <= 1) {
			currW = maxW;
			currH = currW * ratio;
		} else if (currH >= maxH) {
			currH = maxH;
			currW = currH / ratio;
		};
		return [ parseInt(currW), parseInt(currH) ];
	};
	return _g;
}(G));

function UIBase() {
	this.bid = null;			// block ID
	this.nickName = null;
	this.intro = null;			//a brief self-introduction
	this.mobile = null;			//cellular number used for verifying user's authenticity
	this.email = null;
	this.location = null;
	this.version = null;		//version number
	this.timeStamp = new Date().getTime();	//last time user data is modified
	this.headPicKey = null;		//head icon of the user
	this.passwd = null;
	this.favoriteCount = 0;
	this.weiboCount = 0;
	this.lastPostKey = null;	//key of last weibo by this user
	this.friends = [];			//Friend array of my friends
	this.oneLiner = "";			//brief self-intro
};

function UserInfo(bid) {
	this.b = new UIBase();		//UIBase object.
	this.nickName = null;
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
	this.lastPost = null;		//a weibo obj
	this.friends = {};			//associate array of my friends {bid : friend's UI}
	this.favorites = {};		//associate array of my favorites {bid : [wbIDs]}
	this.headPicUrl = null;		//dataURI of the head icon
	this.bid = bid;				//system assigned user id

	var self = this;

	//save UI obj into DB
	this.set = function(callback) {
		var t = new UIBase();
		t.bid = self.bid;
		t.nickName = self.nickName;
		t.intro = self.intro;
		t.mobile = self.mobile;
		t.email = self.email;
		t.location = self.location;
		t.version = self.version;
		t.timeStamp = new Date().getTime();	//last time the UI is changed
		t.headPicKey = self.headPicKey;
		t.passwd = self.passwd;
		t.lastPostKey = self.b.lastPostKey;
		t.favoriteCount = self.favoriteCount;
		t.weiboCount = self.weiboCount;
		
		//self.b.friends is maintained by other functions
		//angular.copy(self.b, t);
		for (var i=0; i<self.b.friends.length; i++) {
			var f = new Friend();
			angular.copy(self.b.friends[i], f);
			t.friends.push(f);
		};
		G.leClient.hset(G.sid, G.bid, G.UserInfo, G.bid, t, function() {
			debug.log("UserInfo set", self);
			if (callback) callback();
			
			//save a copy of UserInfo locally
			self.b = t;
			self.setLocalCopy();
		}, function(name, err) {
			debug.warn(err);
		});
	};
	
	this.setLocalCopy = function() {
		var trans = G.idxDB.transaction([G.objStore.user], "readwrite");
		trans.oncomplete = function(e) {
			//debug.log("User db transaction ok");
		};
		trans.onerror = function(e) {
			debug.warn("User db transaction error", self.b);
		};
		var request = trans.objectStore(G.objStore.user).put(self.b);
		request.onerror = function(e) {
			//error will be fired if id is not found
			debug.warn("User db error", self.b);
		};
		request.onsuccess = function(e) {
			//UserInfo saved in local db
			debug.log("user object saved in idxDB", self.b);
		};
	};
	
	//populate UI object with data of given userid (bid)
	this.get = function(callback) {
		if (!self.bid)
			self.bid = G.bid;		//read logon userInfo by default
		
		//save a copy of UserInfo locally
		var trans = G.idxDB.transaction([G.objStore.user], "readonly");
		trans.oncomplete = function(e) {
			//debug.log("User db transaction ok");
		};
		trans.onerror = function(e) {
			debug.warn("User db transaction error", self.id);
		};
		//debug.log(self.bid);
		var request = trans.objectStore(G.objStore.user).get(self.bid);
		request.onerror = function(e) {
			//error will be fired if id is not found
			debug.warn("User db error", self);
		};
		request.onsuccess = function(e) {
			//debug.log("b", e.target.result, self);
			if (e.target.result) {
				//UserInfo is already in local DB
				self.b = e.target.result;
				self.nickName = self.b.nickName;
				self.intro = self.b.intro;
				self.mobile = self.b.mobile;
				self.email = self.b.email;
				self.location = self.b.location;
				self.version = self.b.version;
				self.headPicKey = self.b.headPicKey;
				self.passwd = self.b.passwd;
				self.friendCount = self.b.friends.length;
				
				//debug.log(self);
				new WeiboPicture(self.headPicKey, self.bid).get(1, function(uri) {
					//it is possible a new UI has no pic key
					if (uri)
						self.headPicUrl = uri;
				});

				if (self.bid===G.bid ) {
					//only read login user's weibo count
					self.getFavoriteCount(function(count) {
						self.favoriteCount = count;	
						if (self.favoriteCount !== self.b.favoriteCount) {
							//update
							self.set();
						};
					});
					self.getWeiboCount(function(count) {
						self.weiboCount = count;
						if (self.weiboCount !== self.b.weiboCount) {
							self.set();
						};
					});
					
					//get a hash table of my favorites
					G.leClient.hgetall(G.sid, G.bid, G.Favorites, function(data) {
						//data[i].field is author id of favorites
						//data[i].value is array of wbID by the author
						//debug.info("my favorites", data)
						for(var i=0; i<data.length; i++) {
							self.favorites[data[i].field] = data[i].value;
						}
						callback(true);
					}, function(name, err) {
						debug.warn(err);
					});
					//get deep copy of each friend, asynchronously
					//!!!VERY important to be called here. Init the loading of all friends UserInfo
					self.getFriends();
				} else {
					//reading someone else's UI, read a shallow copy of it
					//self.friends = self.b.friends;
					self.weiboCount = self.b.weiboCount;
					self.favoriteCount = self.b.favoriteCount;
					self.getLastWeibo();
					callback(true);
				};
			} else {
				G.leClient.hget(G.sid, self.bid, G.UserInfo, self.bid, function(data) {
					if (!data[1]) {
						//debug.warn("cannot get user object", self);
						callback(false);
						return;
					};
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
					
					//debug.log(self);
					new WeiboPicture(self.headPicKey, self.bid).get(1, function(uri) {
						//it is possible a new UI has no pic key
						if (uri)
							self.headPicUrl = uri;
					});

					if (self.bid===G.bid ) {
						//only read login user's weibo count
						self.getFavoriteCount(function(count) {
							self.favoriteCount = count;	
							if (self.favoriteCount !== self.b.favoriteCount) {
								//update
								self.set();
							};
						});
						self.getWeiboCount(function(count) {
							self.weiboCount = count;
							if (self.weiboCount !== self.b.weiboCount) {
								self.set();
							};
						});
						
						//get a hash table of my favorites
						G.leClient.hgetall(G.sid, G.bid, G.Favorites, function(data) {
							//data[i].field is author id of favorites
							//data[i].value is array of wbID by the author
							//debug.info("my favorites", data)
							for(var i=0; i<data.length; i++) {
								self.favorites[data[i].field] = data[i].value;
							}
							callback(true);
						}, function(name, err) {
							debug.warn(err);
						});
						//get deep copy of each friend, asynchronously
						//!!!VERY important to be called here. Init the loading of all friends UserInfo
						self.getFriends();
					} else {
						//reading someone else's UI, read a shallow copy of it
						self.weiboCount = self.b.weiboCount;
						self.favoriteCount = self.b.favoriteCount;
						self.getLastWeibo();
						callback(true);
					};
				}, function(name, err) {
					debug.warn(err, self.bid);
				});
			};
		};
	};
	
	//get a full copy of friends UI
	this.getFriends = function() {
		angular.forEach(self.b.friends, function(f) {
			if (!self.friends[f.bid] && f.bid!==G.bid) {
				var ui = new UserInfo(f.bid);
				self.friends[f.bid] = ui;
				ui.get(function(readOK) {
					if (readOK)
						debug.log(ui);
				});
			};
		});
	};
	
	//add a new friend
	this.addFriend = function(ui) {
		if (self.isFriend(ui.bid))
			return;
		self.friends[ui.bid] = ui;
		var f = new Friend();
		f.bid = ui.bid;
		f.type = 1;
		f.group = "default";
		self.b.friends.push(f);
		self.friendCount = self.b.friends.length;
		self.set(function() {
			debug.info("friend added", f);
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
		self.set(function() {
			debug.info("friend deleted", bid);
		});
	};
	
	//get number of weibo by me
	this.getWeiboCount = function(callback) {
		var count = 0;
		G.leClient.hgetall(G.sid, self.b.bid, G.Posts, function(data) {
			if (data) {
				//data[i].field is date in which weibo is posted
				//data[i].value is array of wbID by at the day
				for(var i=0; i<data.length; i++) {
					count += data[i].value.length;
				};
			};
			self.weiboCount = count;
			callback(count);
		}, function(name, err) {
			debug.error(err);
		});
	};

	//get number of my favorites
	this.getFavoriteCount = function(callback) {
		var count = 0;
		G.leClient.hgetall(G.sid, self.b.bid, G.Favorites, function(data) {
			if (data !== null) {
				//data[i].field is author id of favorite post
				//data[i].value is array of wbID by this author
				for(var i=0; i<data.length; i++) {
					count += data[i].value.length;
				};
			};
			self.favoriteCount = count;
			callback(count);
		}, function(name, err) {
			debug.warn(err);
		});
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
			G.leClient.hget(G.sid, G.bid, G.Favorites, wb.authorID, function(keys) {
				if (keys[1]) {
					//remove this wbID from favorite list
					keys[1].splice(keys[1].indexOf(wb.wbID), 1);
					G.leClient.hset(G.sid, G.bid, G.Favorites, wb.authorID, keys[1], function() {
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
			G.leClient.hget(G.sid, G.bid, G.Favorites, wb.authorID, function(keys) {
				if (keys[1]) {
					//add this wbID to favorite list
					keys[1].unshift(wb.wbID);
				} else {
					keys[1] = [wb.wbID];
				};
				G.leClient.hset(G.sid, G.bid, G.Favorites, wb.authorID, keys[1], function() {
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
		if (self.b.lastPostKey) {
			G.leClient.get(G.sid, self.bid, self.b.lastPostKey, function(data) {
				if (data[1]) {
					self.lastPost = data[1];
					debug.info(self.lastPost);
				};
			}, function(name, err) {
				debug.warn(err);
			});
		} else {
			self.lastPost = new WeiboPost();
		};
	};
	
	this.setLastWeibo = function(wb) {
		self.lastPost = wb;
		self.b.lastPostKey = wb.wbID;
		self.set(function() {
			debug.info("last weibo changed", wb)
		});
	}

	this.isFriend = function(bid) {
		if (bid === self.bid)
			return true;	//do not add self as friend
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
	
function WeiboPicture(picID, authorID) {
	this.id = picID;			//key of the image file
	this.dataURI = null;		//dataURI of full image
//	this.thumbnail = null;		//for display list
	this.wbID = null;			//weibo to which this pic belongs to
	this.authorID = authorID;	//owner of the pic file
	if (!authorID) {
		this.authorID = G.bid;
	};
	var self = this;
	
	this.get = function(ratio, callback) {
		//first check if the pic is available locally
		if (!self.id) {			//a null id will cause idxDB.request.get() to throw uncaught error
			callback(null);
			return;
		}
		var trans = G.idxDB.transaction([G.objStore.picture], "readonly");
		trans.oncomplete = function(e) {
			//debug.log("Picture get() transaction ok");
		};
		trans.onerror = function(e) {
			debug.warn("pic get() transaction error", self.id);
		};
		var request = trans.objectStore(G.objStore.picture).get(self.id);
		request.onerror = function(e) {
			//error will be fired if id is not found
			debug.warn("Picture key not found, " + self.id);
		};
		request.onsuccess = function(e) {
			if (e.target.result) {
				self.dataURI = e.target.result.dataURI;
				cropImage(ratio, callback);
			}
			else {
				G.leClient.get(G.sid, self.authorID, self.id, function(data) {
					if (data[1]) {
						var r = new FileReader();
						r.onloadend = function(event) {
							self.dataURI = event.target.result;
							//callback(r.result);
							cropImage(ratio, callback);

							//save the picture in local DB
							var trans = G.idxDB.transaction([G.objStore.picture], "readwrite");
							trans.oncomplete = function(e) {
								//debug.log("Picture set() transaction ok in get()");
							};
							trans.onerror = function(e) {
								debug.warn("pic set() transaction error");
							};
							var wp = {};
							wp.id = self.id;
							wp.dataURI = self.dataURI;
							var request = trans.objectStore(G.objStore.picture).put(wp);
							request.onsuccess = function(e) {
								debug.log("pic save success in get()");
							};
							request.onerror = function(e) {
								debug.warn("save pic error", e);
							};
						};
						r.readAsDataURL(new Blob([data[1]], {type : "image/png"}));
					} else {
						callback(null);
					};
				}, function(name, err) {
					debug.warn("pic not found anywhere " + err);
				});
			};
		};
		
		//ratio is height/width of desired image size
		function cropImage(ratio, callback) {
			if (!ratio || ratio<=0) {
				callback(self.dataURI);
				return;
			};
			var imgWidth, imgHeight, img = new Image();
			img.onload = function(e) {
				//var ratio = dimH / dimW;
				if (img.height/img.width < ratio) {			//image is more horizontal, use height to get proper width
					imgHeight = img.height;
					imgWidth = imgHeight / ratio;
				} else {
					imgWidth = img.width;
					imgHeight = imgWidth * ratio;
				};
				var tmpCanvas = document.createElement("canvas");
				tmpCanvas.width = imgWidth, tmpCanvas.height = imgHeight;
				var sx = parseInt((img.width-imgWidth)/2), sy = parseInt((img.height-imgHeight)/2);
				if (img.height > img.width)
					sy = 0;
				//debug.log(img.height, img.width, imgHeight, imgWidth, sx, sy);
				tmpCanvas.getContext("2d").drawImage(img, sx, sy, imgWidth, imgHeight, 0, 0, imgWidth, imgHeight);
				//debug.log(tmpCanvas.toDataURL());
				callback(tmpCanvas.toDataURL());
			};
			img.src = self.dataURI;
		};
	};
	
	//save the image in both LeitherOS and indexedDB
	//img is an ArrayBuffer
	this.set = function(dataURL, callback) {
		self.dataURI = dataURL;
		var img = new Image();
		img.onload = function(e) {
			var maxWidth = 512, maxHeight = 384;
			if (maxWidth*maxHeight < img.width*img.height) {
				//scale large image and return new size under system limits
				var newSize;
				if (img.width > img.height)
					newSize = G.scaleSize(maxWidth, maxHeight, img.width, img.height);		//horizontal image
				else
					newSize = G.scaleSize(maxHeight, maxWidth, img.width, img.height);		//vertical image
				debug.info(self.dataURI, newSize, img.width, img.height);				
				//crop it to propotionally
				var tmpCanvas = document.createElement("canvas");
				tmpCanvas.width = newSize[0], tmpCanvas.height = newSize[1];	//largest possible image size
				tmpCanvas.getContext("2d").drawImage(img, 0, 0, img.width, img.height, 0, 0, newSize[0], newSize[1]);
				self.dataURI = tmpCanvas.toDataURL();
			};
			
			//save the pic as binary array on Leither to save bandwidth
			G.leClient.setdata(G.sid, G.bid, dataURLToBlob(self.dataURI), function(picKey) {
				//now we have a scaled down picture, save it
				debug.log("pic key=" + picKey);
				self.id = picKey;
				
				var trans = G.idxDB.transaction([G.objStore.picture], "readwrite");
				trans.oncomplete = function(e) {
					//debug.log("Picture set() transaction ok");
				};
				trans.onerror = function(e) {
					debug.warn("pic set() transaction error");
				};
				var wp = {};
				wp.id = self.id;
				wp.dataURI = self.dataURI;
				var request = trans.objectStore(G.objStore.picture).put(wp);
				request.onsuccess = function(e) {
					debug.log("pic save success");
					callback(true);
				};
				request.onerror = function(e) {
					debug.warn("save pic error", e);
				};
			}, function(name, err) {
				debug.warn(err);
				callback(false);
			});
		};
		img.src = dataURL;
	};

	function dataURLToBlob(dataURL) {
		var BASE64_MARKER = ';base64,';
		if (dataURL.indexOf(BASE64_MARKER) === -1) {
			var parts = dataURL.split(',');
			var contentType = parts[0].split(':')[1];
			var raw = decodeURIComponent(parts[1]);
			return new Blob([ raw ], {type : contentType});
		};
		var parts = dataURL.split(BASE64_MARKER);
		var contentType = parts[0].split(':')[1];
		var raw = window.atob(parts[1]);
		var rawLength = raw.length;
		var uInt8Array = new Uint8Array(rawLength);

		for (var i = 0; i < rawLength; ++i) {
			uInt8Array[i] = raw.charCodeAt(i);
		}
		//debug.info(uInt8Array);
		//return new Blob([uInt8Array], {type : contentType});
		return uInt8Array;		//return binary data of the pic
	};
}

// scope where post is displayed
function WeiboPost(wbID, authorID, scope)
{
	this.authorID = authorID;	//if null, use login user ID
	this.wbID = wbID;
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
	this.videos = [];			//key list of videos
	this.parentWeibo = null;
	this.isFavorite = false;
	this.original = null;
	this.scope = scope;
	var self = this;
	
	//update weibo record with new data, when new reviews are added
	this.update = function(callback) {
		var wb = new WBase();
		wb.authorID = G.bid;				//if null, use login user ID
		wb.parentID = self.parentID;		//the post reviewed by this post, if any
		wb.parentAuthorID = self.parentAuthorID;	//author of the parent post
		wb.body = self.body;				//text of the post
		wb.tags = self.tags;				//array of tags
		wb.timeStamp = self.timeStamp;
		wb.reviews = self.reviews;			//array of reviews to the Post
		wb.relays = self.relays;			//array of relays of the post
		wb.rating = self.rating;			//number of Praise
		wb.author = self.author;			//author's nick name
		wb.videos = self.videos;			//key list of videos
		wb.pictures = [];
		if (self.pictures && self.pictures.length>0) {
			for(var i=0; i<self.pictures.length; i++) {
				wb.pictures.push(self.pictures[i].id);
			};
		};
		G.leClient.set(G.sid, G.bid, self.wbID, wb, function() {
			debug.info("update weibo ok");
			callback();
		}, function(name, err) {
			debug.warn(err);
		});
	};

	this.get = function(original, callback) {
		if (!authorID)
			authorID = G.bid;		//default to current user bid
		//debug.log(self);
		G.leClient.get(G.sid, self.authorID, self.wbID, function(data) {
			if (!data[1]) {
				debug.warn("no weibo data, bid="+self.authorID+" wbID="+self.wbID);
				callback(false);
				return;
			};
			self.parentID = data[1].parentID;		//the post reviewed by self post, if any
			if (self.parentID) {
				//there is a parent weibo
				self.original = false;
			} else {
				self.original = true;
			};
			self.parentAuthorID = data[1].parentAuthorID;	//author of the parent post
			self.body = data[1].body;				//text of the post
			self.tags = data[1].tags;				//array of tags
			self.timeStamp = data[1].timeStamp;
			self.reviews = data[1].reviews;			//array of reviews to the Post
			self.relays = data[1].relays;			//array of relays of the post
			self.rating = data[1].rating;			//number of Praise
			self.author = data[1].author;			//author's nick name
			//self.pictures = data[1].pictures;		//key list of pictures
			self.videos = data[1].videos;			//key list of videos;
			self.isFavorite = false;
			self.pictures = [];
			
			//looking for original post
			if (original) {
				if (self.original) {
					callback(true);
				};
			} else {
				if (!self.original) {
					//there is a parent weibo, load it.
					//Notice: make sure only to read one direct parent weibo
					//a weibo that can be a parentWeibo must be original itself
					var pw = new WeiboPost(self.parentID, self.parentAuthorID, self.scope);
					pw.get(original, function(readOK) {
						if (readOK) {
							self.parentWeibo = pw;
						} else {
							self.parentWeibo = null;	//original post is deleted, show it on webpage
						};
					});
				}
				callback(true);
			};

			angular.forEach(data[1].pictures, function(picID) {
				var wp = new WeiboPicture(picID, self.authorID);
				wp.get(1 /*ratio*/, function(uri) {
					wp.dataURI = uri;
					self.pictures.push(wp);
					if (self.scope) self.scope.$apply();	//show the pic right away
				});
			});
		}, function(name, err) {
			debug.warn(err);
		});
	};
	
	this.del = function(callback) {
		if (self.authorID !== G.bid)
			return;	//only delete one's own post
		
		//remove the post from key list of weibos for the day
		var wbDay = parseInt(self.timeStamp/86400000);
		G.leClient.hget(G.sid, G.bid, G.Posts, wbDay, function(keylist) {
			if (keylist[1]) {
				//remove wbID from Posts keylist
				debug.log("keys before del() ", keylist[1], self.wbID);
				keylist[1].splice(keylist[1].indexOf(self.wbID), 1);
				if (keylist[1].length === 0) {
					//remove the whole list
					G.leClient.hdel(G.sid, G.bid, G.Posts, wbDay, function() {
						callback();
					}, function(name, err) {
						debug.warn("keylist cannot be removed", err);
					});
				} else {
					// weibo is indexed by the day of its posting. Update keylist
					G.leClient.hset(G.sid, G.bid, G.Posts, wbDay, keylist[1], function() {
						callback();
					}, function(name, err) {
						debug.warn(err);
					});
				};
			};
		}, function(name, err) {
			debug.warn(err);
		});
		
		//update PostPics if this weibo has picture
		if (self.pictures.length > 0) {
			G.leClient.hget(G.sid, G.bid, G.PostPics, wbDay, function(wbKeys) {
				if (wbKeys[1]) {
					//remove wbID from Posts keylist
					wbKeys[1].splice(wbKeys[1].indexOf(self.wbID), 1);					
					if (wbKeys[1].length === 0) {
						//remove the whole list
						G.leClient.hdel(G.sid, G.bid, G.PostPics, wbDay, function() {
							debug.log("keylist of post removed", wbKeys[1]);
						}, function(name, err) {
							debug.warn("keylist cannot be removed", err);
						});
					} else {
						// weibo is indexed by the day of its posting. Update keylist
						G.leClient.hset(G.sid, G.bid, G.PostPics, wbDay, wbKeys[1], function() {
							debug.log("PostPics removed", wbKeys[1]);
						}, function(name, err) {
							debug.error(err);
						});
					};
				};
			}, function(name, err) {
				debug.warn(err);
			});
		};
		
		if (self.isFavorite) {
			G.leClient.hget(G.sid, G.bid, G.Favorites, self.authorID, function(keys) {
				if (keys[1]) {
					//remove this wbID from favorite list
					keys[1].splice(keys[1].indexOf(self.wbID), 1);
					if (keys[1].length) {
						G.leClient.hset(G.sid, G.bid, G.Favorites, self.authorID, keys[1], function() {
							debug.log("a favorite removed for author", self);
						}, function(name, err) {
							debug.warn("Remove favorite err=" +err);
						});
					} else {
						G.leClient.hdel(G.sid, G.bid, G.Favorites, self.authorID, function() {
							debug.log("favorites removed for authorID="+self.authorID);
						}, function(name, err) {
							debug.warn("Remove favorite failed", err);
						});
					}
				};
			}, function(name, err) {
				debug.warn("Remove favorite err=" +err);
			});
		};
		
		//delete weibo object from LeitherOS
		G.leClient.del(G.sid, G.bid, self.wbID, function() {
			debug.info("Weibo deleted", self);
		}, function(name, err) {
			debug.warn(err);
		});
	};
	
	//save weibo object to LeitherOS
	this.set = function(callback) {
		var wb = new WBase();
		wb.authorID = G.bid;			//if null, use login user ID
		wb.parentID = self.parentID;		//the post reviewed by this post, if any
		wb.parentAuthorID = self.parentAuthorID;	//author of the parent post
		wb.body = self.body;				//text of the post
		wb.tags = self.tags;				//array of tags
		wb.timeStamp = self.timeStamp;
		wb.reviews = self.reviews;			//array of reviews to the Post
		wb.relays = self.relays;			//array of relays of the post
		wb.rating = self.rating;			//number of Praise
		wb.author = self.author;			//author's nick name
		wb.pictures = [];					//array of picture keys
		for (var i=0; i<self.pictures.length; i++) {
			wb.pictures.push(self.pictures[i].id);
		}
		wb.videos = self.videos;			//key list of videos
		var wbDay = parseInt(self.timeStamp/86400000);
		
		G.leClient.setdata(G.sid, G.bid, wb, function(wbKey) {
			self.wbID = wbKey;
			//add new Key to Weibo list, always add newest post to the front(left)
			G.leClient.hget(G.sid, G.bid, G.Posts, wbDay, function(keylist) {
				if (keylist[1]) {
					if (keylist[1].indexOf(wbKey) === -1)
						keylist[1].unshift(wbKey);	//add new key to the beginning of keylist
				} else {
					keylist[1] = [wbKey];
				}
				// weibo is indexed by the Day of posting.
				G.leClient.hset(G.sid, G.bid, G.Posts, wbDay, keylist[1], function() {
					callback();
				}, function(name, err) {
					debug.error(err);
				});
			}, function(name, err) {
				debug.error(err);
			});
		}, function(name, err) {
			debug.error(err);
		});
		
		//if there is pic in weibo, add it to PostPics list
		if (self.pictures.length > 0) {
			G.leClient.hget(G.sid, G.bid, G.PostPics, wbDay, function(keylist) {
				if (keylist[1] && keylist[1].length>0) {
					//add wbID to PostPics keylist
					if (keylist[1].indexOf(self.wbID) === -1)
						keylist[1].push(self.wbID);
				} else {
					keylist[1] = [self.wbID];
				};
				// weibo is indexed by the day of its posting. Update keylist
				G.leClient.hset(G.sid, G.bid, G.PostPics, wbDay, keylist[1], function() {
					debug.log("PostPics added", keylist[1]);
				}, function(name, err) {
					debug.error(err);
				});
			}, function(name, err) {
				debug.warn(err);
			});
		};
	};
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
};

//general message struct for all SMS message type
function WeiboMessage()
{
	this.bid = null			//bid of the sender/author
	this.type = null;		//0: request to add as friend, 1: instant message, 2: reviews, 3: relays
	this.contentType = 0;	//0: text, 1: pic, 2: file, 3: video
	this.content = null;	//type=0: request to be added, type=1: instant message, type=2: reviews msg, type=3: relays msg
	this.timeStamp = null;	//time message received or sent
};

//system message struct, a partial view
function Message() {
	this.from = null;
	this.to = null;
	this.msg = null;
	this.data = null;		//body of the message, required
};
