/*
v0.58 - 9 july 19 -- removed console.log and console.error
v0.57 - 26 april 19 -- fix o creps for batch data non array
v0.56 - 28 mar -- compatibility mode, rollback to var from let
v0.55 - 30 jan -- added console error, change o.core to o.fill
v0.54 - 24 dec -- added log for quick parameter logging
v0.53 - 9 dec -- fix this selector for o.click class elements
v0.52 - 7 dec -- add listener for element, fix remove o.jsp
v0.51 - 6 dec -- add binding this to element on click()
v0.502 - 4 dec -- add modify function to creps
v0.501 - 4 dec -- listener can not affect classes elements
v0.50 - 4 dec -- remove console log function for o.listener
v0.491 - 3 dec -- some little changes & optimization
v0.49 - 30 nov -- change L pointer to console.log
v0.48 - 29 nov -- creps using underscore instead of dash, flavour parameter removed
v0.47 - 27 nov -- cooking several creps at a time, toggleClass use ES6 classList
v0.46 - 19 sep -- fixing roll
v0.45 - 18 sep -- optimize code @ 196 lines with roll
v0.44 - 18 sep -- optimize code error
v0.43 - 13 sep -- optimize code @ 215 lines
v0.42 - 11 sep -- fixing o.once
*/

const o = {
  roll: function(str, data, key, depth) {
    for (var i in data)
    {
      key[depth] = i;
      if (typeof(data[i]) == 'object')
        str = this.roll(str,data[i],JSON.parse(JSON.stringify(key)),depth+1);
      else
      {
        str = str.replace((new RegExp('__'+key.join('.')+'__', 'g')), data[i]);
      }
    }
    return str;
  },
  creps: function(str, data, modifyFunction) {
    str = $('#'+str).innerHTML;
    var i;
    var html = '';
    
    if (Array.isArray(data))
    {
      var i = 0;
      for (var d of data)
      {
        if (modifyFunction !== undefined)
          d = modifyFunction(d, i);
          
        html += this.roll(str, d, [], 0);
        i++;
      }
    }
    else
    {
      if (modifyFunction !== undefined)
        data = modifyFunction(data);
      
      html += this.roll(str, data, [], 0);
    }
    
    return html;
  },
  classList: {
    toggle: function(els,className,force){
      if (typeof(els) == 'string')
        els = $(els);
        
      if (els[0] !== undefined)
      {
        for (var el of els)
          o.classList.toggle(el,className,force);
      }
      else
      {
        if (force !== undefined)
        {
          if (Array.isArray(className))
          {
            els.classList.toggle(className[0],force);
            els.classList.toggle(className[1],!force);
          }
          else
            els.classList.toggle(className,force);
        }
        else
        {
          if (Array.isArray(className))
          {
            els.classList.toggle(className[0]);
            els.classList.toggle(className[1]);
          }
          else
            els.classList.toggle(className);
        }
      }
    },
    replace: function(els,oldClass,newClass){
      if (typeof(els) == 'string')
        els = $(els);
      for (var el of els)
        el.classList.replace(oldClass,newClass);
    }
  },
	cel: function(el,att) {
	  el = document.createElement(el);
	  if (att)
	  {
  	  for (var i in att)
  	  {
  	    if (i === 'innerHTML')
  	      el.innerHTML = att[i];
  	    else
    	    el.setAttribute(i,att[i]);
  	  }
	  }
	  return el;
	},
	callback: function(c,param) { return function(){ c.apply(null,param) } },
  listen: function(el,ev,callback){ el.addEventListener(ev,callback) },
  click: function(callback,type) {
    if (type === undefined) type = 'click';
    for (var i in callback)
    {
      if (i.startsWith('.'))
      {
        if ($(i) !== null)
        {
          for (var el of $(i))
          {
            if (callback[i][0])
              this.listen(el,type,this.callback(callback[i][0].bind(el),callback[i][1]));
          }
        }
      }
      else if ($('#'+i) !== null)
      {
        if (callback[i][0])
          this.listen($('#'+i),type,this.callback(callback[i][0].bind($('#'+i)),callback[i][1]));
      }
      else
        L('o.js (click) : element with id "'+i+'" not found');
    }
  },
  listener: function(el,ev,callback) {
    this.listen(el,ev,this.callback(callback[0].bind(el),callback[1]));
  },
  input: function(callback) {
    this.click(callback,'input');
  },
  fill: function(el,object) {
    if (typeof(el) == 'string') el = $(el);
    if (el[0] !== undefined)
    {
      for (var i=0; i<el.length; i++)
        o.core(el[i],object);
    }
    else
    {
      var data = el.getAttribute('data').split('.');
      for (var i=0; i<data.length-1; i++)
        object = object[data[i]];

      el.value = object[data[i]];
    }
  },
  tame: function(txt) {
    var wild = txt.match(/\(|\)|\+|\*|\[|\?|\^|\$|\|/g);
    var wildBox = [];
    txt = txt.replace(new RegExp('\\\\','g'),'\\\\');
    if (wild !== null)
    {
      for (var i=0; i<wild.length; i++)
      {
        if (wildBox.indexOf(wild[i]) < 0)
        {
          txt = txt.replace(new RegExp('\\'+wild[i],'g'),'\\'+wild[i]);
          wildBox.push(wild[i]);
        }
      }
    }
    return txt;
  },
  log: function(e) {
    L(e);
  }
};

$ = function(selector) {
  return (selector.indexOf('.') === 0) ? document.querySelectorAll(selector) : document.querySelector(selector);
};