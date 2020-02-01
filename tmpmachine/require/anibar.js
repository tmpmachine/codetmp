/*
0.011 - 31 July 2019 - added toggle function
*/

(function () {
  
  function Anibar() {
    
    let elementPrefix;
    
    this.open = function(event) {
      
      document.querySelector('.anibar-'+elementPrefix+'-menu').classList.toggle('anibar--active', true);
      document.querySelector('.anibar-'+elementPrefix+'-pusher').classList.toggle('anibar--active', true);
      if (event)
        event.stopPropagation();
    };

    this.close = function() {
      document.querySelector('.anibar-'+elementPrefix+'-menu').classList.toggle('anibar--active', false);
      document.querySelector('.anibar-'+elementPrefix+'-pusher').classList.toggle('anibar--active', false);
    };
    
    this.toggle = function(event) {
      document.querySelector('.anibar-'+elementPrefix+'-menu').classList.toggle('anibar--active');
      document.querySelector('.anibar-'+elementPrefix+'-pusher').classList.toggle('anibar--active');
      return document.querySelector('.anibar-'+elementPrefix+'-menu').classList.contains('anibar--active');
    };
    
    let init = function(prefix) {
      
      elementPrefix = prefix;
      
      if (document.querySelector('.anibar-'+prefix+'-pusher').classList.contains('anibar--blocker'))
        document.querySelector('.anibar-'+prefix+'-pusher').addEventListener('click', this.close);
      let style = document.createElement('style');
      style.innerHTML = `
        #${prefix} {
          overflow: hidden;
          position: relative;
        }
        
        .anibar-${prefix}-pusher {
          height: 100%;
        	position: relative;
        	z-index: 1;
        	background: #272822;
        	-webkit-transition: -webkit-transform 0.5s;
        	transition: transform 0.5s;
        }
        
        .anibar-${prefix}-pusher.anibar--blocker::after {
        	position: absolute;
        	top: 0;
        	right: 0;
        	width: 100%;
        	height: 100%;
        	transform: translateX(100%);
        	background: rgba(0,0,0,0.2);
        	content: '';
        	opacity: 0;
        	-webkit-transition: opacity 0.5s;
        	transition: opacity 0.5s;
        }
        
        .anibar-${prefix}-menu {
        	position: absolute;
        	width: 300px;
        	height: 100%;
        	background: #48a770;
        	-webkit-transition: all 0.5s;
        	transition: all 0.5s;
        }
        
        .anibar--active.anibar-${prefix}-pusher.anibar--blocker::after {
        	opacity: 1;
        	transform: translateX(0%);
        }
  
        .anibar--active.anibar-${prefix}-pusher {
        	-webkit-transform: translateX(300px);
        	transform: translateX(300px);
        }
        
        .anibar-${prefix}-menu {
        	-webkit-transform: translateX(-50%);
        	transform: translateX(-50%);
        }
        
        .anibar--active.anibar-${prefix}-menu {
        	-webkit-transform: translateX(0);
        	transform: translateX(0);
        }
          
        @media (max-width:600px) {
          
          .anibar-${prefix}-menu {
            width: 100%;
            height: 100%;
            z-index: 2;
            -webkit-transform: translateX(-100%);
          	transform: translateX(-100%);
          }
        }`;
      document.body.appendChild(style);
      return this;
    };
    
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    
    return init.bind(this);
  }
  
  if (window.aww === undefined)
    window.anibar = new Anibar();
  else
    console.error('anibar.js:', 'Failed to initialize. Duplicate variable exists.');
})();