/*
0.1 : 13 March 2021 -- prevent deletetion of dynamic object props
*/

(function () {
  
  const lsdb = function(storageName, rootObject) {
    this.root = JSON.parse(JSON.stringify(rootObject));
    this.storageName = storageName;
  	this.data = JSON.parse(getStorageData(this.storageName, null));
    // delete of update storage keys value according to rootObject
  	this.deepCheck(this.data, rootObject.root, true);
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
              if (Object.keys(this.root.root[i]).length > 0) {
                this.deepCheck(data[i], this.root.root[i], false);
              }
            } else {
              if (Object.keys(root[i]).length > 0)
                this.deepCheck(data[i], root[i], firstDive);
            }
          }
        }
      }
    }
  };
  
  lsdb.prototype.save = function() {
    window.localStorage.setItem(this.storageName, JSON.stringify(this.data));
  };
  
  lsdb.prototype.reset = function() {
    window.localStorage.removeItem(this.storageName);
    this.data = JSON.parse(JSON.stringify(this.root.root));
  };
  
  lsdb.prototype.new = function(keyName, values) {
    const data = JSON.parse(JSON.stringify(this.root[keyName]));
    for (const i in values)
      data[i] = values[i];
    return data;
  };

  function getStorageData(name, defaultValue) {
  	return (!window.localStorage.getItem(name)) ? defaultValue : window.localStorage.getItem(name);
  }
    
  if (window.lsdb === undefined)
    window.lsdb = lsdb;
  else
    console.error('lsdb.js:', 'Failed to initialize. Duplicate variable exists.');
})();