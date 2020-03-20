var arcore = {};
var loadingArcore;

const arc7db = (function() {
  
  const tDB = {};
  var datastore = null;

  tDB.mode = 'idb';
  tDB.open = function(callback) {
    var version = 1;
    var request = indexedDB.open('user-generated-app', version);
    request.onupgradeneeded = function(e) {
      var db = e.target.result;
      e.target.transaction.onerror = tDB.onerror;
      if (db.objectStoreNames.contains('user-generated-app')) {
        db.deleteObjectStore('user-generated-app');
      }
      var store = db.createObjectStore('user-generated-app', {
        keyPath: 'appName'
      });
    };
    request.onsuccess = function(e) {
      datastore = e.target.result;
      if (callback)
        callback();
    };
    request.onerror = function(e) {
      console.error('IDB: Failed to open. Update or change your browser.');
      console.log(e.explicitOriginalTarget.error);
    };
  };
  
  tDB.get = function(id, callback) {
    var db = datastore;
    var transaction = db.transaction(['user-generated-app'],'readonly');
    var objStore = transaction.objectStore('user-generated-app');

    var request = objStore.get(id);
    request.onsuccess = function(ev) {
      if (callback)
        callback(ev.target.result);
    };
    request.onerror = function(e) {
      console.error('IDB: Failed to get.');
      console.log(e.explicitOriginalTarget.error);
    };
  };
  
  tDB.getAll = function(callback) {
    const db = datastore;
    const transaction = db.transaction(['user-generated-app'],'readonly');
    const objStore = transaction.objectStore('user-generated-app');

    const request = objStore.getAll();
    request.onsuccess = function(ev) {
      if (callback)
        callback(ev.target.result);
    };
    request.onerror = function(e) {
      console.error('IDB: Failed to delete.');
      console.log(e.explicitOriginalTarget.error);
    };
  };
  
  tDB.create = function(data, callback) {
    var db = datastore;
    var transaction = db.transaction(['user-generated-app'], 'readwrite');
    var objStore = transaction.objectStore('user-generated-app');

    var request = objStore.put(data);

    request.onsuccess = function(e) {
      if (callback)
        callback(data);
    };
    request.onerror = function(e) {
      console.error('IDB: Failed to create.');
      console.log(e.explicitOriginalTarget.error);
    };
  };

  tDB.delete = function(id, callback) {
    var db = datastore;
    var transaction = db.transaction(['user-generated-app'], 'readwrite');
    var objStore = transaction.objectStore('user-generated-app');

    var request = objStore.delete(id);

    request.onsuccess = function(e) {
      if (callback)
        callback();
    };
    request.onerror = function(e) {
      console.error('IDB: Failed to delete.');
      console.log(e.explicitOriginalTarget.error);
    };
  };

  return tDB;
}());