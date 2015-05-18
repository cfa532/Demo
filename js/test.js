//testinfo
thid = "D1DG3LKrjJV1--NAjBq8t9vx0gdo-wcnzsv1BBANJPY" //阿里云
//twid = "-8uaVF3ERM1aQoTOL4hR7IrCGP7nb0rvYz6TCHMRp94" //阿里云
//twid = "gVQXZWd0RgNuB-5R5tX1gxhOb200TdwEVs-LHbLXpLo" //weibo的用户id
//twid = "n1VYjWmCIYM0tmRsshgKZZ3ECzTZuJQ_4enJptTJRjU"
twid ="UFpI8YQ1-hdSMmzHnkrvaK3rvHPEKtqCa3wwDObsEuU" //阿里云上的李四保帐号

if (!window.localStorage) {    
    alert('This browser does NOT support localStorage');
}
var resid = ""
function FVPair() { }
function ScorePair() { }
function Message() {}
var hosturl = window.location.host
if (hosturl == "") {
    //通过本地网页进来的
    hosturl = getbasehost()
}
var client = hprose.Client.create("ws://" + hosturl + "/ws/", ["login", "register",
    "getvar", "act","setdata", "set", "get", "del", "hmclear", "hset","hget","hlen","hkeys",
     "hgetall", "hmset","hmget","exit", "lpush", "lpop", "rpush", "rpop", "lrange", "zadd", "zrange",
     "sendmsg", "readmsg", "invite", "accept", "test", "veni", "sethostip", "proxyget",
     "createinvcode", "getinvcodeinfo", "updateinvcode", "deleteinvcode",
     "setinvtemplate", "getinvtemplate", "getappdownloadkey"])
console.log(hosturl);
//client.timeout = 200000;

function InitServerIp(sid) {
    if (hosturl.indexOf("127.0.0.1") == 0 || hosturl.indexOf("http://127.0.0.1") == 0 ){
        //获取主站的外网ip，如果没有则进入测试代码部分
        console.log("localhost")
        client.getvar(sid, "hosturl", function (hosturl) {
            console.log(hosturl);
            if (hosturl.length == 0) {
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
function getipfromip368(strbody) {
    start = strbody.indexOf("[")
    if (start <= 0)
        return ""
    str = strbody.substring(start + 1)
    //console.log("str=" +str)                      
    end = str.indexOf("]")
    if (end <= 0)
        return ""
    //console.log("end=" + end)                      
    return str.substring(0, end)
}
errfunc = function (name, err) {
    console.log(name, err);
}
function Login($scope) {
    bid = $scope.bid
    ppt = ""
    if ($scope.ppt != null) {
        ppt = $scope.ppt
        bid = ""
        //$scope.bid = ""
        $scope.ppt = ""
    }
    console.log("Login:" + bid);
    client.login(bid, ppt, function (sid) {
        $scope.sid = sid
        $scope.$apply()
        InitServerIp(sid)
        //取用户信息
        client.getvar(sid, "self", function (data) {
            console.log(data)
            $scope.user = data;            
            $scope.appstatus = "running getdata ok"
            $scope.bid = data.id
            $scope.$apply()               
        }, function (name, err) {
            console.log(err);
        });
        //取版本号
        client.getvar(sid, "ver", function (data) {
            console.log(data)
            $scope.version = data;
            $scope.appstatus = "running getdata ok"
            $scope.$apply()
        }, function (name, err) {
            console.log(err);
        });
        client.getvar(sid, "onlinehost", function (data) {
            console.log("onlinehost:", data)
        }, function (name, err) {
            console.log(err);
        });
        client.getvar(sid, "hostinfo", function (hostinfo) {
            console.log("hostinfo:", hostinfo)
            $scope.hid = hostinfo.id
            $scope.hurl = hostinfo.url
            $scope.hostbids = hostinfo.bids
            $scope.$apply()
        }, function (name, err) {
            console.log(err);
       });       
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
function UserInfoCtrl($scope, $http) {
    $scope.host = "http://" + hosturl + "/"
    $scope.appstatus    = "idle"
    $scope.sid = ""
    $scope.bid = ""
    $scope.resid = ""
    userid = localStorage.userid
    if (userid == null) {
        console.log("userid ==null register...");
        client.register(function (data) {
            localStorage.userid = data
            console.log("register userid=", data);
            $scope.bid = data
            Login($scope)
            $scope.$apply()
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "register error"
            $scope.$apply()
        })
    } else {
        console.log("get userid=", userid);
        $scope.bid = userid
        Login($scope)        
    }
   
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
        if ($scope.inputest == null || $scope.inputest.length == 0) {
            key = "key"
        } else {
            key = $scope.inputest;
        }
            client.set($scope.sid, $scope.bid, key, $scope.count, function () {                
                $scope.appstatus = "set ok"
                console.log($scope.appstatus);
                $scope.$apply()
            }, function (name, err) {
                console.log(err);
                $scope.appstatus = "set error"
                $scope.$apply()           
        }) 
    }
    $scope.get = function () { 
        if ($scope.inputest == null || $scope.inputest.length == 0) {
            key = "key"
        } else {
            key = $scope.inputest;
        }
        client.get($scope.sid, $scope.bid, key, function (data) {            
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
    $scope.del = function () {
        if ($scope.inputest == null || $scope.inputest.length == 0) {
            key = "key"
        } else {
            key = $scope.inputest;
        }

        client.del($scope.sid, $scope.bid, key, function (data) {
            $scope.appstatus = "del ok.ret=[" + data + "]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "del error"
            $scope.$apply()
        })
    }
    $scope.hmclear = function () {
        if ($scope.inputest == null || $scope.inputest.length == 0) {
            key = "key2"
        } else {
            key = $scope.inputest;
        }

        client.hmclear($scope.sid, $scope.bid, key, function (data) {
            $scope.appstatus = "hmclear ok.ret=[" + data + "]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "hmclear error"
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
        if ($scope.inputest == null || $scope.inputest.length == 0) {        
            $scope.appstatus = "sendmsg no friend"
            return
        }        
        var msg = new Message()
        msg.from = $scope.bid
        msg.to = $scope.inputest
        msg.Msg = "msg"
        msg.Data = $scope.count
        $scope.appstatus = "sendmsg to " + $scope.inputest
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
        function showmsg() {
            console.log("showmsg ")
            client.readmsg($scope.sid, function (msgs) {
                console.log("readmsg ok", msgs)
                $scope.appstatus = "readmsg ok:" + msgs.length
                if (msgs.length > 0) {
                    $scope.appstatus = $scope.appstatus + "data:" + msgs[0].Msg
                }
                $scope.$apply()
                showmsg()
            }, function (name, err) {
                console.log(err);
                $scope.appstatus = "sendmsg error"
                $scope.$apply()
            })
        }
        showmsg()
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
        //veni函数的参数已经变了，仅限于主机之间的通讯
        console.log("veni函数的参数已经变了，仅限于主机之间的通讯,测试案例要重写了")
        return
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
    }
    $scope.checkbids = function () {
        /*bid = twid
        if ($scope.inputest != null && $scope.inputest.length > 0) {
            bid = $scope.inputest
        }*/
        client.getvar($scope.sid, "checkbids", "6OkFeZw0sk3p0S0UrAPX0TJfhpabpgNIr-IgVGoRiZQ", function (data) {
            var len = 0
            if (data != null) {
                len = data.length
            }
            for (i = 0; i < len; i++) {
                console.log(data[i])
            }
            $scope.appstatus = "checkbids find count=[" + len + "]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "checkbids error"
            $scope.$apply()
        })
    }
   $scope.upload = function () {       
       var x = document.getElementById("fileName").files[0];
       var r = new FileReader();
       r.onloadend = function (e) {           
           console.log(e.target.result.byteLength);           
           client.setdata($scope.sid, $scope.bid, e.target.result, function (data) {
               $scope.resid = data
               $scope.appstatus = "upload ok"
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
   $scope.getswarms = function () {
       console.log("getswarms");
       client.getvar($scope.sid, "swarms", function (swarms) {
           console.log(swarms)
           $scope.$apply()
       }, function (name, err) {
           console.log(err);
           $scope.appstatus = "getvar swarms error"
           $scope.$apply()
       }
       )
   }
   $scope.getswarm = function () {
       var bid = $scope.bid
       if ($scope.inputest != null && $scope.inputest.length > 0) {
           bid = $scope.inputest
       }
       console.log("getswarm bid=", bid);
       client.getvar($scope.sid, "swarm", bid, function (swarm) {
           console.log(swarm)
           for (i = 0; i < swarm.hosts.length; i++) {
               console.log("host[", i, "]id=", swarm.hosts[i].id, ",url=", swarm.hosts[i].url)
           }
           $scope.$apply()
       }, function (name, err) {
           console.log(err);
           $scope.appstatus = "getvar swarm error"
           $scope.$apply()
       }
       )
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
   $scope.relogin = function () {
       console.log("relogin")
       $scope.bid = $scope.inputest
       Login($scope)
   }

   $scope.pptlogin = function () {
       console.log("pptlogin")
       $scope.ppt = $scope.inputest
       Login($scope)
   }
   $scope.getppt = function () {
       console.log("getppt")
       client.getvar($scope.sid, "ppt", function (ppt) {
           console.log("ppt=" + ppt)
           $scope.inputest = ppt
           $scope.$apply()
       }, function (name, err) {
           console.log(err);
           $scope.appstatus = "relogin error"
           $scope.$apply()
       }
       )
   }
   $scope.gethostid = function () {
       console.log("gethostid")
       client.getvar($scope.sid, "hostid", function (hostid) {
           console.log("hostid=" + hostid)
           $scope.inputest = hostid
           $scope.$apply()
       }, function (name, err) {
           console.log(err);
           $scope.appstatus = "relogin error"
           $scope.$apply()
       }
       )
   }
      
   $scope.onlinehost = function () {
       console.log("onlinehost")
       client.getvar($scope.sid, "onlinehost", function (data) {
            console.log("onlinehost:", data)
        }, function (name, err) {
            console.log(err);
        });       
   }
   $scope.addhost = function () {
       console.log("addhost")
        splits = $scope.inputest.split(";")
        client.act($scope.sid, "addhost", splits[0], splits[1], function () {
            console.log("addhost ok")     
        }, function (name, err) {
            console.log(err);
        });
    }
    $scope.removehost = function () {
        console.log("removehost")
        hid = $scope.inputest
        client.act($scope.sid, "removehost", hid, function () {
            console.log("removehost ok")
        }, function (name, err) {
            console.log(err);
        });
    }
    $scope.copyuser = function () {
        console.log("copyuser ...")
        if ($scope.inputest == null || $scope.inputest.length == 0) {
            console.log("inputtest null")
            hostid = thid;
            wid = twid;
        } else {
            console.log("inputtest =", $scope.inputest)
            splits = $scope.inputest.split(";")
            hostid = splits[0];
            wid = splits[1];
        }

        client.act($scope.sid, "copyuser", hostid, wid, function () {
            console.log("copyuser ok")
        }, function (name, err) {
            console.log(err);
        });
    }
    $scope.removeuser = function () {
        console.log("removeuser")
        uid = $scope.inputest
        client.act($scope.sid, "removeuser", uid, function () {
            console.log("removeuser ok")
        }, function (name, err) {
            console.log(err);
        });
    }
    $scope.copyswarm = function () {
        console.log("copyswarm")
        if ($scope.inputest == null || $scope.inputest.length == 0) {
            hostid = thid;
            wid = twid;
        } else {
            splits = $scope.inputest.split(";")
            hostid = splits[0];
            wid = splits[1];
        }

        client.act($scope.sid, "copyswarm", hostid, wid, function () {
            console.log("copyswarm ok")
        }, function (name, err) {
            console.log(err);
        });
    }

    $scope.syncswarm = function () {
        console.log("syncswarm")
        if ($scope.inputest == null || $scope.inputest.length == 0) {
            hostid = thid;
            bid = twid;
        } else {
            splits = $scope.inputest.split(";")
            hostid = splits[0];
            bid = splits[1];
        }

        client.act($scope.sid, "syncblock", hostid, bid, "1", function () {
            console.log("syncswarm ok")
        }, function (name, err) {
            console.log(err);
        });
    }
    $scope.checkswarm = function () {
        console.log("check swarm")
        if ($scope.inputest == null || $scope.inputest.length == 0) {
            hostid = thid;
            wid = twid;
        } else {
            splits = $scope.inputest.split(";")
            hostid = splits[0];
            wid = splits[1];
        }

        client.act($scope.sid, "checkswarm", hostid, wid, function () {
            console.log("checkswarm ok")
        }, function (name, err) {
            console.log(err);
        });
    }
    $scope.removeswarm = function () {
        console.log("removeswarm")
        if ($scope.inputest == null || $scope.inputest.length == 0) {
            hostid = thid;
            wid = twid;
        } else {
            splits = $scope.inputest.split(";")
            hostid = splits[0];
            wid = splits[1];
        }
        client.act($scope.sid, "removeswarm", wid, function () {
            console.log("removeswarm ok")
        }, function (name, err) {
            console.log(err);
        });
    }
    $scope.copyallusers = function () {
        console.log("copyallusers")
        if ($scope.inputest == null || $scope.inputest.length == 0) {
            hostid = thid;
        } else {
            hostid = $scope.inputest;
        }
        
        client.act($scope.sid, "copyallusers", hostid, function () {
            console.log("copyallusers ok")
        }, function (name, err) {
            console.log(err);
        });
    }
    $scope.copyallswarm = function () {
        console.log("copyallswarm")
        if ($scope.inputest == null || $scope.inputest.length == 0) {
            hostid = thid;
        } else {
            hostid = $scope.inputest;
        }

        client.act($scope.sid, "copyallswarm", hostid, function () {
            console.log("copyallswarm ok")
        }, function (name, err) {
            console.log(err);
        });
    }
    $scope.copyallswarm2 = function () {
        console.log("copyallswarm2")
        if ($scope.inputest == null || $scope.inputest.length == 0) {
            hostid = thid;
        } else {
            hostid = $scope.inputest;
        }

        client.act($scope.sid, "copyallswarm", hostid, function () {
            console.log("copyallswarm ok")
        }, function (name, err) {
            console.log(err);
        });
    }
    $scope.showkeys = function () {  
        if ($scope.inputest == null || $scope.inputest.length == 0) {
            //bid = twid;
            bid =  $scope.bid
        } else {
            bid = $scope.inputest;
        }
        console.log("showkeys bid=" + bid)
        client.getvar($scope.sid, "keys", bid, function (keys) {
            for (var k in keys) {
                console.log("showkeys k", keys[k]);
            }
        }, function (name, err) {
        console.log(err);
        });
    }
    $scope.backinfo2friends = function () {
        console.log("backinfo2friends")
        client.act($scope.sid, "backinfo2friends", function () {
            console.log("backinfo2friends ok")
        }, function (name, err) {
            console.log(err);
        });
    }
    $scope.createinvcode = function () {
        console.log("createinvcode")
        client.createinvcode($scope.sid, $scope.bid, 24 * 3600, 20, 40, function (invcode) {
            console.log("createinvcode key=", invcode)
            $scope.inputest = invcode
            $scope.$apply()
        }, function (name, err) {
            console.log(err);
        });
    }
    $scope.updateinvcode = function () {
        console.log("updateinvcode")
        invcode = $scope.inputest
        client.updateinvcode($scope.sid, $scope.bid, invcode, 32 * 3600, 20, 60, function (invcode) {
            console.log("updateinvcode", "ok")
            //$scope.inputest = invcode
            //$scope.$apply()
        }, function (name, err) {
            console.log(err);
        });
    }
    $scope.getinvcode = function () {
        console.log("getinvcode")
        invcode = $scope.inputest
        client.getinvcodeinfo($scope.sid, $scope.bid, invcode, function (info) {
            console.log("getInvCodeInfo: validity=", info.validity, "friendcount=", info.friendCount, "money=", info.money)
        }, function (name, err) {
            console.log(err);
        })
    }
    $scope.deleteinvcode = function () {
        console.log("getinvcode")
        invcode = $scope.inputest
        client.deleteinvcode($scope.sid, $scope.bid, invcode, function (info) {
            console.log("deleteinvcode ok")
            $scope.inputest = "deleteinvcode ok"
            $scope.$apply()
        }, function (name, err) {
            console.log(err);
        })
    }
    $scope.setinvtemplate = function () {
        console.log("setInvTemplate")
        invcode = $scope.inputest
        temp = "test temp userid=%%userid%%;userppt=%%ppt%%"
        client.setinvtemplate($scope.sid, $scope.bid, invcode, temp, function (info) {
            console.log("setInvTemplate ok")
        }, function (name, err) {
            console.log(err);
        })
    }
    $scope.getinvtemplate = function () {
        console.log("getInvTemplate")
        invcode = $scope.inputest
        client.getinvtemplate($scope.sid, $scope.bid, invcode, function (temp) {
            console.log("getInvTemplate temp=", temp)
        }, function (name, err) {
            console.log(err);
        })
    }
    $scope.getappdownloadkey = function () {
        console.log("getappdownloadkey")
        invcode = $scope.inputest
        client.getappdownloadkey($scope.sid, $scope.bid, invcode, function (key) {
            console.log("getappdownloadkey key=", key)
            $scope.resid = key
            $scope.$apply()
        }, function (name, err) {
            console.log(err);
        })
    }
    
    
    $scope.test = function () {
        console.log("test ")
        //查方超提的bug
        //OuZUdgbKkjlk7vJ3Nweq8gf - Z1oLk4CJsFDweemzlUI
        //OuZUdgbKkjlk7vJ3Nweq8gf-Z1oLk4CJsFDweemzlUI
        //IWlFvCReDsVnPOi1scub2zCIMlTjuqqKXG8-MBC78NI

        console.log("hget sid:" + $scope.sid + "bid:" + $scope.bid);
        client.hget($scope.sid, "IWlFvCReDsVnPOi1scub2zCIMlTjuqqKXG8-MBC78NI", "_app_user_information", "IWlFvCReDsVnPOi1scub2zCIMlTjuqqKXG8-MBC78NI", function (data) {
            //$scope.bid = data[0]
            console.log(data[1]);
            $scope.appstatus = "hget ok.value=[" + data[1] + "]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "hget error"
            $scope.$apply()
        })
        /*
        client.hget($scope.sid, "IWlFvCReDsVnPOi1scub2zCIMlTjuqqKXG8-MBC78NI", "_app_user_information", "OuZUdgbKkjlk7vJ3Nweq8gf-Z1oLk4CJsFDweemzlUI", function (data) {
            //$scope.bid = data[0]
        	console.log(data[1]);
            $scope.appstatus = "hget ok.value=[" + data[1] + "]"
            $scope.$apply()
            console.log($scope.appstatus);
        }, function (name, err) {
            console.log(err);
            $scope.appstatus = "hget error"
            $scope.$apply()
        })*/
    /*   
           bid = ""
            client.del($scope.sid, $scope.bid, key, function (data) {
                $scope.appstatus = "del ok.ret=[" + data + "]"
                $scope.$apply()
                console.log($scope.appstatus);
            }, function (name, err) {
                console.log(err);
                $scope.appstatus = "del error"
                $scope.$apply()
            })
  */      
 /*   client.test($scope.sid, $scope.sid, function () {        
            console.log("test ok");        
    }, function (name, err) {
        console.log(err);
    });*/
/*
        //97测试
        //hid = "-8uaVF3ERM1aQoTOL4hR7IrCGP7nb0rvYz6TCHMRp94"
        ////bid = "ohAwmtVgt2HOc6c996-YG_QFIQddY6s68jholsGwi0o"
        //bid = "Er4zixs8Pqa0fA6n0OTIRzWs7khC7tP1UCmQpIGu6hU"
        //248测试
        //hid = "gwnasaDG3yszlbzWPcTdpz-gcKxOGrUWkEhdppSRHyg"
        //bid = "vGvU-_cL04VA452aTE83A8a-kDf5gUxMX4K5WHbHQ3M"
        //248:02
        //hid = "76YfAdPmTgudUvHjnmrqHW5WBobC5HitFazW9J2mQGM"
        //bid = "yTZCl7S4jx1NWoOT9isSdX51lNQzOvgsJyKYtb_1wKk"
        //aliyun
        hid = "D1DG3LKrjJV1--NAjBq8t9vx0gdo-wcnzsv1BBANJPY"        
        //bid = "gVQXZWd0RgNuB-5R5tX1gxhOb200TdwEVs-LHbLXpLo" //weibo的用户id
        bid ="-8uaVF3ERM1aQoTOL4hR7IrCGP7nb0rvYz6TCHMRp94"
        client.act($scope.sid, "copyuser", hid, bid, function () {
            console.log("copyuser ok")
            client.act($scope.sid, "copyswarm", hid, bid, function () {
                console.log("copyswarm ok")
            }, function (name, err) {
                console.log(err);
            });
        }, function (name, err) {
            console.log(err);
        });    
        */
    }
}