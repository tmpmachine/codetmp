import { GetEnv } from './environment.js';

let environment = GetEnv();
let ACE_CDN_BASEPATH = '/assets/js/packages/ace-builds/src-min-noconflict';
let activeWorkspace = 0;

// use window while migrating script to module
window.environment = environment;
window.activeWorkspace = activeWorkspace;
window.ACE_CDN_BASEPATH = ACE_CDN_BASEPATH;

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
      "js/components/firebase-hosting-component.js",
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
      "js/utils/wait.js",
      "js/utils/helper-utils.js",
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
      "js/require/keyboard.js",
      "js/components/preview-component.js",
      "js/components/file-manager-component.js",
      "js/ui.js",
      "js/uis/file-explorer-ui.js",
      "js/uis/file-tab-ui.js",
      "js/uis/tree-explorer-ui.js",
      "js/components/notif-component.js",
      "js/components/notifier.js",
      `${ACE_CDN_BASEPATH}/ace.js`,
      "js/components/file-tab-component.js",
      "assets/js/packages/@isomorphic-git/lightning-fs/lightning-fs.min.js",
      "assets/js/packages/isomorphic-git/index.umd.min.js",
    ],
    callback: function() {
      compoPreview.Init(),

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
      "js/components/file-tree-component.js",
    ],
    callback: function() {
      ui.Init();
    },
  },
  {
    urls: [
      "js/widgets/quick-search-widget.js",
      "js/components/key-input-component.js",
      "js/components/file-reader-component.js",
      "js/components/snippet-component.js",
      "assets/js/divless-html@v1.0.1/divless.min.js",
    ],
    callback: function() {
      compoSnippet.InitAsync();
      compoFileReader.init();
      compoKeyInput.Init();
      ui.InitFileHandler();
    },
  },
  {
    urls: [
      "js/require/aww.js",
      "js/components/drive-component.js",
      "js/components/defer-feature-2.js",
    ],
  },
  {
    urls: [
      "js/components/git.js",
      "js/components/environment-manager.js",
      "js/components/single-file-generator.js",
      "js/components/file-bundler-component.js",
      "js/require/jszip.min.js",
    ],
    callback: function() {
      support.check('JSZip');
    },
  },
  {
    urls: [
      "assets/js/source-map@0.7.3/source-map.js",
      "js/components/gsi-component.js",
      "https://accounts.google.com/gsi/client",
      "assets/js/terser/bundle.min.js",
    ],
    callback: function() {
      compoGsi.InitTokenClient();
      appData.GetComponentData('compoGsi', (data) => {
        compoGsi.InitData(data);
      });
    }
  },
]);