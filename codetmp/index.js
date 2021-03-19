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
        isSync: false,
        isTemp: false,
      },
      files: {
        fid: 0,
        parentId: -1,
        modifiedTime: '',
        isLock: false,
        isTemp: false,
        loaded: false,
        
        thumbnailLink: '',
        id: '',
        name: '',
        content: '',
        description: {},
        trashed: false,
        fileRef: {},
      },
      sync: {
        action: '',
        fid: -1,
        source: -1,
        metadata: [],
        type: '',
        isTemp: false,
      },
    });
    
    window.settings = new lsdb('settings', {
      root: {
        gitToken: '',
        drive: {
          startPageToken: ''
        },
        editor: {
          emmetEnabled: false,
          autoCompleteEnabled: true,
          divlessHTMLEnabled: true,
          wordWrapEnabled: true,
        },
        showHomepage: true,
        autoSync: true,
        saveGitToken: false,
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
    document.querySelector('#preload-material').parentNode.removeChild(document.querySelector('#preload-material'));
  });
  
  let components = [
    {
      urls: [
        'js/api.js',
        'js/helper.js',
        'js/extension.js',
        'js/preferences.js',
        'js/modal.js',
      ],
    },
    {
      urls: [
        'require/o.js',
        'require/keyboard.js',
        'require/lsdb.js',
        'require/odin.js',
        'js/preview.js',
        'js/file-manager.js',
        'js/ux.js',
        'ace/ace.js',
      ],
      callback: function() {
        loadStorageData();
        logWarningMessage();
        ace.config.set('basePath', 'ace');
        initUI();
      },
    },
    {
      urls: [
        'js/file-reader.js',
        'js/template.js',
        'require/divless.js',
      ],
      callback: function() {
        fileReaderModule.init();
      },
    },
    {
      urls: [
        'require/aww.js',
        'require/oblog.js',
        'require/auth2helper.js',
        'js/drive.js',
      ],
    },
    {
      urls: [
        'js/git.js',
        'https://apis.google.com/js/platform.js?onload=renderButton',
      ],
    },
    {
      urls: [
        'require/jszip.min.js',
      ],
      callback: function() {
      	isSupport.check('JSZip');
      },
    },
  ];

  function loadComponents() {
    if (index >= 0 && components[index].callback)
      components[index].callback();
    index++;
    if (index < components.length)
      loadExternalFiles(components[index].urls).then(loadComponents);
  }

  let index = -1;
  loadComponents();
})();