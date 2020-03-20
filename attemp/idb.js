/*
customized for attemp.web.app
0.05 : 20 march 20 -- able to load IDB without version
*/

(function() {
  
  let idb = function(name, version, upgradeCallback, successCallback, errorCallback) {
    
    this.db = null;
    let self = this;
    let open;
    if (version)
      open = window.indexedDB.open(name, version);
    else
      open = window.indexedDB.open(name);
      
    open.onupgradeneeded = function(e) {
      if (upgradeCallback)
        upgradeCallback(e.target.result, e.oldVersion);
    };

    open.onsuccess = function(e) {
      self.db = e.target.result;
      if (successCallback)
        successCallback(self);
    };
    open.onerror = function(e) {
      if (errorCallback)
        errorCallback(e);
    };
  
    return this;
  };
  
  idb.prototype.setStore = function(storeName) {
    this.store = storeName;
  };
  
  idb.prototype.insert = function(data, successCallback, errorCallback, completeCallback) {
    let trans = this.db.transaction(this.store, 'readwrite');
    trans.oncomplete = completeCallback;
    trans.onerror = errorCallback;
    let request = trans.objectStore(this.store).add(data);
    request.onsuccess = successCallback;
  };
  
  idb.prototype.get = function(key, callback) {
    let request = this.db.transaction(this.store).objectStore(this.store).get(key);
    request.onsuccess = function(e) {
      if (callback)
        callback(e.target.result);
    };
  };
  
  idb.prototype.delete = function(key, callback) {
    let request = this.db.transaction(this.store, 'readwrite').objectStore(this.store).delete(key);
    request.onsuccess = callback;
  };
  
  idb.prototype.update = function(data, successCallback, errorCallback) {
    let trans = this.db.transaction(this.store, 'readwrite');
    trans.onerror = errorCallback;
    let request = trans.objectStore(this.store).put(data);
    request.onsuccess = successCallback;
  };
  
  if (window.ATTEMP_DB === undefined)
    window.ATTEMP_DB = idb;
  else
    console.error('idb.js:', 'Failed to initialize. Duplicate variable exists.');
  
  //
  //
  //
  
  function upgrade(db, oldVersion) {
    if (oldVersion < 1)
      db.createObjectStore('apps', {keyPath: 'appName'});
  }
  
  window.attemp_db = new ATTEMP_DB('user-generated-app', 1, upgrade);
})();