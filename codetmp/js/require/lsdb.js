/*
0.11 : 4 May 2021 -- + store data & delayed save options
*/

(function () {
  
  const lsdb = function(storageName, rootObject, options = {}) {
    this.root = JSON.parse(JSON.stringify(rootObject));
    this.storageName = storageName;
    this.data = JSON.parse(getStorageData(this.storageName, null));
    // delete or update storage keys value according to rootObject
    this.deepCheck(this.data, rootObject.root, true);
    this.saveResolver = [];
    this.options = {
      isSaveDelayed: false,
      isStoreData: true,
    };
    for (let key in options) {
      if (typeof(this.options[key]) != 'undefined')
        this.options[key] = options[key];
      else
        console.log('lsdb.js:', 'Unkown option name:', key);
    }
  };
  
  lsdb.prototype.deepCheck = function(data, root, firstDive) {
    
    if (data === null) {
      this.data = JSON.parse(JSON.stringify(this.root.root));
    } else {
      
      for (const i in data) {
       if (root[i] === undefined)
          delete data[i];
      } 
      
      for (const i in root) {
        if (data[i] === undefined)
          data[i] = root[i];
      }
      
      for (const i in data) {
        if (Array.isArray(data[i])) {
          for (let j = 0; j < data[i].length; j++) {
            if (typeof(data[i][j]) === 'object' && !Array.isArray(data[i][j])) {
              if (this.root[i] !== undefined)
                this.deepCheck(data[i][j], this.root[i]);
            }
          }
        } else {
          if (!(data[i] === null || data[i] === undefined) && typeof(data[i]) === 'object' && !Array.isArray(data[i])) {
            if (firstDive) {
              this.deepCheck(data[i], this.root.root[i], false);
            } else {
              this.deepCheck(data[i], root[i], firstDive);
            }
          }
        }
      }
    }
  };
  
  lsdb.prototype.save = function() {
    if (!this.options.isStoreData)
      return;
    if (this.options.isSaveDelayed) {
      return new Promise(resolve => {
        this.saveResolver.push(resolve);
        window.clearTimeout(this.saveTimeout);
        this.saveTimeout = window.setTimeout(this.storeData.bind(this), 50);
      });
    } else {
      this.storeData();
    }
  };
  
  lsdb.prototype.storeData = function() {
    window.localStorage.setItem(this.storageName, JSON.stringify(this.data));
    for (let resolver of this.saveResolver) {
      resolver();
    }
    this.saveResolver.length = 0;
  };
  
  lsdb.prototype.reset = function() {
    if (this.options.isStoreData)
      window.localStorage.removeItem(this.storageName);
    this.data = JSON.parse(JSON.stringify(this.root.root));
  };
  
  lsdb.prototype.new = function(keyName, values) {
    const data = JSON.parse(JSON.stringify(this.root[keyName]));
    for (const i in values)
      data[i] = values[i];
    return data;
  };
  
  lsdb.prototype.saveTimeout = function() {};

  function getStorageData(name, defaultValue) {
    return (!window.localStorage.getItem(name)) ? defaultValue : window.localStorage.getItem(name);
  }
    
  if (window.lsdb === undefined)
    window.lsdb = lsdb;
  else
    console.error('lsdb.js:', 'Failed to initialize. Duplicate variable exists.');
})();