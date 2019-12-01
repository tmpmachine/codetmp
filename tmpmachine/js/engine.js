let L = console.log;

const THOR = (function() {
  
  function authReady() {
    $('#btn-blogsphere-login').style.display = 'none';
    $('#btn-blogsphere-logout').style.display = 'block';
    
    if (fs.data.rootId === '')
      drive.readAppData();
    else {
      drive.syncFromDrive();
      drive.syncToDrive();
    }
    
    o.classList.toggle($('.auth-required'), ['unauthorized'], false);
    $('#txt-login-status').textContent = 'Logout';
    $('#login-info').style.visibility = 'hidden';
  }
  
  function authLogin() {
    $('#btn-blogsphere-login').style.display = 'none';
    $('#btn-blogsphere-logout').style.display = 'block';
  }
  
  function authLogout() {
    $('#login-info').style.visibility = 'visible';
    
    $('#btn-blogsphere-login').style.display = 'block';
    $('#btn-blogsphere-logout').style.display = 'none';
    
    $('#txt-login-status').textContent = 'Login';
    o.classList.toggle($('.auth-required'), ['unauthorized'], true);
  }
  
  return {
    plugins: {
      load(name, func) {
        
        THOR.plugins[name] = func;
      }
    },
    ready() {
      
      window.fs = new lsdb('B-THOR-fs', {
        root: {
          rootId: '',
          files: [],
          folders: [],
          blogs: [],
          sync: [],
          counter: {
            files: 0,
            folders: 0
          }
        },
      
        blogs: {
          name: '',
          id: ''
        },
        folders:{
          fid: 0,
          parentId: -1,
          
          id: '',
          name: '',
          description: '',
          modifiedTime: '',
          trashed: false,
        },
        files: {
          fid: 0,
          parentId: -1,
          modifiedTime: '',
          isLock: false,
          loaded: false,
          
          id: '',
          name: '',
          content: '',
          description: '',
          trashed: false,
        },
        sync: {
          action: '',
          fid: -1,
          source: -1,
          metadata: [],
          type: '',
        },
      });
      
      
      auth0.onready = authReady;
      auth0.onlogin = authLogin;
      auth0.onlogout = authLogout;
      auth0.config({
        portal: 'portal-8177',
        line: 'TMPmachine',
        redirect: (location.href.includes('file:')) ? false : true,
      });
      oblog.connect(auth0);
      
      updateUI();
    }

  };
})();



(function() {
  
  const require = (url) => {
    
    return new Promise((resolve, reject) => {
      
      let el;
      if (url.includes('.css')) {
        
        el = document.createElement('link');
        el.setAttribute('href', url);
        el.setAttribute('rel', 'stylesheet');
      } else {
        
        el = document.createElement('script');
        el.setAttribute('src', url);
      }
      
      el.onload = () => resolve(url);
      el.onerror = () => reject(url);
      document.head.appendChild(el);
    });
  };
  
  Promise.all([
    
    require('require/anibar.js'),
    require('require/lsdb.js'),
    require('require/plate.js'),
    require('require/o.js'),
    require('require/opopnomi.js'),
    require('require/odin.js'),
    require('require/auth0.js'),
    require('require/oblog.js'),
    require('require/aww.js'),
    require('require/w3-4.10.css'),
    
    require('js/idb.js'),
    require('js/renderer.js'),
    require('js/ux.js'),
    require('js/file-manager.js'),
    require('js/drive.js'),
    require('js/debug.js'),
    require('js/template.js'),
    
    require('ace/ace.js'),
    require('plugins/custom-editor-init.js'),
    require('plugins/drag-drop.js'),
  ]).then( () => {
    
    plate.tag.push({
      short: ' ',
      attributes: {
        class: 'w3-row'
      },
    });
    
    plate.cook();
    plate.tag = [];
        
    THOR.ready();
    
  }).catch( (s) => {
    
    console.log(s);
    console.log('Could not load one or more required file(s).');
  });
  
})();