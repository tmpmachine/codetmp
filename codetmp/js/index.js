L = console.log;
$ = function(selector, node=document) { let nodes = node.querySelectorAll(selector); return selector.startsWith('#') ? nodes[0] : nodes }

const requireExternalFiles = (url) => {  
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

function loadExternalFiles(URLs) {
  return new Promise(resolve => {
    let bundleURL = [];
    for (let URL of URLs)
      bundleURL.push(requireExternalFiles(URL));
    Promise.all(bundleURL).then(() => {
      resolve();
    }).catch(error => {
      console.log(error);
      console.log('Could not load one or more required file(s).');
    });
  });
}

(function() {
  
  function loadStorageData() {
    window.fileStorage = new lsdb('file-storage', {
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
    
    window.settings = new lsdb('settings', {
      root: {
        token: '',
        drive: {
          startPageToken: ''
        },
        editor: {
          enableEmmet: false,
          enableAutocomplete: true,
        },
        wrapMode: false,
        autoSync: true,
      }
    });
  }
  
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
    'require/lsdb.js',
    'require/odin.js',
    'js/preview.js',
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
    'require/oblog.js',
    'require/auth2helper.js',
    'js/drive.js',
    ];

  let URL4 = [
    'js/git.js',
    'https://apis.google.com/js/platform.js?onload=renderButton',
    ];
  
  loadExternalFiles(URL1).then(() => {
    
    loadStorageData();
    ace.config.set('basePath', 'ace');
    initUI();
    logWarningMessage();
    
    loadExternalFiles(URL2).then(() => {
      
      loadExternalFiles(URL3).then(() => {
        loadExternalFiles(URL4).then(() => {
        
        });
        
      });
    });
  });
  
})();