/*
v0.631 - 7 Juni 2020 -- removed query selectory
*/

(function () {
  
  function roll(str, data, key, depth) {
    for (let i in data) {
      key[depth] = i;
      if (typeof(data[i]) == 'object')
        str = roll(str, data[i], JSON.parse(JSON.stringify(key)), depth + 1);
      else
        str = str.replace((new RegExp('__'+key.join('.')+'__', 'g')), data[i]);
    }
    return str;
  }
    
  function listen(el, ev, callback) {
    el.addEventListener(ev, callback);
  }
  
  let $ = function(selector, node = document) {
    return (selector.indexOf('.') === 0) ? node.querySelectorAll(selector) : node.querySelector(selector);
  };
  
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
          for (let el of els)
            o.classList.toggle(el, className, force);
        } else if (els.length === 0)
          return;
        else {
          if (Array.isArray(className)) {
            els.classList.toggle(className[0], force);
            els.classList.toggle(className[1], (force !== undefined) ? !force : undefined);
          } else
            els.classList.toggle(className, force);
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
    listen: function (callback, type, node) {
      if (type === undefined) type = 'click';
      
      for (let i in callback) {
        if (i.startsWith('.')) {
          if ($(i, node) !== null) {
            for (let el of $(i, node))
              listen(el, type, callback[i].bind(el));
          }
        } else if ($('#'+i, node) !== null) {
          listen($('#'+i, node), type, callback[i].bind($('#'+i, node)));
        } else {
          console.log('o.js (listen) : element with id "'+i+'" not found');
        }
      }
    }
  };
  
  if (window.o === undefined) {
    window.o = o;
  } else {
    console.error('o.js:', 'Failed to initialize. Duplicate variable exists.');
  }
})();