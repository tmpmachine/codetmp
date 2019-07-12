
/*
0.031 - 32 june 19 - replaced screen var
0.030 - 4 apr 19 - fix persistent
0.029 - 18 sep 18 - remove prompt
0.028 - 13 sep 18 - o.js change
0.027 - 19 july 18
0.026 - 15 june 18
*/

const aww = {
  $: function(query) {
    return document.querySelector(query);
  },
  pop: function(txt, persistence, timeout) {
    
    persistence = (persistence === undefined) ? false : persistence;
    if (typeof($) === 'undefined')
      $ = aww.$;
    
    if ($('#_awwPop') === null)
    {
      var d = document.createElement('div');
      d.setAttribute('id','_awwPop');
      d.setAttribute('style','top:0;position:fixed;padding:4px;z-index:1000;-webkit-transform:translateY(-100px);transform:translateY(-100px);-webkit-transition:-webkit-transform 500ms;transition:transform 500ms;width:100%;text-align:center;width:auto;');
      d.innerHTML = "<p style='background:white;border-radius:2px;display:inline-block;padding:4px 8px;margin:0;font-size:0.8em;color:#000!important;' class='w3-card-4'></p>";
      document.body.appendChild(d);
      d.firstElementChild.innerHTML = txt;
      d.style.left = (document.body.offsetWidth-$('#_awwPop').offsetWidth)/2+'px';
    }
    else
      $('#_awwPop').firstElementChild.innerHTML = txt;
    
    clearTimeout(aww.hide);
    $('#_awwPop').style.webkitTransform = 'translateY(0px)';
    $('#_awwPop').style.transform = 'translateY(0px)';
    
    if (!persistence)
    {
      if (timeout === undefined)
        timeout = 2000;
        
      aww.hide = setTimeout(function() {
        $('#_awwPop').style.webkitTransform = 'translateY(-100px)';
        $('#_awwPop').style.transform = 'translateY(-100px)';
      }, timeout);
    }
  }
};