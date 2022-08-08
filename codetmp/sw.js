L = console.log;
let cacheVersion = '24';
let cacheItem = 'codetmp-'+cacheVersion;

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
    '/css/style.css',
    '/css/file-tree.css',
    
    '/assets/ace/ace.js',
    '/assets/ace/theme-codetmp-markdown.js',
    '/assets/ace/theme-codetmp.js',
    '/assets/ace/theme-github.js',
    '/assets/ace/mode-html.js',
    '/assets/ace/mode-json.js',
    '/assets/ace/mode-css.js',
    '/assets/ace/mode-javascript.js',
    '/assets/ace/worker-html.js',
    '/assets/ace/worker-json.js',
    '/assets/ace/worker-css.js',
    '/assets/ace/worker-javascript.js',
    '/assets/ace/ext-searchbox.js',
    '/assets/ace/ext-prompt.js',
    '/assets/ace/ext-language_tools.js',
    '/assets/ace/snippets/javascript.js',
    '/assets/ace/snippets/html.js',
    '/assets/ace/snippets/markdown.js',
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