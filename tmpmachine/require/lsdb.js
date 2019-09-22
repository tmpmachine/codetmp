/*
v0.09 : 18 mar 19 -- fix reference to root data
v0.08 : 19 dec 18 -- fix reference to root data
v0.07 : 10 dec 18 -- added data reset feature
v0.06 : 4 dec 18 -- fix : saving changes to localStorage not working
v0.05 : 3 dec 18 -- migrate to using object prototype to create lsdb object instead of calling init function
v0.04 : 24 sep 18 -- added root check validation
v0.03 : 19 july 18 -- added null and undefined bypass value
v0.02 : 26 june 18 -- added 2nd level object check
v0.01
*/
  
const lsdb = function(storageName, rootObject) {
  this.root = JSON.parse(JSON.stringify(rootObject));
  this.storageName = storageName;
	this.data = JSON.parse(this.getStorageData(this.storageName, null));
  // delete of update storage keys value according to rootObject
	this.deepCheck(this.data, rootObject.root, true);
};

(function() {
  
  lsdb.prototype.deepCheck = function(data, root, firstDive) {
    if (data === null)
      this.data = JSON.parse(JSON.stringify(this.root.root));
    else
    {
      for (const i in data)
      {
       if (root[i] === undefined)
          delete data[i];
      }
      for (const i in root)
      {
        if (data[i] === undefined)
          data[i] = root[i];
      }
      for (const i in data)
      {
        if (Array.isArray(data[i]))
        {
          for (var j=0; j < data[i].length; j++)
          {
            if (typeof(data[i][j]) === 'object' && !Array.isArray(data[i][j]))
            {
              if (this.root[i] !== undefined)
                this.deepCheck(data[i][j], this.root[i]);
            }
          }
        }
        else
        {
          if (!(data[i] === null || data[i] === undefined) && typeof(data[i]) === 'object' && !Array.isArray(data[i]))
          {
            if (firstDive)
              this.deepCheck(data[i], this.root.root[i],false);
            else
              this.deepCheck(data[i], root[i],firstDive);
          }
        }
      }
    }
  };
  
  lsdb.prototype.getStorageData = function(name, defaultValue) {
  	return (!window.localStorage.getItem(name)) ? defaultValue : window.localStorage.getItem(name);
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

})();