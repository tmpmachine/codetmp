/*
0.04 - 30 July 2019 - encapsulation
0.032 - 13 july 19 - change document body offsetWidth > clientWidth
0.031 - 32 june 19 - replaced screen var
0.030 - 4 apr 19 - fix persistent
0.029 - 18 sep 18 - remove prompt
0.028 - 13 sep 18 - o.js change
0.027 - 19 july 18
0.026 - 15 june 18
*/

(function () {
  
  function Aww() {
    
    let popElement;
    
    (function () {
      
      popElement = document.createElement('div');
      popElement.setAttribute('style','top:0;position:fixed;padding:4px;z-index:1000;-webkit-transform:translateY(-150%);transform:translateY(-150%);-webkit-transition:-webkit-transform 500ms;transition:transform 500ms;width:100%;text-align:center;');
      popElement.innerHTML = "<div style='box-shadow: 0 4px 10px 0 rgba(0,0,0,0.2), 0 4px 20px 0 rgba(0,0,0,0.19);background:white;border-radius:2px;display:inline-block;padding:4px 8px;font-family:sans-serif;font-size:0.8em;color:#000!important;'></div>";
      document.body.appendChild(popElement);
      
      window.onresize = function() {
        popElement.style.left = (document.body.clientWidth - popElement.offsetWidth) / 2 + 'px';
      };
    })();
    
    this.pop = function (content, isPersistence = false, timeout = 2000) {
      
      popElement.firstElementChild.innerHTML = content;
      popElement.style.left = (document.body.clientWidth - popElement.offsetWidth) / 2 + 'px';
      popElement.style.webkitTransform = 'translateY(0px)';
      popElement.style.transform = 'translateY(0px)';
      
      clearTimeout(this.hide);
      this.hide = setTimeout(function () {
        popElement.style.webkitTransform = 'translateY(-150%)';
        popElement.style.transform = 'translateY(-150%)';
      }, timeout);
      
      if (isPersistence)
        clearTimeout(this.hide);
    };
  }
  
  if (window.aww === undefined)
    window.aww = new Aww();
  else
    console.error('aww.js:', 'Failed to initialize. Duplicate variable exists.');
})();