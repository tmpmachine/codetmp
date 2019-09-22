// v0.06 - 28 mar -- compatibility mode, rollback to var from let
// 0.05 - 4 dec 18 -- added deepSearch for THOR lambda
// 0.04 - 24 aug 18 -- added new searchtype > and <
// 0.03 - 16 aug 18 -- filterData able to search object property in array
// 0.02 - 2 aug 18 -- searchType filterData param
// 0.01 - 13 june 18

var odin = {
  idxOf: function(search,data,name) {
    var idx = 0,found;
    if (name === undefined)
    {
      found = data.some((d,i) => {
        idx = i;
        return (d == search);
      });
    }
    else
    {
      found = data.some((d,i) => {
        idx = i;
        return (d[name] == search);
      });
    }
    return found ? idx : -1;
  },
  dataOf: function(search,data,name) {
    return data[this.idxOf(search,data,name)];
  },
  deepSearch: function(search,data,name,modeFalse) {
    if (Array.isArray(data[name[0]]))
    {
      var data2 = data[name[0]];
      name.splice(0,1);
      var found = false;
      
      if (modeFalse)
        found = true;
      
      if (modeFalse)
      {
        for (var d of data2)
        {
          if (odin.deepSearch(search,d,name,modeFalse))
          {
            found = false;
            break;
          }
        }
      }
      else
      {
        for (var d of data2)
        {
          if (odin.deepSearch(search,d,name,modeFalse))
          {
            found = true;
            break;
          }
        }
      }
      
      return found;
    }
    else
    {
      if (modeFalse)
      {
        // or cond
        var cond = false;
        for (var s of search)
        {
          if (data[name[0]] == s)
          {
            cond = true
            break
          }
        }
        
        return cond;
      }
      else
      {
        var cond = false;
        for (var s of search)
        {
          if (data[name[0]] == s)
          {
            cond = true
            break;
          }
        }
        
        if (cond)
          return true;
        else
          return false;
      }
    }
  },
  filterData: function(search,data,name,searchType) {
    var newData = [];
    for (var d of data)
    {
      if (searchType === undefined)
      {
        if (name.split('.').length > 1)
        {
          if (odin.deepSearch(search,d,name.split('.')))
            newData.push(d);
        }
        else
        {
          if (d[name] == search)
            newData.push(d);
        }
      }
      else if (searchType == 'none')
      {
        if (name.split('.').length > 1)
        {
          if (odin.deepSearch(search,d,name.split('.'),true))
            newData.push(d);
        }
        else
        {
          // or cond
          var cond = true;
          for (var s of search)
          {
            if (d[name] == s)
            {
              cond = false
              break;
            }
          }
          if (cond)
            newData.push(d);
        }
      }
      else if (searchType == '<')
      {
        if (d[name] < search) newData.push(d);
      }
      else if (searchType == '>')
      {
        if (d[name] > search) newData.push(d);
      }
      else if (searchType == 'idxof')
      {
        if (name.indexOf('.') > 0)
        {
          var parent = name.split('.')[0];
          var child = name.split('.')[1];
          d[parent].forEach((dx) => {
            if (dx[child] == search)
              newData.push(d);
          })
        }
        else
        {
          if (d[name].indexOf(search) >= 0)
            newData.push(d);
        }
      }
      else if (searchType == 'has')
      {
        if (search.indexOf(d[name]) >= 0)
          newData.push(d);
      }
    }
    return newData;
  },
  isInside: function(search,data,name) {
    return (this.filterData(search,data,name).length === 0) ? false : true;
  }
};