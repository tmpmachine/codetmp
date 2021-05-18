/*
0.07 - 7 sep 19 -- encapsulation
*/

(function () {
  
  let odin = {
    idxOf: function(search, data, name) {
      let idx = 0,found;
      if (name === undefined) {
        found = data.some((d, i) => {
          idx = i;
          return (d == search);
        });
      } else {
        found = data.some((d, i) => {
          idx = i;
          return (d[name] == search);
        });
      }
      return found ? idx : -1;
    },
    dataOf: function(search, data, name) {
      return data[this.idxOf(search, data, name)];
    },
    deepSearch: function(search, data, name, modeFalse) {
      if (Array.isArray(data[name[0]])) {
        let data2 = data[name[0]];
        name.splice(0,1);
        let found = false;
        
        if (modeFalse)
          found = true;
        
        if (modeFalse) {
          for (let d of data2) {
            if (odin.deepSearch(search, d, name, modeFalse)) {
              found = false;
              break;
            }
          }
        } else {
          for (let d of data2) {
            if (odin.deepSearch(search, d, name, modeFalse)) {
              found = true;
              break;
            }
          }
        }
        
        return found;
      } else {
        if (modeFalse) {
          // or cond
          let cond = false;
          for (let s of search) {
            if (data[name[0]] == s) {
              cond = true;
              break;
            }
          }
          
          return cond;
        } else {
          let cond = false;
          for (let s of search) {
            if (data[name[0]] == s) {
              cond = true;
              break;
            }
          }
          
          return cond;
        }
      }
    },
    filterData: function(search, data, name, searchType) {
      let newData = [];
      for (let d of data) {
        if (searchType === undefined) {
          if (name.split('.').length > 1) {
            if (odin.deepSearch(search, d, name.split('.')))
              newData.push(d);
          } else {
            if (d[name] == search)
              newData.push(d);
          }
        } else if (searchType == 'none') {
          if (name.split('.').length > 1) {
            if (odin.deepSearch(search, d, name.split('.'), true))
              newData.push(d);
          } else {
            // or cond
            let cond = true;
            for (let s of search) {
              if (d[name] == s) {
                cond = false;
                break;
              }
            }
            
            if (cond)
              newData.push(d);
          }
        } else if (searchType == '<') {
          if (d[name] < search) newData.push(d);
        } else if (searchType == '>') {
          if (d[name] > search) newData.push(d);
        } else if (searchType == 'idxof') {
          if (name.indexOf('.') > 0) {
            let parent = name.split('.')[0];
            let child = name.split('.')[1];
            d[parent].forEach(dx => {
              if (dx[child] == search)
                newData.push(d);
            });
          } else {
            if (d[name].indexOf(search) >= 0)
              newData.push(d);
          }
        } else if (searchType == 'has') {
          if (search.indexOf(d[name]) >= 0)
            newData.push(d);
        }
      }
      return newData;
    },
    isInside: function(search, data, name) {
      return (this.filterData(search, data, name).length === 0) ? false : true;
    }
  };
  
  if (window.odin === undefined)
    window.odin = odin;
  else
    console.error('odin.js:', 'Failed to initialize. Duplicate variable exists.');
})();