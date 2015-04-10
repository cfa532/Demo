//main.js
//jQuery codes
$(document).ready(function(){
	$(".img-group").colorbox({rel:'img-group'});
	$(".inline").colorbox({inline:true, width:"50%"});
	$("#click").click(function(){ 
		$('#click').css({"background-color":"#f00", "color":"#fff", "cursor":"inherit"}).text("Open this window again and this message will still be here.");
		return false;
	});
})

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

var isPlusMobileVisible=false; 
var showTid = null; 
var hideTid = null; 
var showPlusMobile = function(id){ 
	if(isPlusMobileVisible == false) { 
		showTid = setTimeout("document.getElementById('"+id+"').style.display='block'; isPlusMobileVisible=true;", 0); 
	}else{ 
		clearTimeout(hideTid); 
	} 
} 
var hidePlusMobile = function(id){ 
	if(isPlusMobileVisible == true) { 
		hideTid = setTimeout("document.getElementById('"+id+"').style.display='none'; isPlusMobileVisible=false;", 500); 
	}else { 
		clearTimeout(showTid); 
	} 
}
function b(){
	h = $(window).height();
	t = $(document).scrollTop();
	if(t > 159){
		$('#floating').show();
	}else{
		$('#floating').hide();
	}
}
$(window).scroll(function(e){
	b();		
})

var slideToggle = function(){
	if ("#online_info:visible") {
		hideChat();
	}
	$("#online_info").slideToggle(400);
}

var hideChat = function() {
	$("#online_sms").hide(400);
};
var showChat = function() {
	$("#online_sms").show(400);
};

$("#set_icon").click(function(){
	easyDialog.open({
	container : 'user_set',
	fixed : false,
	drag : true,
	overlay : true
	});
});

$(function(){
	$(".btn-relay").click(function(){
		if($(this).parent().parent().find("#relay-box").is(":visible")==false){
			$(".zfWrap").hide(); 
			$(this).parent().parent().find("#relay-box").show(200);
		}
		else{
			$(this).parent().parent().find("#relay-box").hide(200);	
		}		
	});	
	$(".btn-comt").click(function(){
		if($(this).parent().parent().find(".comt-box").is(":visible")==false){
			$(".zfWrap").hide(); 
			$(this).parent().parent().find(".comt-box").show(200);
			showReview(wb); 
		}
		else{
			 
			$(this).parent().parent().find(".comt-box").hide(200);
		}
		return false;
	});
});

$(function(){
	$(".btnWeek").click(function(){
		$(".W_layer").hide(); 
		$(".funBox .mFun").hide(); 
		$(this).parent().parent().find("#W_layer_lotspic").show(200);
		return false;//关键是这里，阻止冒泡 
	}); 
	$(".btn-fav").click(function(){
		$(".W_layer").hide(); 
		$(".funBox .mFun").hide(); 
		$(this).parent().parent().find("#fav_box").show(200);
		return false;//关键是这里，阻止冒泡 
	}); 
	$(".feed_opt").click(function(){
		$(".W_layer").hide();	
		$(".funBox .mFun").hide(); 
		$(this).parent().find(".mFun").show(200);
		return false;//关键是这里，阻止冒泡 
	});	
	$(".W_layer").click(function(){ 
		return true; 
	});
	$(".funBox .mFun").click(function(){ 
		return false; 
	}); 
	$(document).click(function(){
		//$(".W_layer").hide(); 
		$(".funBox .mFun").hide(); 
	});
});

$(".W_close").click(function () {
	$(this).parents().find(".W_layer").hide();
	$(this).parents().find(".zfWrap").hide();
});
