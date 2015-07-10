//pub.js
//Usage: >node --harmony-proxies pub.js
"use strict";
var prom = require("promise");
var hp = require("hprose");
var hosturl = "112.124.113.235:30003";
//hosturl ="4bao.vicp.net:4802";
var client = new HproseHttpClient("http://" + hosturl + "/webapi/",
		["login","register", "getvar", "begin", "commit", "rollback", "setdata", "set", "get", "hset", "hget","hlen","hkeys",
		 "hgetall", "hmset","hmget","exit", "lpush", "lpop", "rpush", "rpop", "lrange", "zadd", "zrange",
		 "sendmsg", "readmsg", "invite", "accept", "test", "veni", "sethostip","proxyget"])
var proxy = client.useService();
var fs = require('fs');
var bid = "SyQirXjTVnJHCkG4SWsSw6Pnq3eeB86jCUF2MxVy2Jo";	//app bid
//bid = "lrOXcQpnLuiINnMbJ7SNHmoCislHjjsoaRCFJVNYFY4";	//97
var sid = "db08010ff3c83b9d91846da2aa7dc308d1097a74";
var version = "release";	//for release version
//version = "1.0.10";			//for testing purpose
var ps = [];				//queue to hold all the promises

function loadFile(o) {
	return new Promise(function(resolve, reject) {
		fs.readFile(o.fileKey, null, function(err, text) {
			if (err) throw(err);
			//console.log(sid, bid, text);
			proxy.setdata(sid, bid, text, function(key) {
				console.log(o.fileKey, key);
				o.fileKey = key;
				resolve(key);
			}, function(name, err) {
				console.error(err);
				reject();
			});
		});
	});
};

fs.readFile("makefile.json", null, function(err, text) {
	if (err) throw(err);
	var mf = JSON.parse(text)[version];		//everything under this version
	//console.log(mf);
	mf.js.forEach(function(o) {
		for(var i in o) {
			(function(i, o) {
				if (o[i].deps) {
					for(var d in o[i].deps) {
						if (o[i].deps[d].fileKey)
							ps.push(loadFile(o[i].deps[d]));
					};
				};
				if (o[i].fileKey) {
					ps.push(loadFile(o[i]));
				};
			})(i, o);
		};
	});
	for(var i in mf.css) {
		(function(i, o) {
			if (o[i].fileKey) {
				ps.push(loadFile(o[i]));
			};
		})(i, mf.css);
	};
	for(i in mf.files) {
		(function(i, o) {
			if (o[i].fileKey) {
				//upload template files
				ps.push(loadFile(o[i]));
			};
		})(i, mf.files);
	};
	
	//template file for invite friend
	var inv = mf.system.invite;
	if (inv.fileKey) {
		ps.push(new Promise(function(resolve, reject) {
			fs.readFile(inv.fileKey, null, function(err, text) {
				if (err) throw(err);
				var key = "_template_to_create_entry_html";
				proxy.set(sid, bid, key, text, function() {
					console.log(inv.fileKey, key);
					inv.fileKey = key;
					resolve(key);
				}, function(name, err) {
					console.error(err);
					reject();
				});
			});
		}));
	};
	
	var leither = mf.system.leither;
	if (leither.fileKey) {
		fs.readFile(leither.fileKey, null, function(err, text) {
			if (err) throw(err);
			var key = "_leither_cloud_js";
			proxy.set(sid, bid, key, text, function() {
				console.log(leither.fileKey, key);
			}, function(name, err) {
				console.error(err);
			});
		});
	};
	
	Promise.all(ps).then(function(res) {
		var o = {};
		o[version] = mf;
		var t = JSON.stringify(mf);
		proxy.set(sid, bid, "_makefile.json"+"_"+version, t, function() {
			console.log(t);
		}, function(name, err) {
			console.error(err);
		});
	}, function(name, err) {
		console.error(err);
	});
});
