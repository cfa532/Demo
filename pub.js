// p.js
"use strict";
var prom = require("promise");
var hp = require("hprose");
var hosturl = "112.124.113.235:30003";
//hosturl ="97.74.126.127:4800";
var client = new HproseHttpClient("http://" + hosturl + "/webapi/",
		["login","register", "getvar", "begin", "commit", "rollback", "setdata", "set", "get", "hset", "hget","hlen","hkeys",
		 "hgetall", "hmset","hmget","exit", "lpush", "lpop", "rpush", "rpop", "lrange", "zadd", "zrange",
		 "sendmsg", "readmsg", "invite", "accept", "test", "veni", "sethostip","proxyget"])
var proxy = client.useService();
var fs = require('fs');
var bid = "4_6MfkPgJ03TSrrtlEawGf299PYzULu42g2m49xQl8U";
//bid = "lrOXcQpnLuiINnMbJ7SNHmoCislHjjsoaRCFJVNYFY4";	//97
var sid = "9f25eb605c1c0ef865c5dd5ade7621c66be5b244";
var version = "1.0.9";
var ps = [];		//queue to hold all the promises

function loadFile(i, o) {
	return new Promise(function(resolve, reject) {
		fs.readFile(o[i].fileKey, "utf-8", function(err, text) {
			if (err) throw(err);
			proxy.setdata(sid, bid, text, function(key) {
				console.log(o[i].fileKey, key);
				o[i].fileKey = key;
				resolve(key);
			}, function(name, err) {
				console.error(err);
				reject();
			});
		});
	});
};

fs.readFile("makefile.json", "utf-8", function(err, text) {
	if (err) throw(err);
	var mf = JSON.parse(text)[version];		//everything under this version
	//console.log(mf);
	mf.js.forEach(function(o) {
		for(var i in o) {
			(function(i, o) {
				if (o[i].deps) {
					for(var d in o[i].deps) {
						if (o[i].deps[d].fileKey)
							ps.push(loadFile(d, o[i].deps));
					};
				};
				if (o[i].fileKey) {
					ps.push(loadFile(i, o));
				};
			})(i, o);
		};
	});
	for(var i in mf.css) {
		(function(i, o) {
			if (o[i].fileKey) {
				ps.push(loadFile(i, o));
			};
		})(i, mf.css);
	};
	//upload main.html
//	fs.readFile("templates/main.html", "utf-8", function(err, text) {
//		if (err) throw(err);
//		proxy.set(sid, bid, "upgrade-file-location", text, function() {
//			console.log("main.html uploaded");
//		}, function(name, err) {
//			console.error(err);
//		});
//	});
	
	Promise.all(ps).then(function(res) {
		var o = {};
		o[version] = mf;
		var t = JSON.stringify(o);
		proxy.set(sid, bid, "_makefile.json"+"_"+version, t, function() {
			console.log(t);
		}, function(name, err) {
			console.error(err);
		});
	}, function(name, err) {
		console.error(err);
	});
});
