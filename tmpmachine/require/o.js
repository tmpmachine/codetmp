/*
v0.61 - 10 -- function hiding
*/

(function () {
  
  function roll(str, data, key, depth) {
    for (let i in data) {
      key[depth] = i;
      if (typeof(data[i]) == 'object')
        str = roll(str,data[i],JSON.parse(JSON.stringify(key)),depth+1);
      else
        str = str.replace((new RegExp('__'+key.join('.')+'__', 'g')), data[i]);
    }
    return str;
  }
    
  function doCallback(c, param) {
    return function () {
      c.apply(null,param);
    };
  }
  
  function listen(el, ev, callback) {
    el.addEventListener(ev, callback);
  }
    
  
  const o = {
    creps: function (str, data, modifyFunction) {
      str = $('#'+str).innerHTML;
      let i;
      let html = '';
      
      if (Array.isArray(data)) {
        let i = 0;
        for (let d of data) {
          if (modifyFunction !== undefined)
            d = modifyFunction(d, i);
            
          html += roll(str, d, [], 0);
          i++;
        }
      } else {
        if (modifyFunction !== undefined)
          data = modifyFunction(data);
        
        html += roll(str, data, [], 0);
      }
      
      return html;
    },
    classList: {
      toggle: function (els, className, force){
        if (typeof(els) == 'string')
          els = $(els);
        
        if (els[0] !== undefined) {
          for (let el of els) {
            o.classList.toggle(el, className, force);
          }
        } else {
          
          if (force !== undefined) {
            if (Array.isArray(className)) {
              els.classList.toggle(className[0], force);
              els.classList.toggle(className[1], !force);
            } else
              els.classList.toggle(className, force);
          } else {
            if (Array.isArray(className)) {
              els.classList.toggle(className[0]);
              els.classList.toggle(className[1]);
            } else
              els.classList.toggle(className);
          }
        }
      },
      replace: function (els, oldClass, newClass){
        if (typeof(els) == 'string')
          els = $(els);
        for (let el of els)
          el.classList.replace(oldClass,newClass);
      }
    },
  	cel: function (el, att) {
  	  el = document.createElement(el);
  	  if (att) {
    	  for (let i in att) {
    	    if (i === 'innerHTML')
    	      el.innerHTML = att[i];
    	    else
      	    el.setAttribute(i, att[i]);
    	  }
  	  }
  	  return el;
  	},
  	click: function (callback, type) {
      if (type === undefined) type = 'click';
      for (let i in callback) {
        if (i.startsWith('.')) {
          if ($(i) !== null) {
            for (let el of $(i)) {
              if (callback[i][0])
                listen(el, type, doCallback(callback[i][0].bind(el), callback[i][1]));
            }
          }
        } else if ($('#'+i) !== null) {
          if (callback[i][0])
            listen($('#'+i), type, doCallback(callback[i][0].bind($('#'+i)), callback[i][1]));
        } else {
          console.log('o.js (click) : element with id "'+i+'" not found');
        }
      }
    }
  };
  
  if (window.o === undefined) {
    window.o = o;
    window.$ = function(selector) {
      return (selector.indexOf('.') === 0) ? document.querySelectorAll(selector) : document.querySelector(selector);
    };
  } else {
    console.error('o.js:', 'Failed to initialize. Duplicate variable exists.');
  }
})();