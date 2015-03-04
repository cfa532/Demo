if (!window.localStorage) {    
    alert('This browser does NOT support localStorage');
}
var resid = ""
function FVPair() { }
function ScorePair() { }
function Message() {}
var hosturl = "112.124.113.235:30003"

var client = new hprose.HttpClient("http://" + hosturl + "/webapi/", ["login","register",
    "getvar", "begin", "commit", "rollback", "setdata", "set", "get", "hset", "hget","hlen","hkeys",
     "hgetall", "hmset","hmget","exit", "lpush", "lpop", "rpush", "rpop", "lrange", "zadd", "zrange",
     "sendmsg", "readmsg", "invite", "accept", "test", "veni", "sethostip","proxyget"])
console.log(hosturl)
var myApp = angular.module("appModule", [])

function InitServerIp(sid) {
    if (hosturl.indexOf("127.0.0.1") == 0 || hosturl.indexOf("http://127.0.0.1") == 0 ){
        //获取主站的外网ip，如果没有则进入测试代码部分
        console.log("localhost")
        client.getvar(sid, "hostip", function (hostip) {
            console.log(hostip);
            if (hostip.length == 0) {
                console.log("check serverip");
                client.proxyget(sid, "http://1111.ip138.com/ic.asp", function(strbody){
                    ip = getipfromip368(strbody)
                    if (ip.length > 0) {
                        client.sethostip(sid, ip)
                    }
                }, function(name, err){
                    console.log(name + ":"+err);    
                })
            }
        }, function (name, err) {
            console.log(name + ":"+err);
        })
    }
}

errfunc = function (name, err) {
    console.log(name, err);
}
function Login($scope) {
    console.log("Login");
    //client.login(null, "L_-FAwEBA1BQVAH_hgABAwECSUQBDAABBFNpZ24BDAABCFZhbGlkaXR5Af-IAAAAEP-HBQEBBFRpbWUB_4gAAAAw_4YBK2pFMWd3UURWQ2Z2dFlnYXFSQWFteDNlbTlKRlA3VmlMMXlCYXBKeEd5VmMA", function (sid) {
    client.login(null, "L_-FAwEBA1BQVAH_hgABAwECSUQBDAABBFNpZ24BDAABCFZhbGlkaXR5Af-IAAAAEP-HBQEBBFRpbWUB_4gAAAAw_4YBK2dWUVhaV2QwUmdOdUItNVI1dFgxZ3hoT2IyMDBUZHdFVnMtTEhiTFhwTG8A", function (sid) {
        $scope.sid = sid
        //$scope.$apply()
        InitServerIp(sid)
        //取用户信息
        client.getvar(sid, "self", function (data) {
            console.log(data)
            $scope.user = data;
            //console.log(data.friends)
            $scope.appstatus = "running getdata ok"
            $scope.bid = data.id
            $scope.$apply()
            //取版本号
            client.getvar(sid, "ver", function (data) {
                console.log(data)
                $scope.version = data;
                $scope.appstatus = "running getdata ok"
                $scope.$apply()
            }, function (name, err) {
                console.log(err);
            });
            //var x = document.getElementById("uploadform")
            //console.log(x)
        }, function (name, err) {
            console.log(err);
        });
        client.getvar(sid, "onlinehost", function (data) {
            console.log("onlinehost:", data)
        }, function (name, err) {
            console.log(err);
        });
//offlinehost不再支持
//        client.getvar(sid, "offlinehost", function (data) {
//            console.log("offlinehost:", data)
//        }, function (name, err) {
//            console.log(err);
//       });
    }, function (name, err) {        
        localStorage.removeItem("userid")
        console.log(err);
        $scope.appstatus = err
        $scope.$apply()
    })
}
function isNull(v) {
    return (v == null) || (typeof (v) == "undefined")
}

myApp.controller("UserInfoCtrl", function($scope, $http) {
    $scope.host = "http://" + hosturl + "/"
    $scope.appstatus    = "idle"
    $scope.sid = ""
    $scope.bid = ""
    $scope.resid = ""
    Login($scope);
   
    $scope.uploadNewVersion = function() {
        var x = document.getElementById("fileName").files[0];
        $scope.appstatus = '';
        $scope.imgtext = '';
        var r = new FileReader();
        r.onloadend = function (e) {           
            console.log(e.target.result.byteLength);           
            client.set($scope.sid, $scope.bid, "upgrade-file-location", e.target.result, function () {
                $scope.appstatus = "upload ok;";
                $scope.imgtext = "upgrade-file-location";
                $scope.$apply()
                console.log($scope.appstatus);
            }, function (name, err) {
                console.log(err);
                $scope.appstatus = "upload error"
                $scope.$apply()
            })           
        }
        r.readAsArrayBuffer(x);
        console.log("good");
    };
    
    $scope.newUser = function() {
		client.register(function(id) {
			console.log("New User created, id=" + id);
			$scope.bid = id;
			client.login(id, "ppt", function(sid) {
				$scope.sid = sid;
				client.getvar(sid, "ppt", function(ppt) {
					$scope.imgtext = ppt;
					$scope.$apply();
				});
			});
		});    	
    };
    
    $scope.setdata = function () {
        ob = new Message
        ob.F = 0;
        ob.R = 0;
        client.setdata($scope.sid, $scope.bid, ob, function (data) {
            $scope.appstatus = "setdata ok.create key=[" + data + "]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "set error"
            $scope.$apply()
        })
    }
    $scope.zadd = function () {
        sc = new ScorePair
        sc.score = $scope.count + 1
        sc.member = $scope.count
        client.zadd($scope.sid, $scope.bid, "zkey", sc, function (data) {
            $scope.appstatus = "zadd ok. ret=[" + data + "]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "zadd error"
            $scope.$apply()
        })
    }
    $scope.zrange = function () {
        client.zrange($scope.sid, $scope.bid, "zkey", 0, 10, function (data) {
            for (i = 0; i < data.length; i++) {
                console.log("zrange sc=", data[i].score, "mem=", data[i].member)
            }
            $scope.appstatus = "zrange ok. ret=[" + data[0].score + "]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "zrange error"
            $scope.$apply()
        })
    }
    $scope.set = function () {
        //client.begin($scope.sid, $scope.bid, function () {
            client.set($scope.sid, $scope.bid, "key", $scope.count, function () {                
                $scope.appstatus = "set ok"
                console.log($scope.appstatus);
                $scope.$apply()
                //client.commit($scope.sid,$scope.bid)
            }, function (name, err) {
                console.log(err);
                $scope.appstatus = "set error"
                $scope.$apply()
                //client.rollback($scope.sid,$scope.bid)
        }) 
        //},function(name, err){
        //        console.log(err);
        //        $scope.appstatus = "begin error"
        //        $scope.$apply()
       // })
    };
    
    $scope.get = function () {            
        client.get($scope.sid, $scope.bid, "key", function (data) {            
            $scope.bid = data[0]
            $scope.appstatus = "get ok.value=[" + data[1] +"]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "get error"
            $scope.$apply()
        })
    }
    $scope.hset = function () {        
        client.hset($scope.sid, $scope.bid, "key2", "field" + $scope.count, $scope.count, function (data) {                
            $scope.appstatus = "hset ok num=" + data
            console.log($scope.appstatus);
            $scope.$apply()                
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "hset error"
            $scope.$apply()
        })
    }
    $scope.hlen = function () {
        console.log("hlen sid:" + $scope.sid + "bid:" + $scope.bid);
        client.hlen($scope.sid, $scope.bid, "key2", function (data) {
            $scope.appstatus = "hlen ok.value=[" + data + "]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "hlen error"
            $scope.$apply()
        })
    }
    $scope.hkeys = function () {
        console.log("hkeys sid:" + $scope.sid + "bid:" + $scope.bid);
        client.hkeys($scope.sid, $scope.bid, "key2", function (data) {
            if (data == null) {
                console.log("hkeys data=null")
                return
            }
            for (i = 0; i < data.length; i++) {
                console.log("key:", data[i])
            }

            $scope.appstatus = "hkeys ok.len=[" + data.length + "]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "hlen error"
            $scope.$apply()
        })
    }
    $scope.hget = function () {
        console.log("hget sid:" + $scope.sid + "bid:" + $scope.bid);
        client.hget($scope.sid, $scope.bid, "key2", "field" + $scope.count, function (data) {
            $scope.bid = data[0]
            $scope.appstatus = "hget ok.value=[" + data[1] + "]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "hget error"
            $scope.$apply()
        })
    }
    
    $scope.hmset = function () {
        fv1 = new FVPair
        fv2 = new FVPair
        fv1.field = "field1"
        fv1.value = 10
        fv2.field = "field2"
        fv2.value = 20
        console.log("hmset sid:" + $scope.sid + "bid:" + $scope.bid);
        client.hmset($scope.sid, $scope.bid,"key2", fv1, fv2, function () {            
            $scope.appstatus = "hmset ok"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "hmget error"
            $scope.$apply()
        })
    }

    $scope.hmget = function () {
        console.log("hmget sid:" + $scope.sid + "bid:" + $scope.bid);
        client.hmget($scope.sid, $scope.bid, "key2", "field0", "field1", function (data) {
            console.log("hmget OK")
            if (data == null) {
                console.log("hmget data=null")
                return
            }
            for (i = 0; i < data.length; i++) {
                console.log("value:", data[i])
            }
            $scope.appstatus = "hmget ok.field num=[" + data.length + "]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "hmget error"
            $scope.$apply()
        })
    }
    $scope.hgetall = function () {
        console.log("hgetall sid:" + $scope.sid + "bid:" + $scope.bid);
        client.hgetall($scope.sid, $scope.bid, "key2", function (data) {
            if (data == null) {
                console.log("hgetall data=null")
                return
            }
            for (i = 0; i < data.length; i++) {
                console.log("field ", data[i].field, "value", data[i].value)
            }
            $scope.appstatus = "hgetall ok.field num=[" + data.length + "]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "hgetall error"
            $scope.$apply()
        })
    }
    $scope.rollback = function () {
        client.begin($scope.sid, $scope.bid, function () {
            client.set($scope.sid, $scope.bid, "key", $scope.count, function () {                
                $scope.appstatus = "rollback  set ok"
                console.log($scope.appstatus);
                $scope.$apply()
                client.rollback($scope.sid, $scope.bid)
            }, function (name, err) {
                console.log(err);
                $scope.appstatus = "rollback set error"
                $scope.$apply()
                client.rollback($scope.sid, $scope.bid)
            })
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "begin error"
            $scope.$apply()
        })
    }
    $scope.exit = function() {        
        client.exit(function () {
            $scope.appstatus = "stopped"
            $scope.$apply()
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = err
            $scope.$apply()
        })
    }
    $scope.add = function(){
        $scope.count = $scope.count + 1
    }
    $scope.lpush = function () {
        
            var msg = new Message()
            msg.from = "from"
            msg.to = "to"
            msg.num = $scope.count
            client.lpush($scope.sid, $scope.bid, "keypush", msg, msg, function (data) {
                //$scope.bid = data[0]
                $scope.appstatus = "lpush ok num" + data
                console.log($scope.appstatus);
                $scope.$apply()                
            }, function (name, err) {
                console.log(err);
                $scope.appstatus = "lpush error"
                $scope.$apply()                
            })        
    }
    $scope.lpop = function () {
        client.lpop($scope.sid, $scope.bid, "keypush", function (data) {
            $scope.bid = data[0]
            if (data[1] != null) {
                $scope.appstatus = "lpop ok.value.num=[" + data[1].num + "]"
            } else {
                $scope.appstatus = "lpop ok.value.num=[empty]"
            }
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "lpop error"
            $scope.$apply()
        })
    }
    $scope.rpush = function () {        
            var msg = new Message()
            msg.from = "from"
            msg.to = "to"
            msg.num = $scope.count
            client.rpush($scope.sid, $scope.bid, "keypush", msg, function (data) {
                //$scope.bid = data[0]
                $scope.appstatus = "rpush ok num" + data
                console.log($scope.appstatus);
                $scope.$apply()                
            }, function (name, err) {
                console.log(err);
                $scope.appstatus = "rpush error"
                $scope.$apply()                
            })        
    }
    $scope.rpop = function () {
        client.rpop($scope.sid, $scope.bid, "keyrpush", function (data) {
            $scope.bid = data[0]            
            if (data[1] != null) {
                $scope.appstatus = "rpop ok.value.num=[" + data[1].num + "]"
            } else {
                $scope.appstatus = "rpop ok.value.num=[empty]"
            }
            $scope.$apply()
            console.log("rop return" + $scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "rpop error"
            $scope.$apply()
        })
    }
    $scope.lrange = function () {
        client.lrange($scope.sid, $scope.bid, "keypush", 0, 10, function (data) {
            for (i = 0; i < data.length; i++) {
                console.log("lrange =", data[i])
            }
            $scope.appstatus = "lrange ok. ret=[" + data[0] + "]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "lrange error"
            $scope.$apply()
        })
    }
    $scope.sendmsg = function () {
        console.log("sendmsg")
        if ($scope.user.friends == null || $scope.user.friends.length < 1) {
            $scope.appstatus = "sendmsg no friend"
            return
        }        
        var msg = new Message()
        msg.from = $scope.bid
        msg.to = $scope.user.friends[0].id
        msg.Msg = "msg"
        msg.Data = $scope.count
        $scope.appstatus = "sendmsg to " + $scope.user.friends[0].id
        client.sendmsg($scope.sid, msg, function () {
            console.log($scope.appstatus + " ok")
            $scope.appstatus = $scope.appstatus + " ok"
            $scope.$apply()
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "sendmsg error"
            $scope.$apply()
        })
    }
    $scope.readmsg = function () {
        console.log("readmsg")
        $scope.appstatus = "readmsg begin"
        client.readmsg($scope.sid, function (msgs) {
            console.log("readmsg ok", msgs)
            $scope.appstatus = "readmsg ok:" + msgs.length
            if (msgs.length > 0) {
                $scope.appstatus = $scope.appstatus + "data:" + msgs[0].Msg
            }
            $scope.$apply()
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "sendmsg error"
            $scope.$apply()
        })
    }
    $scope.invite = function () {
        console.log("invite")
        $scope.appstatus = "invite begin"
        //console.log($scope.inputest)
        client.invite($scope.sid, $scope.inputest, function (txt) {
            console.log("invite ok", txt)
            $scope.appstatus = "invite ok:"
            $scope.inputest = txt
            $scope.$apply()
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "invite error"
            $scope.$apply()
        })
    }
    $scope.accept = function () {
        console.log("accept")
        $scope.appstatus = "accept begin"
        //console.log($scope.inputest)        
        client.accept($scope.sid, $scope.inputest, true, function () {
            console.log("accept ok")
            $scope.appstatus = "accept ok:"            
            $scope.$apply()
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "accept error"
            $scope.$apply()
        })
    }
    $scope.veni = function () {
        console.log("accept")
        $scope.appstatus = "accept begin"
        //console.log($scope.inputest)        
        hid = "-N4gYKVkB6T5kTsRKiVY5AnTIPyfaY-Zh1itfrQxFHA"
        client.veni($scope.sid, hid, $scope.inputest, function () {
            console.log("veni ok")
            $scope.appstatus = "veni ok:"
            $scope.$apply()
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "veni error"
            $scope.$apply()
        })
    }

    $scope.nearby = function () {
        client.getvar($scope.sid, "usernearby", function (data) {  
            var len = 0
            if (data != null){
                len = data.length                
            }          
            for (i = 0; i < len; i++) {
                    console.log(data[i])
                }
            $scope.appstatus = "get nearby friend len=[" + len + "]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "get nearby error"
            $scope.$apply()
        })
    };
    
    $scope.getImageData = function () {       
        var x = document.getElementById("fileName").files[0];
        $scope.appstatus = '';
        $scope.imgtext = '';
        var r = new FileReader();
        r.onloadend = function (e) {
        	$scope.appstatus = "upload fine";
        	$scope.imgtext = e.target.result;
            $scope.$apply()
            console.log(e.target.result);           
        }
        r.readAsDataURL(x);
        console.log("good");
    };
    
    $scope.setVersion = function() {
    	client.set($scope.sid, $scope.bid, "database-version", $scope.dbversion, function() {
    		console.log("db version set =" + $scope.dbversion);
    	}, function(name, err) {
    		console.log(err);
    	});
    };
   
   $scope.upload = function () {       
       var x = document.getElementById("fileName").files[0];
       $scope.appstatus = '';
       $scope.imgtext = '';
       var r = new FileReader();
       r.onloadend = function (e) {           
           console.log(e.target.result.byteLength);           
           client.setdata($scope.sid, $scope.bid, e.target.result, function (data) {
               $scope.resid = data
               $scope.appstatus = "upload ok;";
               $scope.imgtext = data;
               console.log($scope.resid);
               $scope.$apply()
               console.log($scope.appstatus);
           }, function (name, err) {
               console.log(err);
               $scope.appstatus = "upload error"
               $scope.$apply()
           })           
       }
       r.readAsArrayBuffer(x);
       console.log("good");
   }
   $scope.test = function () {
       client.test($scope.sid, $scope.bid, function () {
           $scope.appstatus = "test ok"
           $scope.$apply()
           console.log($scope.appstatus);
       }, function (name, err) {
           console.log(err);
           $scope.appstatus = "test error"
           $scope.$apply()
       })
   }
   $scope.getswarm = function () {
       var bid = $scope.bid
       if ($scope.inputest != null && $scope.inputest.length > 0) {
           bid = $scope.inputest
       }
       client.getvar($scope.sid, "swarm", bid, function (sw) {
    	   console.log(sw)
           $scope.appstatus = "bid=" + bid + ";LastId=" + sw.lastId + ";CurId=" + sw.curId;
           $scope.$apply()
           console.log($scope.appstatus);
       }, function (name, err) {
           console.log(err);
           $scope.appstatus = "test error"
           $scope.$apply()
       })
   }
   $scope.setip = function () {
       var bid = $scope.bid
       var ip = $scope.inputest       
       client.sethostip($scope.sid, ip, function (name, err) {
           console.log(err);
           $scope.appstatus = "test error"
           $scope.$apply()
       })
   }
   $scope.checkip = function () {
       console.log("proxyget")
       client.proxyget($scope.sid, "http://1111.ip138.com/ic.asp", function (strbody) {       
           //console.log(strbody)                      
           ip = getipfromip368(strbody)
           if (ip.length > 0) {                
                client.sethostip($scope.sid, ip, function(){
                    console.log("sethostio ok ip:" + ip)
                })
           }
       }, function (name, err) {
           console.log(name + ":" + err);
       })

   }
});

function getipfromip368(strbody) {
    start = strbody.indexOf("[")
    if (start <= 0)
        return ""
    str = strbody.substring(start+1)
    //console.log("str=" +str)                      
    end = str.indexOf("]")
    if (end <= 0)
        return ""
    //console.log("end=" + end)                      
    return str.substring(0, end)
}