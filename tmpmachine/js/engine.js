L = console.log;

(function() {
  
  function loadStorageData() {
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
        isSync: false
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
    
    window.settings = new lsdb('TmP-settings', {
      root: {
        drive: {
          startPageToken: ''
        },
        wrapMode: false,
        autoSync: true,
      }
    });
  }
  
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
    new Promise(resolve => {
      let interval = setInterval(() => {
        if (document.querySelector('#btn-menu-preview').firstElementChild.scrollWidth > 50) return;
        clearInterval(interval);
        resolve();
      }, 100);
    })
  ]).then(() => {
    document.body.removeChild(document.querySelector('#preload-material'));
  });
  
  let URL1 = [
    'require/o.js',
    'require/keyboard.js',
    'require/anibar.js',
    'require/lsdb.js',
    'require/odin.js',
    'js/renderer.js',
    'js/file-manager.js',
    'js/ux.js',
    'ace/ace.js',
    ];
  
  let URL2 = [
    'js/template.js',
    'require/plate.js',
    ];
  
  let URL3 = [
    'require/aww.js',
    'require/auth0.js',
    'require/oblog.js',
    'js/git.js',
    'js/drive.js',
    ];
  
  function loadBundle(URLs) {
    return new Promise(resolve => {
      let bundleURL = [];
      for (let URL of URLs)
        bundleURL.push(require(URL));
      Promise.all(bundleURL).then(() => {
        resolve();
      }).catch( (s) => {
        console.log(s);
        console.log('Could not load one or more required file(s).');
      });
    });
  }
  
  loadBundle(URL1).then(() => {
    
    loadStorageData();
    ace.config.set('basePath', 'ace');
    updateUI();
    
    loadBundle(URL2).then(() => {
      
      loadBundle(URL3).then(() => {
        
        auth0.onready = authReady;
        auth0.onlogin = authLogin;
        auth0.onlogout = authLogout;
        auth0.config({
          portal: 'portal-8177',
          line: 'TMPmachine',
          redirect: (location.href.includes('file:')) ? false : true,
        });
        oblog.connect(auth0);
        loadSnippets();
      });
    });
  });
  
})();