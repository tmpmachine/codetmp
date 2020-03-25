self.addEventListener('message',function(e){
  if (e.data.action == 'skipWaiting')
    self.skipWaiting();
});


let cacheVersion = '0.02';
let cacheItem = 'tmp'+cacheVersion;

self.addEventListener('install',function(event) {
  
  let urls = ['/'];
 
  event.waitUntil(
    caches.open(cacheItem).then(function(cache){
      return cache.addAll(urls);
    })
  );
  
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(c){
      c.map(function(cname){
        if (!cname.endsWith(cacheVersion))
          caches.delete(cname);
      });
    })
  );
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