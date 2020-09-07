L = console.log;
let HTMLCache = '';
let cacheVersion = '1.0364';
let cacheItem = 'attemp-'+cacheVersion;

self.addEventListener('message', function(e) {
  if (e.data && e.data.action == 'skipWaiting') {
    self.skipWaiting();
  } else if (e.data && e.data.type == 'store') {
    HTMLCache = e.data.html;
    caches.open(cacheItem).then(function(cache) {
      return cache.addAll(['/']);
    });
    
    e.source.postMessage({message:'cached'});
  }
});

self.addEventListener('install', function(event) {
  let urls = [
    '/storage-manager.html',
  ];
 
  event.waitUntil(Promise.all([
  	self.skipWaiting(),
    caches.open(cacheItem).then(function(cache) {
      return cache.addAll(urls);
    }),
  ]));
});

self.addEventListener('activate', function(e) {
  e.waitUntil(Promise.all([
  	self.clients.claim(),
    caches.keys().then(function(c) {
      c.map(function(cname) {
        if (!cname.endsWith(cacheVersion))
          caches.delete(cname);
      });
    }),
  ]));
});

self.addEventListener('fetch', function(e) {

  if (e.request.url == location.origin+'/') {
    e.respondWith(
      caches.match(e.request).then(function(resp) {
        if (resp) {
          return new Response(HTMLCache, {headers:{'Content-Type': 'text/html;charset=UTF-8'}});
        }
        return fetch(e.request).then(function(r) {
          return r;
        }).catch(function() {
          console.error('Check connection.');
        });
      })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(function(resp) {
        if (resp) return resp;
        return fetch(e.request).then(function(r) {
          return r;
        }).catch(function() {
          console.error('Check connection.');
        });
      })
    );
  }
});