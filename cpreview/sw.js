let asd = L = console.log;
let cacheVersion = '7';
let cacheItem = 'cpreview-'+cacheVersion;
let messagePort;
let resolverQueue = {};
let uid = 0;
let catchedBlob = {};
let isRelinkingMessagePort = false;

function portMessageHandler(e) {
  switch (e.data.message) {
    
    case 'test-connection':
      messagePort.postMessage({ message: 'resolve-test-connection' });
    break;
    case 'resolve-test-connection':
      testConnectionResolver();
      break;
    case 'response-file':
      let response;
      if (e.data.content == '<404></404>') {
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
  
        if (catchedBlob[data.contentLink]) {
            let response = new Response(catchedBlob[data.contentLink]);
            resolverQueue['R'+e.data.resolverUID](response);
        } else {
        	fetch(request)
        	.then(r => r.blob())
          .then(blob => {
            catchedBlob[data.contentLink] = blob;
            let response = new Response(catchedBlob[data.contentLink]);
            resolverQueue['R'+e.data.resolverUID](response);
          })
        	.catch(resolverQueue['R'+e.data.resolverUID]);
        }
    break;
  }
}

self.addEventListener('message', async function(e) {
  if (typeof(e.data) == 'undefined')
      return;

  switch (e.data.message) {
    case 'skipWaiting':
      self.skipWaiting();
    break;
    case 'reinit-message-port':
      messagePort = e.ports[0];
      messagePort.onmessage = portMessageHandler;
      isRelinkingMessagePort = false;
    break;
    case 'init-message-port':
      messagePort = e.ports[0];
      messagePort.onmessage = portMessageHandler;
      messagePort.postMessage({ message: 'message-port-opened' });
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

let testConnectionResolver;
function testConnection() {
  return new Promise((resolve, reject) => {
    testConnectionResolver = resolve;
    messagePort.postMessage({
      message: 'test-connection', 
    });
    window.setTimeout(() => {
      reject();
    }, 120);
  });
}

function checkMessagePort() {
  return new Promise((resolve, reject) => {

    if (messagePort) {
      testConnection().then(r => {
        resolve();
      }).catch(() => {
        if (!isRelinkingMessagePort) {
          relinkMissingPort(resolve, reject);
        }
      })
    } else {
      relinkMissingPort(resolve, reject);
    }

  });
  
}

function relinkMissingPort(resolve, reject) {

  self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  }).then((clients) => {
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
              isRelinkingMessagePort = false;
              clearInterval(waiting);
              reject();
            }
            if (messagePort) {
              isRelinkingMessagePort = false;
              clearInterval(waiting);
              resolve();
            }
          }, 10)
          break;
        }
      }
    }
    if (!hasClient) {
      reject();
    }
  }); 
}


function responseBySearch(e, resolve) {
  checkMessagePort().then(() => {
    resolverQueue['R'+uid] = resolve;
    messagePort.postMessage({ 
      message: 'request-path',
      path: e.request.url.replace(location.origin, ''),
      resolverUID: uid,  
    });
    uid++;
  }).catch(() => {
    resolve(new Response('Failed to establish port connection. Try reopening the file from <a href="https://codetmp.web.app/">Codetmp</a>.', {headers: {'Content-Type': 'text/html;charset=UTF-8'} }))
  });
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