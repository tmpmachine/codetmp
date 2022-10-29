L = console.log;
let cacheVersion = '32';
let cacheItem = 'codetmp-'+cacheVersion;
const ACE_CDN_BASEPATH = 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.9.6';

self.addEventListener('message', function(e) {
  if (e.data.action == 'skipWaiting') {
    self.skipWaiting();
  } else if (e.data && e.data.type == 'extension' && e.data.name !== null && e.data.name.length > 0) {
    cacheExtension(e); 
  }
});

self.addEventListener('install', function(event) {

  let urls = [
    '/',
    '/manifest.json',
    '/css/style.css',
    '/css/file-tree.css',
    
    '/assets/js/fflate.js',
    '/assets/js/sha256.js',

    // ace custom theme
    '/assets/ace/theme-codetmp-markdown.js',
    '/assets/ace/theme-codetmp.js',
    
    `${ACE_CDN_BASEPATH}/ace.js`,
    `${ACE_CDN_BASEPATH}/theme-github.js`,
    `${ACE_CDN_BASEPATH}/mode-html.js`,
    `${ACE_CDN_BASEPATH}/mode-json.js`,
    `${ACE_CDN_BASEPATH}/mode-css.js`,
    `${ACE_CDN_BASEPATH}/mode-javascript.js`,
    `${ACE_CDN_BASEPATH}/worker-html.js`,
    `${ACE_CDN_BASEPATH}/worker-json.js`,
    `${ACE_CDN_BASEPATH}/worker-css.js`,
    `${ACE_CDN_BASEPATH}/worker-javascript.js`,
    `${ACE_CDN_BASEPATH}/ext-searchbox.js`,
    `${ACE_CDN_BASEPATH}/ext-prompt.js`,
    `${ACE_CDN_BASEPATH}/ext-language_tools.js`,
    `${ACE_CDN_BASEPATH}/snippets/javascript.js`,
    `${ACE_CDN_BASEPATH}/snippets/html.js`,
    `${ACE_CDN_BASEPATH}/snippets/markdown.js`,
    '/assets/icons/folder_open.svg',
    '/assets/icons/folder_close.svg',

    '/assets/images/128.png',
    '/assets/images/128ap.png',
    '/assets/images/192.png', 
    '/assets/images/GitHub_Logo.png', 
    
    'https://fonts.googleapis.com/css2?family=Material+Icons+Round', 
    'https://fonts.gstatic.com/s/materialiconsround/v37/LDItaoyNOAY6Uewc665JcIzCKsKc_M9flwmP.woff2', 

    '/views/modals.html',
    '/views/templates.html',

    '/js/require/divless.js',
    '/js/require/o.js',
    '/js/require/lsdb.js',
    '/js/require/keyboard.js',
    '/js/require/odin.js',
    '/js/require/aww.js',
    '/js/require/jszip.min.js',

    '/js/components/ext-firebase.js',
    '/js/components/auth2helper.js',
    '/js/components/support.js',
    '/js/components/extension.js',
    '/js/components/preferences.js',
    '/js/components/modal.js',
    '/js/components/helper.js',
    '/js/components/tab-manager.js',
    '/js/components/file-reader.js',
    '/js/components/file-bundler.js',
    '/js/components/git.js',
    '/js/components/notifier.js',
    '/js/components/snippet-manager.js',
    '/js/components/preview-handler.js',
    '/js/components/clipboard.js',
    '/js/components/file-manager.js',
    '/js/components/file-tree.js',
    '/js/components/drive.js',
    '/js/components/keyboard-handler.js',
    '/js/components/defer-feature-1.js',
    '/js/components/defer-feature-2.js',
    '/js/components/single-file-generator.js',
    '/js/components/environment-manager.js',
    
    '/js/core/app.js',
    '/js/core/app-data.js',
    
    '/js/dom-events.js',
    '/js/ux.js',
    
    '/index.js',
  ];
 
  event.waitUntil(
    Promise.all([
      caches.open(cacheItem).then(function(cache) {
        return cache.addAll(urls);
      }),
    	self.skipWaiting(),
    ]).catch(error => {
      console.error(error);
    })
  );  
});

self.addEventListener('activate', function(e) {
  e.waitUntil(Promise.all([
    caches.keys().then(function(c) {
      c.map(function(cname) {
        if (!cname.endsWith(cacheVersion))
          caches.delete(cname);
      });
    }),
  	self.clients.claim(),
  ]));
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(resp) {
      if (resp)
        return resp;
      
      return fetch(e.request).then(function(r) {
        return r;
      }).catch(function() {
        console.error('Check connection.');
      });
    })
  );
});

function cacheExtension(e) {
  	e.waitUntil(Promise.all([
      caches.open(cacheItem).then(function(cache) {
        return cache.addAll(e.data.files);
      }),
      e.source.postMessage({ 
      	name: e.data.name, 
      	type: e.data.type,
      }),
    ]));
}