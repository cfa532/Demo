{
"1.0.7" : {
		"js" : [
			{
				"jQuery" : {
					"fileKey" : "js/jquery.min.js",	
					"deps" : {
						"jQueryTab" : { "fileKey" : "js/jquery.jtabs.js" },
						"easydialog" : { "fileKey" : "js/easydialog.min.js" },
						"colorbox" : { "fileKey" : "js/jquery.colorbox.js" }
					}
				},
				"GlobalDataStruct" : { "fileKey" : "app/GlobalDataStruct.js" },
				"angularUiRouter" : { "fileKey" : "lib/angular-ui-router.min.js" },
				"uiBootstrapTpls" : { "fileKey" : "lib/ui-bootstrap-tpls.min.js" },
				"fileSaver" : { "fileKey" : "lib/FileSaver.min.js" }
			},
			{
				"main" : { "fileKey" : "app/main.js" },
				"account" : { "fileKey" : "app/account.js" },
				"message" : { "fileKey" : "app/message.js" },
				"sms" : { "fileKey" : "app/sms.js" },
				"states" : { "fileKey" : "app/states.js" },
				"root" : { "fileKey" : "app/rootModule.js" },
				"review" : { "fileKey" : "app/review.js" },
				"directives" : { "fileKey" : "app/directives.js" }
			}
		],
		"css" : {
			"base" : { "fileKey" : "css/base.css" },
			"master" : { "fileKey" : "css/master.css" },
			"addition" : { "fileKey" : "css/addition.css" },
			"bootstrap" : { "fileKey" : "css/bootstrap.min.css" }
		}
	}
}