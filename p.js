// p.js
"use strict";
var prom = require("promise");
var hp = require("hprose");
var hosturl = "112.124.113.235:30003";
hosturl ="97.74.126.127:4800";
var client = new HproseHttpClient("http://" + hosturl + "/webapi/",
		["login","register", "getvar", "begin", "commit", "rollback", "setdata", "set", "get", "hset", "hget","hlen","hkeys",
		 "hgetall", "hmset","hmget","exit", "lpush", "lpop", "rpush", "rpop", "lrange", "zadd", "zrange",
		 "sendmsg", "readmsg", "invite", "accept", "test", "veni", "sethostip","proxyget"])
var proxy = client.useService();
var fs = require('fs');
var bid = "iqrR1rceU65JpfBPlqoFeEnVpo2hPGzgVQEvU3t-rPs";
var sid = "9f16efcdd1a29b6575148229dbe2c07d121be219";
var version = "1.0.7";
var ps = [];		//queue to hold all the promises

function loadFile(i, o) {
	return new Promise(function(resolve, reject) {
		fs.readFile(o[i].fileKey, "utf-8", function(err, text) {
			if (err) throw(err);
			proxy.setdata(sid, bid, text, function(key) {
				//console.log(o[i].fileKey);
				console.log(key);
				o[i].fileKey = key;
				//console.log(o);
				resolve(key);
			}, function(name, err) {
				console.error(err);
				reject();
			});
		});
	});
};

fs.readFile("makefile", "utf-8", function(err, text) {
	if (err) throw(err);
	var mf = JSON.parse(text)[version];		//everything under this version
	console.log(mf.css);
	mf.js.forEach(function(o) {
		for(var i in o) {
			(function(i, o) {
				if (o[i].deps) {
					for(var d in o[i].deps) {
						if (o[i].deps[d].fileKey)
							ps.push(loadFile(d, o[i].deps));
					};
				};
				//return;
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
	
	Promise.all(ps).then(function(res) {
		//console.log(mf[0].jQuery.deps);
		var o = {};
		o[version] = mf;
		var t = JSON.stringify(o);
		proxy.set(sid, bid, "_makefile.json", t, function() {
			console.log(t);
		}, function(name, err) {
			console.error(err);
		});
	}, function(name, err) {
		console.error(err);
	});
});
