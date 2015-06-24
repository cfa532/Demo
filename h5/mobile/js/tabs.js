// JavaScript Document
$(function(){	
	$('.sy-tab ul li').click(function(){
		$(this).addClass('nav-active').siblings().removeClass('nav-active');
		$('.list-info>div:eq('+$(this).index()+')').show().siblings().hide();	
	})
	
	//上传图片高度等于宽度
	function autoHeight(){
		var height=$(".send-img li").width();
		$(".send-img li").css("height",height);
		}
	window.onload=autoHeight;
	window.onresize=autoHeight;
	
	//删除图片
	$(".send-img li i").click(function(){
		$(this).parent().hide();
		})
	
})

//文件选择
 function fileSelect() {
      document.getElementById("fileToUpload").click(); 
  }	