// @ts-check

function extractUrlsFromJson(json) {
	let urls = [];
	for (let key in json) {
		if (key == 'skip') {
			continue;
		}
		if (Array.isArray(json[key])) {
			urls = urls.concat(json[key]);
		}
	}
	return urls;
}

self.addEventListener('message', function (e) {
	if (e.data.action == 'skipWaiting') {
		self.skipWaiting();
	}
	//  else if (e.data && e.data.type == 'extension' && e.data.name !== null && e.data.name.length > 0) {
	// 	cacheExtension(e);
	// }
});

self.addEventListener('fetch', function (e) {
	e.respondWith(
		caches.match(e.request).then(function (resp) {
			if (resp) return resp;

			return fetch(e.request)
				.then(function (r) {
					return r;
				})
				.catch(function () {
					console.error('Check connection.');
				});
		})
	);
});

// function cacheExtension(e) {
// 	e.waitUntil(
// 		Promise.all([
// 			caches.open(cacheName).then(function (cache) {
// 				return cache.addAll(e.data.files);
// 			}),
// 			e.source.postMessage({
// 				name: e.data.name,
// 				type: e.data.type,
// 			}),
// 		])
// 	);
// }
