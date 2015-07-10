// JavaScript Document
$(function(){	
   //首页tab切换
//	$('.sy-tab ul li').click(function(){
//		$(this).addClass('nav-active').siblings().removeClass('nav-active');
//		$('.list-info>div:eq('+$(this).index()+')').show().siblings().hide();	
//	})
	
   //转发评论微博tab切换
	$('.detail-nav ul li').click(function(){
		$(this).addClass('pl-active').siblings().removeClass('pl-active');
		$('.detail-info>div:eq('+$(this).index()+')').show().siblings().hide();	
	})
	
	//上传图片高度等于宽度
	function autoHeight(){
		var height=$(".send-img li").width();
		$(".send-img li").css("height",height);
		var threeheight=$(".three-pic li").width();
		$(".three-pic li").css("height",threeheight);
		}
	window.onload=autoHeight;
	window.onresize=autoHeight;
	
	//删除图片
	$(".send-img li i").click(function(){
		$(this).parent().hide();
		})
	
	//收藏、取消收藏等效果
	$(".sy-zan li").click(function(){
		$(this).children("a").toggle();
		})
	
	//删除微博
	$(".wo-more").click(function(e) { 
	  e.stopPropagation(); 
	  $(".alert-main").removeClass("hide"); 
	  $(".fade").show();
	 }); 
	$(document).click(function() { 
	  if (!$(".alert-main").hasClass("hide")) { 
	     $(".alert-main").addClass("hide"); 
	     $(".fade").hide();
	     } 
	 }); 
	$(".alert-main").click(function (e) { 
	  e.stopPropagation();//阻止事件向上冒泡 
	 }); 
	$(".cancel").click(function(){
		$(this).parents(".alert-main").addClass("hide"); 
		$(".fade").hide();
		})
		
	//我的好友，在线用户切换下拉隐藏
	$(".send-wb span").click(function(){
		var ul=$(".more-tit");
		if(ul.css("display")=="none"){
			ul.show();
		}else{
			ul.hide();
		}
	});
	//我的好友，在线用户切换右侧图标更换
	$(".up-tb").click(function(){
		var _name = $(this).attr("name");
		if( $("[name="+_name+"]").length > 1 ){
			$("[name="+_name+"]").removeClass("down-tb");
			$(this).addClass("down-tb");
		} else {
			if( $(this).hasClass("down-tb") ){
				$(this).removeClass("down-tb");
			} else {
				$(this).addClass("down-tb");
			}
		}
	});
	//我的好友，在线用户切换中内容切换
	$(".more-tit li").click(function(){
		var li=$(this).text();
		var type=$(this).attr('data-type');
		$(".send-wb span").html(li);
		$(".more-tit").hide();
		$(".send-wb span").removeClass("down-tb");   
		$('.contype').hide();
		$('.'+type).show();
	});
	
	
	
})

//文件选择
 function fileSelect() {
        document.getElementById("fileToUpload").click(); 
    }	