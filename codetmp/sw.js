/* 
  increase below number to trigger service worker update/reactivation
  to deliver latest updates for all users automatically on page visit
  
  unique numer : 30001
*/

let cacheName = 'codetmp-MTE0MDc5NjU';

// delete old cache versioning
// use manifest-cache.json for future updates
function clearOlderVersionCache() {
  caches.keys().then(function(c){
    c.map(function(cacheName){
      if (cacheName.split('-')[1].length <= 2) {
        caches.delete(cacheName);
      }
    });
  });
}

function extractUrlsFromJson(json) {
  let urls = [];
  for (let key in json) {
    if (key == "skip") {
      continue;
    }
    if (Array.isArray(json[key])) {
      urls = urls.concat(json[key]);
    }
  }
  return urls;
}

self.addEventListener('message', function(e) {
  if (e.data.action == 'skipWaiting') {
    self.skipWaiting();
  } else if (e.data && e.data.type == 'extension' && e.data.name !== null && e.data.name.length > 0) {
    cacheExtension(e); 
  }
});

self.addEventListener('install', function(event) {
  event.waitUntil(
    recache()
  );
});

function recache() {
  clearOlderVersionCache();
  return fetch('manifest-cache.json')
    .then(res => res.json())
    .then(json => {
      let cacheURLs = extractUrlsFromJson(json);
      caches.delete(cacheName)
      .then(() => {
        caches.open(cacheName)
        .then(function(cache) {
          return Promise.all(
            cacheURLs.map(function(url) {
              return cache.add(url).catch(function(error) {
                console.error('Failed to cache URL:', url, error);
              });
            })
          );
        })
        .then(function() {
          console.log('Files successfully cached.');
        })
        .catch(function(error) {
          console.log(error);
          console.log('Failed to cache all required files.');
        });
      });
    });
}

self.addEventListener('activate', function(e) {
  e.waitUntil(
    recache()
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

function cacheExtension(e) {
  	e.waitUntil(Promise.all([
      caches.open(cacheName).then(function(cache) {
        return cache.addAll(e.data.files);
      }),
      e.source.postMessage({ 
      	name: e.data.name, 
      	type: e.data.type,
      }),
    ]));
}