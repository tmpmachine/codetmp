L = console.log;
let cacheVersion = '1.16';
let cacheItem = 'cpreview-'+cacheVersion;
let messagePort;
let resolverQueue = {};
let uid = 0;
let isRelinkingMessagePort = false;
let rere;

self.addEventListener('message', function(e) {
  if (typeof(e.data) == 'undefined')
      return;

  switch (e.data.message) {
    case 'skipWaiting':
      self.skipWaiting();
    break;
    case 'init-message-port':
      messagePort = e.ports[0];
      e.source.postMessage({ message: 'message-port-opened' });
    break;
    case 'reinit-message-port':
      messagePort = e.ports[0];
      isRelinkingMessagePort = false;
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
    case 'response-file-multimedia':
      	let data = e.data.content;
      	let request = new Request(data.contentLink, {
    		method: 'GET',
    		headers: {
			    Authorization: 'Bearer '+data.accessToken,
    		},
  		});
      	if (data.source == 'git') {
      		request = new Request(data.contentLink);
      	}
      	fetch(request)
      	.then(resolverQueue['R'+e.data.resolverUID])
      	.catch(resolverQueue['R'+e.data.resolverUID]);
    break;
  }
});

self.addEventListener('install', function(event) {
  let urls = [
    '/',
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

function checkMessagePort() {
  return new Promise((resolve, reject) => {
    self.clients.matchAll({
      includeUncontrolled: true,
      type: 'window',
    }).then((clients) => {
      if (messagePort) {
        resolve();
      } else {
        let hasClient = false;
        if (clients && clients.length) {
          for (let client of clients) {
            if(client.url == location.origin+'/') {
              hasClient = true;
              if (!isRelinkingMessagePort) {
                client.postMessage({ message: 'port-missing' });
                isRelinkingMessagePort = true;
              }
              let timeout = 3000;
              let waiting = setInterval(() => {
                timeout -= 10;
                if (timeout === 0) {
                  clearInterval(waiting);
                  reject();
                }
                if (messagePort) {
                  clearInterval(waiting);
                  resolve();
                }
              }, 10)
              break;
            }
          }
        }
        if (!hasClient)
          reject();
      }
    });    
  })
}

function responseBySearch(e, resolve) {
  checkMessagePort().then(() => {
    resolverQueue['R'+uid] = resolve;
    messagePort.postMessage({ 
      path: e.request.url.replace(location.origin, ''),
      resolverUID: uid,  
    });
    uid++;
  }).catch(() => {
    resolve(new Response('Error: missing port. Make sure Codetmp is already open. If this problem persist try using another browser or switch to in-frame preview mode.', {headers: {'Content-Type': 'text/html;charset=UTF-8'} }))
  })
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

  } else if (e.request.url == location.origin+'/codetmp/files') {

    e.respondWith(

      new Promise(function request(resolve) {

        checkMessagePort().then(() => {
          e.request.json().then(body => {
            messagePort.postMessage({ 
              body,  
              path: e.request.url.replace(location.origin, ''),
              referrer: e.request.referrer.replace(location.origin, ''),
              resolverUID: uid,
              method: e.request.method,
            });
            resolverQueue['R'+uid] = resolve;
            uid++;
          })
        }).catch(() => {
          resolve(new Response('Error: missing port. Make sure Codetmp is already open. If this problem persist try using another browser or switch to in-frame preview mode.', {headers: {'Content-Type': 'text/html;charset=UTF-8'} }))
        }) 

      }).then((respomse) => {
        return respomse;
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