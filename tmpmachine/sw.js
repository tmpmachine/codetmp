L = console.log;
let cacheVersion = '1.22';
let cacheItem = 'tmp-'+cacheVersion;

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

    '/images/128.png',
    '/images/128ap.png',
    '/images/192.png',
    '/images/google/1x/btn_google_signin_dark_normal_web.png',
    '/images/google/1x/btn_google_signin_dark_focus_web.png',
    '/images/google/1x/btn_google_signin_dark_pressed_web.png',

    '/require/anibar.js',
    '/require/plate.js',
    '/require/o.js',
    '/require/lsdb.js',
    '/require/keyboard.js',
    '/require/odin.js',
    '/require/auth0.js',
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