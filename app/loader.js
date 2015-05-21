//loader.js
"use strict";

(function() {
	G.loader
	.run(function($state, $rootScope) {
		//$state.go("root")
		function message(to, toP, from, fromP) { return from.name  + angular.toJson(fromP) + " -> " + to.name + angular.toJson(toP); }
		$rootScope.$on("$stateChangeStart", function(evt, to, toP, from, fromP) { debug.log("Start:   " + message(to, toP, from, fromP)); });
		$rootScope.$on("$stateChangeSuccess", function(evt, to, toP, from, fromP) { debug.log("Success: " + message(to, toP, from, fromP)); });
		$rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) { debug.log(error); });
	})
	.configure(function($stateProvider, $urlRouterProvider) {
		$stateProvider
		.state("root", {
			url : "/",
			templateUrl : function() {
				//load main html page of the app. first check localStorage
				var appID = "upgrade-file-location";
				if (localStorage[appID]) {
					//load page 
					return localStorage[appID];
				} else {
					//load it from Leither
					G.client.get(G.sid, G.bid, appID, function(data) {
						return data[1];
					}, function(name, err) {
						console.error(err);
					});
				};
			},
			controller : function($scope) {
				
			},
		})
	})
})();