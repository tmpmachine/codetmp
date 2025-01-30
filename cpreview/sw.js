let cacheVersion = '11';
let cacheItem = 'cpreview-'+cacheVersion;
let messagePort;
let resolverQueue = {};
let uid = 0;
let catchedBlob = {};
let isRelinkingMessagePort = false;
let channelName = 'preview';
const broadcastChannelKey = 'NjMyNTA0MDc';
const broadcastChannel = new BroadcastChannel(broadcastChannelKey);

broadcastChannel.onmessage = (e) => {
  switch (e.data.message) {
    
    case 'response-file':
      let response;
      if (e.data.content == '<404></404>') {
        response = new Response('Not found', {status: 404, statusText: 'not found'});
      } else {
        response = new Response(e.data.content, {headers:{'Content-Type': e.data.mime}});
      }
      resolverQueue['R'+e.data.resolverUID]?.(response);
      delete resolverQueue['R'+e.data.resolverUID];
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
            resolverQueue['R'+e.data.resolverUID]?.(response);
            delete resolverQueue['R'+e.data.resolverUID];
        } else {
        	fetch(request)
        	.then(r => r.blob())
          .then(blob => {
            catchedBlob[data.contentLink] = blob;
            let response = new Response(catchedBlob[data.contentLink]);
            resolverQueue['R'+e.data.resolverUID]?.(response);
            delete resolverQueue['R'+e.data.resolverUID];
          })
        	.catch(resolverQueue['R'+e.data.resolverUID]);
        }
    break;
  }
};

self.addEventListener('message', async function(e) {
  if (typeof(e.data) == 'undefined')
      return;

  switch (e.data.message) {
    case 'skipWaiting':
      self.skipWaiting();
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


function responseBySearch(e, resolve) {
  resolverQueue['R'+uid] = resolve;
  broadcastChannel.postMessage({ 
    channelName,
    message: 'request-path',
    path: e.request.url.replace(location.origin, ''),
    resolverUID: uid,  
  });
  uid++;
}

function responseByFetch(e, resolve) {
  fetch(e.request).then(function(r) {
    resolve(r);
  });
}

self.addEventListener('fetch', function(e) {

  let reqUrl = new URL(e.request.url);
  if (reqUrl.pathname == '/') {
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