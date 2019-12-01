/*
v0.03 -- 12 aug 19 -- encapsulation
*/

(function () {
  
  function Room(cls) {
  
    let $ = function(selector) {
      return document.querySelectorAll(selector);
    };
      
    this.shambles = function (index) {
    
      let totEl = $('.'+cls).length;
      if (index >= 0) {
        
        for (let i=0; i<totEl; i++) {
          
          let element = $('.'+cls)[i];
          if (element.dataset.room == index) {
            element.style.display = '';
            element.classList.toggle(cls+'--active', true);
          } else {
            element.style.display = 'none';
            element.classList.toggle(cls+'--active', false);
          }
        }
      } else if (index == -1 || typeof(index) == 'undefined') {
        
        if (typeof(index) == 'undefined')
          index = 1;
        
        for (let i=0; i<totEl; i++) {
          
          let element = $('.'+cls)[i];
          if (element.classList.contains(cls+'--active')) {
            
            element.classList.toggle(cls+'--active', false);
            element.style.display = 'none';
            
            let target = 0;
            if (i + index >= 0 && i + index < totEl)
              target = i + index;
            else if (i + index == -1)
              target = totEl - 1;
            
            let targetElement = $('.'+cls)[target];
            targetElement.style.display = '';
            targetElement.classList.toggle(cls+'--active', true);
              
            break;
          }
        }
      }
    };
  
    /* display the first room by default */
    (function () {
      
      if ($('.'+cls).length < 1) return;
      
      let active = -1;
      let totEl = $('.'+cls).length;
      for (let i=1; i<totEl; i++) {
        
        let element = $('.'+cls)[i];
        if (element.classList.contains(cls+'--active')) {
          active = i;
          element.style.display = '';
        } else {
          element.style.display = 'none';
        }
      }
      
      if (active >= 0)
        $('.'+cls)[0].style.display = 'none';
      else
        $('.'+cls)[0].classList.toggle(cls+'--active', true);
    })();
    
    return this;
  }
  
  if (window.room === undefined)
    window.room = function(cls) {
      return (new Room(cls));
    };
  else
    console.error('opopnomi.js', 'Failed to initialize. Duplicate variable exists.');
    
})();