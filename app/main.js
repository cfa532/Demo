//main.js
//jQuery codes
//"use strict";

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

/*\
 |*|
 |*|  Base64 / binary data / UTF-8 strings utilities
 |*|
 |*|  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Base64_encoding_and_decoding
 |*|
 \*/

/* Array of bytes to base64 string decoding */

function b64ToUint6(nChr) {

	return nChr > 64 && nChr < 91 ? nChr - 65
			: nChr > 96 && nChr < 123 ? nChr - 71
					: nChr > 47 && nChr < 58 ? nChr + 4 : nChr === 43 ? 62
							: nChr === 47 ? 63 : 0;

}

function base64DecToArr(sBase64, nBlocksSize) {

	var sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, ""), nInLen = sB64Enc.length, nOutLen = nBlocksSize ? Math
			.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize)
			* nBlocksSize
			: nInLen * 3 + 1 >> 2, taBytes = new Uint8Array(nOutLen);

	for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
		nMod4 = nInIdx & 3;
		nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 6 * (3 - nMod4);
		if (nMod4 === 3 || nInLen - nInIdx === 1) {
			for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
				taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
			}
			nUint24 = 0;

		}
	}

	return taBytes;
}

/* Base64 string to array encoding */

function uint6ToB64(nUint6) {

	return nUint6 < 26 ? nUint6 + 65 : nUint6 < 52 ? nUint6 + 71
			: nUint6 < 62 ? nUint6 - 4 : nUint6 === 62 ? 43
					: nUint6 === 63 ? 47 : 65;

}

function base64EncArr(aBytes) {

	var nMod3 = 2, sB64Enc = "";

	for (var nLen = aBytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
		nMod3 = nIdx % 3;
		if (nIdx > 0 && (nIdx * 4 / 3) % 76 === 0) {
			sB64Enc += "\r\n";
		}
		nUint24 |= aBytes[nIdx] << (16 >>> nMod3 & 24);
		if (nMod3 === 2 || aBytes.length - nIdx === 1) {
			sB64Enc += String.fromCharCode(uint6ToB64(nUint24 >>> 18 & 63),
					uint6ToB64(nUint24 >>> 12 & 63),
					uint6ToB64(nUint24 >>> 6 & 63), uint6ToB64(nUint24 & 63));
			nUint24 = 0;
		}
	}

	return sB64Enc.substr(0, sB64Enc.length - 2 + nMod3)
			+ (nMod3 === 2 ? '' : nMod3 === 1 ? '=' : '==');

}

/* UTF-8 array to DOMString and vice versa */

function UTF8ArrToStr(aBytes) {

	var sView = "";

	for (var nPart, nLen = aBytes.length, nIdx = 0; nIdx < nLen; nIdx++) {
		nPart = aBytes[nIdx];
		sView += String.fromCharCode(nPart > 251 && nPart < 254
				&& nIdx + 5 < nLen ? /* six bytes */
		/* (nPart - 252 << 30) may be not so safe in ECMAScript! So...: */
		(nPart - 252) * 1073741824 + (aBytes[++nIdx] - 128 << 24)
				+ (aBytes[++nIdx] - 128 << 18) + (aBytes[++nIdx] - 128 << 12)
				+ (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
				: nPart > 247 && nPart < 252 && nIdx + 4 < nLen ? /* five bytes */
				(nPart - 248 << 24) + (aBytes[++nIdx] - 128 << 18)
						+ (aBytes[++nIdx] - 128 << 12)
						+ (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
						: nPart > 239 && nPart < 248 && nIdx + 3 < nLen ? /* four bytes */
						(nPart - 240 << 18) + (aBytes[++nIdx] - 128 << 12)
								+ (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx]
								- 128 : nPart > 223 && nPart < 240
								&& nIdx + 2 < nLen ? /* three bytes */
						(nPart - 224 << 12) + (aBytes[++nIdx] - 128 << 6)
								+ aBytes[++nIdx] - 128 : nPart > 191
								&& nPart < 224 && nIdx + 1 < nLen ? /* two bytes */
						(nPart - 192 << 6) + aBytes[++nIdx] - 128 : /* nPart < 127 ? *//* one byte */
						nPart);
	}

	return sView;

}

function strToUTF8Arr(sDOMStr) {

	var aBytes, nChr, nStrLen = sDOMStr.length, nArrLen = 0;

	/* mapping... */

	for (var nMapIdx = 0; nMapIdx < nStrLen; nMapIdx++) {
		nChr = sDOMStr.charCodeAt(nMapIdx);
		nArrLen += nChr < 0x80 ? 1 : nChr < 0x800 ? 2 : nChr < 0x10000 ? 3
				: nChr < 0x200000 ? 4 : nChr < 0x4000000 ? 5 : 6;
	}

	aBytes = new Uint8Array(nArrLen);

	/* transcription... */

	for (var nIdx = 0, nChrIdx = 0; nIdx < nArrLen; nChrIdx++) {
		nChr = sDOMStr.charCodeAt(nChrIdx);
		if (nChr < 128) {
			/* one byte */
			aBytes[nIdx++] = nChr;
		} else if (nChr < 0x800) {
			/* two bytes */
			aBytes[nIdx++] = 192 + (nChr >>> 6);
			aBytes[nIdx++] = 128 + (nChr & 63);
		} else if (nChr < 0x10000) {
			/* three bytes */
			aBytes[nIdx++] = 224 + (nChr >>> 12);
			aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
			aBytes[nIdx++] = 128 + (nChr & 63);
		} else if (nChr < 0x200000) {
			/* four bytes */
			aBytes[nIdx++] = 240 + (nChr >>> 18);
			aBytes[nIdx++] = 128 + (nChr >>> 12 & 63);
			aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
			aBytes[nIdx++] = 128 + (nChr & 63);
		} else if (nChr < 0x4000000) {
			/* five bytes */
			aBytes[nIdx++] = 248 + (nChr >>> 24);
			aBytes[nIdx++] = 128 + (nChr >>> 18 & 63);
			aBytes[nIdx++] = 128 + (nChr >>> 12 & 63);
			aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
			aBytes[nIdx++] = 128 + (nChr & 63);
		} else /* if (nChr <= 0x7fffffff) */{
			/* six bytes */
			aBytes[nIdx++] = 252 + (nChr >>> 30);
			aBytes[nIdx++] = 128 + (nChr >>> 24 & 63);
			aBytes[nIdx++] = 128 + (nChr >>> 18 & 63);
			aBytes[nIdx++] = 128 + (nChr >>> 12 & 63);
			aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
			aBytes[nIdx++] = 128 + (nChr & 63);
		}
	}

	return aBytes;
}