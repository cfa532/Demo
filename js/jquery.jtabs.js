;(function($){
	$.fn.jtabs = function(elem, options){
		var o = $.extend({
			tabs: 'a',
			fx: 'fade',  // ['fade', 'slide']
			initIdx: 0,
			activeClass: 'active',
			hook: null,
			event : 'mouseover' //['mouseover', 'click']
		}, options);		
		return this.each(function(){
			var _this = this, tabs = $(o.tabs, _this), panel = $(elem);	
			o.initIdx = o.initIdx < 0 || o.initIdx =='' ? 0 : (o.initIdx >= tabs.length ? tabs.length-1 : o.initIdx);	
			//init
			$(tabs[o.initIdx]).addClass(o.activeClass);
			
			if(o.fx == 'fade') panel.hide(0).eq(o.initIdx).show(0);
			else panel.slideUp(0).eq(o.initIdx).slideDown(0);
			
			if(o.hook) panel.eq(o.initIdx).addClass(o.hook);		
			
			$(o.tabs, _this).bind(o.event, function(){
				if(!$(this).hasClass(o.activeClass)){
					var idx = tabs.index(this);
					tabs.removeClass(o.activeClass);
					$(this).addClass(o.activeClass);
					if(o.fx == 'fade') {
						panel.hide(0);
						$(panel[idx]).show();
					}else {
						panel.slideUp(0);
						$(panel[idx]).slideDown();
					}
					if(o.hook) {
						panel.filter('.' + o.hook).removeClass(o.hook)
						$(panel[idx]).addClass(o.hook);
					}
				}
				if(o.event == 'click') return false;
				else $(this).click(function(){
					return false;	
				});	
			});
		});			
	};
})(jQuery);