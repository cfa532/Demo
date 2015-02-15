$(function(){
 $(".acc h3 a").each(function(index, element) {
    $(this).bind("click",function(){
			$(".acc .acc_con").each(function(index, element) {
                $(this).hide();
            }); 
			$(".acc h3 a").each(function(index, element) {
                $(this).removeClass("active");
            });
			$(this).addClass("active");
			$(".acc_con").eq(index).show();
		})
});

$(".wei_t a").each(function(index, element) {
    $(this).bind("mouseover",function(){
		 $(".wei_t a").each(function(index, element) {
            $(this).removeClass("active");
			$(".wei_iframe").eq(index).hide();
        });
		$(this).addClass("active");
		$(".wei_iframe").eq(index).show();
		})
});
$('.online_tab').jtabs('.online_list', {fx: 'fade', activeClass: 'active', event: 'click', initIdx: 0});
});