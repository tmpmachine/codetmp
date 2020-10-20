L = console.log;
let cacheVersion = '1';
let cacheItem = 'cpreview-'+cacheVersion;
let messagePort;
let resolverQueue = {};
let uid = 0;

self.addEventListener('message', function(e) {
  if (typeof(e.data) == 'undefined')
      return;

  switch (e.data.message) {
    case 'skipWaiting':
      self.skipWaiting();
    break;
    case 'check-message-port':
      if (messagePort) {
        e.source.postMessage({ message: 'port-opened' });
      } else {
        e.source.postMessage({ message: 'port-closed' });
      }
    break;
    case 'init-message-port':
      messagePort = e.ports[0];
      e.source.postMessage({ message: 'message-port-opened' });
    break;
    case 'response-file':
      let response;
      if (e.data.content == '<404/>') {
        response = new Response('Not found', {status: 404, statusText: 'not found'});
      } else {
        response = new Response(e.data.content, {headers:{'Content-Type': e.data.mime}});
      }
      resolverQueue['R'+e.data.resolverUID](response);
    break;
  }
});

self.addEventListener('install', function(event) {
  let urls = [
    '/',
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

function responseBySearch(e, resolve) {
  if (messagePort) {
    messagePort.postMessage({ 
      path: e.request.url.replace(location.origin, ''),
      resolverUID: uid,  
    });
    resolverQueue['R'+uid] = resolve;
    uid++;
  } else {
    resolve(new Response('Not found.', {headers: {'Content-Type': 'text/html;charset=UTF-8'} }))
  }
}

function responseByFetch(e, resolve) {
  fetch(e.request).then(function(r) {
    resolve(r);
  });
}

self.addEventListener('fetch', function(e) {

  if (e.request.url == location.origin+'/') {
    e.respondWith(
      caches.match(e.request).then(function(resp) {
        if (resp) {
          return resp;
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

      new Promise(function request(resolve) {

        caches.match(e.request).then(function(resp) {

          if (resp) resolve(resp);

          if (e.request.url.includes(location.origin)) {
            responseBySearch(e, resolve);
          } else {
            responseByFetch(e, resolve);
          }

        });

      }).then((respomse) => {
        return respomse;
      })

    );
  }
});