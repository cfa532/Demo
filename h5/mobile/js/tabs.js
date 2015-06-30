// JavaScript Document
$(function(){
	//nav bar click control
	$('.sy-tab ul li').click(function(){
		$(this).addClass('nav-active').siblings().removeClass('nav-active');
		$('.list-info>div:eq('+$(this).index()+')').show().siblings().hide();	
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
	
})

//文件选择
 function fileSelect() {
        document.getElementById("fileToUpload").click(); 
    }	