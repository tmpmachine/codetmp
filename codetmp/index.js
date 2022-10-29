const ACE_CDN_BASEPATH = 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.9.6';
let activeWorkspace = 0;
let environment = {
  previewUrl: 'https://cpreview.web.app/',
};

window.app.loadFiles([
  {
    urls: [
      'views/modals.html',
      'views/templates.html',
    ],
  },
  {
  urls: [
    'js/components/ext-firebase.js',
      'assets/js/fflate.js',
      'assets/js/sha256.js',
      ],
      isConnectionRequired: true,
  },
  {
    urls: [
      'js/components/support.js',
      'js/components/helper.js',
      'js/components/extension.js',
      'js/components/preferences.js',
      'js/components/modal.js',
      'js/components/clipboard.js',
      'js/require/lsdb.js',
    ],
    callback: function() {
      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data.type) {
          switch (e.data.type) {
            case 'extension':
              extension.load(e.data.name);
              break;
          }
        }
      });
    }
  },
  {
    urls: [
      'js/core/app-data.js',
    ],
  },
  {
    urls: [
      'js/require/o.js',
      'js/require/keyboard.js',
      'js/require/odin.js',
      'js/components/preview-handler.js',
      'js/components/file-manager.js',
      'js/ux.js',
      'js/components/notifier.js',
      // 'assets/ace/ace.js',
      `${ACE_CDN_BASEPATH}/ace.min.js`,
      'js/components/tab-manager.js',
    ],
    callback: function() {
      ace.config.set('basePath', `${ACE_CDN_BASEPATH}`);
      fileManager.initIDBStorage();
    },
  },
  {
    urls: [
      'js/dom-events.js',
      'css/file-tree.css',
      'js/components/file-tree.js',
    ],
    callback: function() {
      initUI();
    },
  },
  {
    urls: [
      'js/components/keyboard-handler.js',
      'js/components/file-reader.js',
      'js/components/snippet-manager.js',
      'js/require/divless.js',
    ],
    callback: function() {
      fileReaderModule.init();
      keyboardHandler.init();
      initFileHandler();
    },
  },
  {
    urls: [
      'js/require/aww.js',
      'js/components/auth2helper.js',
      'js/components/drive.js',
      'js/components/defer-feature-1.js',
      'js/components/defer-feature-2.js',
    ],
  },
  {
    urls: [
      'https://apis.google.com/js/platform.js?onload=renderSignInButton',
    ],
  },
  {
    urls: [
      'js/components/git.js',
      'js/components/environment-manager.js',
      'js/components/single-file-generator.js',
      'js/components/file-bundler.js',
      'js/require/jszip.min.js',
    ],
    callback: function() {
      support.check('JSZip');
    },
  },
]);