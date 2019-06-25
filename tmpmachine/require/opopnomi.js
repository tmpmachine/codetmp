// v0.01 -- 10 june 19 -- project started

function room(cls) {
  
  let active = -1;
  for (let i=1; i<$('.'+cls).length; i++)
  {
    if ($('.'+cls)[i].classList.contains(cls+'--active'))
    {
      active = i;
      $('.'+cls)[i].style.display = '';
    }
    else
      $('.'+cls)[i].style.display = 'none';
  }
  
  if (active >= 0)
    $('.'+cls)[0].style.display = 'none';
  else
    $('.'+cls)[0].classList.toggle(cls+'--active', true);
  
  this.cls = cls;
  return this;
}

room.prototype.shambles = function(index) {
  
  if (index >= 0)
  {
    for (let i=0; i<$('.'+this.cls).length; i++)
    {
      $('.'+this.cls)[i].style.display = 'none';
      $('.'+this.cls)[i].classList.toggle(this.cls+'--active', false);
    }
    
    $('.'+this.cls)[index].style.display = '';
    $('.'+this.cls)[index].classList.toggle(this.cls+'--active', true);
    return;
  }
  else if (index == -1 || typeof(index) == 'undefined')
  {
    if (typeof(index) == 'undefined')
      index = 1;
    
    for (let i=0; i<$('.'+this.cls).length; i++)
    {
      if ($('.'+this.cls)[i].classList.contains(this.cls+'--active'))
      {
        $('.'+this.cls)[i].classList.toggle(this.cls+'--active', false);
        $('.'+this.cls)[i].style.display = 'none';
        
        let target = 0;
        if (i + index >= 0 && i + index < $('.'+this.cls).length)
          target = i + index;
        else if (i + index == -1)
          target = $('.'+this.cls).length - 1;
        
        $('.'+this.cls)[target].style.display = '';
        $('.'+this.cls)[target].classList.toggle(this.cls+'--active', true);
          
        break;
      }
    }
  }
};