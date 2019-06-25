var DB = (function() {
  var tDB = {};
  var datastore = null;

  tDB.open = function(callback) {
    var version = 1;
    var request = indexedDB.open('THOR', version);
    request.onupgradeneeded = function(e) {
      var db = e.target.result;
      e.target.transaction.onerror = tDB.onerror;
      if (db.objectStoreNames.contains('THOR')) {
        db.deleteObjectStore('THOR');
      }
      var store = db.createObjectStore('THOR', {
        keyPath: 'blogId'
      });
    };
    request.onsuccess = function(e) {
      datastore = e.target.result;
      callback();
    };
    request.onerror = tDB.onerror;
  };
  
  tDB.get = function(id,callback) {
    var db = datastore;
    var transaction = db.transaction(['THOR'],'readonly');
    var objStore = transaction.objectStore('THOR');

    var request = objStore.get(id);
    request.onsuccess = function(ev) {
      callback(ev.target.result);
    };
    request.onerror = function(e) {
      console.log(error);
      console.log(e);
    };
  };
  
  tDB.fetch = function(callback) {
    var db = datastore;
    var transaction = db.transaction(['THOR'], 'readwrite');
    var objStore = transaction.objectStore('THOR');
  
    var keyRange = IDBKeyRange.lowerBound(0);
    var cursorRequest = objStore.openCursor(keyRange);
  
    var todos = [];
  
    transaction.oncomplete = function(e) {
      callback(todos);
    };

    cursorRequest.onsuccess = function(e) {
      var result = e.target.result;
  
      if (!!result == false) {
        return;
      }
  
      todos.push(result.value);
  
      result.continue();
    };

    cursorRequest.onerror = tDB.onerror;
  };

  
  tDB.create = function(text, callback) {
    var db = datastore;
    var transaction = db.transaction(['THOR'], 'readwrite');
    var objStore = transaction.objectStore('THOR');

    var timestamp = new Date().getTime();

    var todo = text;
    var request = objStore.put(todo);

    request.onsuccess = function(e) {
      callback(todo);
    };
    request.onerror = tDB.onerror;
  };

  tDB.delete = function(id, callback) {
    var db = datastore;
    var transaction = db.transaction(['THOR'], 'readwrite');
    var objStore = transaction.objectStore('THOR');

    var request = objStore.delete(id);

    request.onsuccess = function(e) {
      callback();
    };
  
    request.onerror = function(e) {
      console.log(e);
    };
  };

  return tDB;
}());


DB.open(function(){
});