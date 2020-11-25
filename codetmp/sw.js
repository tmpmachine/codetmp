L = console.log;
let cacheVersion = '6.275';
let cacheItem = 'codetmp-'+cacheVersion;

self.addEventListener('message', function(e) {
  if (e.data.action == 'skipWaiting') {
    self.skipWaiting();
  } else if (e.data && e.data.type == 'enableEmmet') {
  	e.waitUntil(Promise.all([
      caches.open(cacheItem).then(function(cache) {
        return cache.addAll([
        	'/ace/emmet-core/emmet.js',
        	'/ace/ext-emmet.js',
        ]);
      }),
      e.source.postMessage({message:'emmet-cached'}),
    ])); 
  } else if (e.data && e.data.type == 'enableAutocomplete') {
    e.waitUntil(Promise.all([
      caches.open(cacheItem).then(function(cache) {
        return cache.addAll([
          '/ace/ext-language_tools.js',
          '/ace/snippets/javascript.js',
          '/ace/snippets/html.js',
        ]);
      }),
      e.source.postMessage({message:'language_tools-cached'}),
    ])); 
  }
});

self.addEventListener('install', function(event) {

  let urls = [
    '/',
    '/style.css',
    '/ace/theme-monokai.js',
    '/ace/theme-github.js',
    '/ace/mode-html.js',
    '/ace/mode-json.js',
    '/ace/mode-css.js',
    '/ace/mode-javascript.js',
    '/ace/worker-html.js',
    '/ace/worker-json.js',
    '/ace/worker-css.js',
    '/ace/worker-javascript.js',
    '/ace/ext-searchbox.js',
    '/ace/ext-prompt.js',

    '/images/128.png',
    '/images/128ap.png',
    '/images/192.png',
    '/images/google/1x/btn_google_signin_dark_normal_web.png',
    '/images/google/1x/btn_google_signin_dark_focus_web.png',
    '/images/google/1x/btn_google_signin_dark_pressed_web.png',

    '/require/plate.js',
    '/require/o.js',
    '/require/auth2helper.js',
    '/require/lsdb.js',
    '/require/keyboard.js',
    '/require/odin.js',
    '/require/oblog.js',
    '/require/aww.js',

    '/js/git.js',
    '/js/template.js',
    '/js/preview.js',
    '/js/ux.js',
    '/js/file-manager.js',
    '/js/drive.js',
    '/js/index.js',
    
    '/ace/ace.js',
    '/fonts/materialicons/v48/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2',
  ];
 
  event.waitUntil(Promise.all([
    caches.open(cacheItem).then(function(cache) {
      return cache.addAll(urls);
    }),
  	self.skipWaiting(),
  ]));  
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