const ACE_CDN_BASEPATH = '/assets/js/ace-builds@1.32.3/src-min-noconflict';
let activeWorkspace = 0;
let environment = {
  previewUrl: 'https://preview.codetmp7.dev/',
  previewUrlPWA: 'https://pwa.codetmp7.dev/',
};

// URL for cpreview. development-only.
/* environment = {
  previewUrl: 'https://glorious-space-robot-v6jp7v6g5wxcxw5-5000.app.github.dev/',
  previewUrlPWA: 'https://glorious-space-robot-v6jp7v6g5wxcxw5-5000.app.github.dev/',
}; */

app.loadFiles([
  {
    urls: [
      'views/modals.html',
      'views/templates.html',
      "assets/js/view-state-util.js",
      "js/view-states-map.js",
    ],
    callback: function() {
      viewStateUtil.Init(viewStatesMap);
    },
  },
  {
    urls: [
      "assets/js/idb@7/umd.js",
      "js/components/ext-firebase.js",
      "assets/js/fflate.js",
      "assets/js/sha256.js",
      "assets/js/templateslot@1.0.2.min.js",
    ],
    isConnectionRequired: true,
  },
  {
    urls: [
      "js/components/modal-window-component.js",
      "js/components/state-manager-component.js",
      "js/components/support.js",
      "js/components/helper.js",
      "js/components/extension.js",
      "js/components/preferences.js",
      "js/components/modal.js",
      "js/components/clipboard-component.js",
      "js/require/lsdb.js",
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
      "js/constant.js",
      "js/app-data.js",
      "assets/js/statelist-utility@v1.0.2/statelist.min.js",
    ],
  },
  {
    urls: [
      "js/components/editor-component.js",
      "js/require/o.js",
      "js/require/keyboard.js",
      "js/require/odin.js",
      "js/components/preview-handler.js",
      "js/components/file-manager.js",
      "js/ui.js",
      "js/uis/file-explorer-ui.js",
      "js/uis/tree-explorer-ui.js",
      "js/components/notif-component.js",
      "js/components/notifier.js",
      `${ACE_CDN_BASEPATH}/ace.js`,
      "js/components/tab-manager.js",
    ],
    callback: function() {
      previewHandler.Init(),

      ace.config.set('basePath', `${ACE_CDN_BASEPATH}`);
      ace.config.setModuleUrl("ace/theme/codetmp", "/assets/ace/theme-codetmp.js");
      ace.config.setModuleUrl("ace/theme/codetmp-markdown", "/assets/ace/theme-codetmp-markdown.js");

      fileManager.TaskInitIDBStorage();
    },
  },
  {
    urls: [
      "js/components/session-manager-component.js",
      "js/dom-events.js",
      "css/file-tree.css",
      "js/components/file-tree.js",
    ],
    callback: function() {
      ui.Init();
    },
  },
  {
    urls: [
      "js/components/key-input-component.js",
      "js/components/file-reader.js",
      "js/components/snippet-manager.js",
      "assets/js/divless-html@v1.0.1/divless.min.js",
    ],
    callback: function() {
      fileReaderModule.init();
      compoKeyInput.Init();
      ui.InitFileHandler();
    },
  },
  {
    urls: [
      "js/require/aww.js",
      "js/components/auth2helper.js",
      "js/components/drive.js",
      "js/components/defer-feature-1.js",
      "js/components/defer-feature-2.js",
    ],
  },
  {
    urls: [
      "https://apis.google.com/js/platform.js?onload=RenderSignInButton",
    ],
  },
  {
    urls: [
      "js/components/git.js",
      "js/components/environment-manager.js",
      "js/components/single-file-generator.js",
      "js/components/file-bundler.js",
      "js/require/jszip.min.js",
    ],
    callback: function() {
      support.check('JSZip');
    },
  },
  {
    urls: [
      "assets/js/source-map@0.7.3/source-map.js",
      "assets/js/terser/bundle.min.js",
    ],
  },
]);

function RenderSignInButton() {
  gapi.signin2.render('g-signin2', {
    'scope': 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive'+auth2.additionalScopes,
    'width': 240,
    'height': 50,
    'longtitle': true,
    'theme': 'dark',
    'onsuccess': (googleUser) => {
      auth2.onSignIn(googleUser);
      app.AuthReady();
    },
  });
}