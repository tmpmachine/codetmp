/* 0.081 - 2 dec 19 -- error handler return callback */
// customized for Codetmp

(function () {
  
  let httpHeaders = {
    Authorization: '',
    'Content-Type': 'application/json',
  };

  const configData = {
    blogs: [],
    blogId: '-',
    blog: ''
  };

  const oblog = {
    apiURL: 'https://www.googleapis.com/blogger/v3/',
    callback: null,
    setToken: function(access_token) {
      httpHeaders.Authorization = 'Bearer '+access_token;
    },
    config: function(config) {
      
      for (let cf in config)
        configData[cf] = config[cf];
      
    },
    state: function() {
      let warning = false;
      let errors = arguments;
      for (let e of errors) {
        switch (e) {
          case 0:
            if (configData.blog === '') {
              console.error('oblog configuration ['+e+']: "blog" not specified.');
              warning = true;
            }
          break;
          case 1:
            if (configData.uid === '')
              warning = true;
          break;
        }
      }
      return warning;
    },
    crude: {
      errorHandler: function(e) {
        switch (e.code) {
          case 400:
            console.error('oblog ['+e.code+'] : Failed. Bad request.');
          break;
          case 401:
            console.error('oblog ['+e.code+'] : Failed. You are not authorized.');
          break;
          case 404:
            console.error('oblog ['+e.code+'] : Failed. Not found.');
          break;
          default:
            console.error('oblog ['+e.code+'] : API request failed. Check fetch URL.');
          break;
        }
      },
      fetch: async function(method, path, callback, params, body) {

        await auth2.init();

        if (params === '') params = '?fields= ';
  
        if (params) {
          if (!params.includes('fields=')) {
            if (path.includes('?'))
              params = '&fields='+params;
            else
              params = '?fields='+params;
          }
        } else {
          params = '';
        }
  
        new Promise((resolve) => {
          
          if (path.includes('blogs/byurl'))
            return resolve();
          else
            oblog.getBlogId(() => {
              return resolve();
            });
          
        }).then(() => {
          
          if ((path.includes('/posts') || path.includes('/pages')) && !path.includes('/blogs'))
            path = 'blogs/'+configData.blogId+path;
            
          if (path == 'blogs/-')
            path = 'blogs/'+configData.blogId;
          
          let url = oblog.apiURL + path + params;
          
          let options = {
            method: method,
            headers: httpHeaders,
          };
          
          if (body)
            options.body = JSON.stringify(body);
          
          
          fetch(url,options).then(function(response){
            if (method == 'DELETE' && response.ok) {
              if (callback)
                callback();
            }
            return response.json();
          }).then(result => {
            if (result.error) {
              oblog.crude.errorHandler(result.error);
              result = result.error.code;
            }
            
            if (callback)
              callback(result);
          }).catch(error => {
            console.log(error);
            console.log('Check your connection');
          });
        });
        
      },
      insert: function(path, callback, params, body) {
        oblog.crude.fetch('POST',path,callback,params,body);
      },
      update: function(path, callback, params, body) {
        oblog.crude.fetch('PUT',path,callback,params,body);
      },
      patch: function(path, callback, params, body) {
        oblog.crude.fetch('PATCH',path,callback,params,body);
      },
      delete: function(path, callback) {
        oblog.crude.fetch('DELETE',path,callback);
      },
      list: function(path, callback, params) {
        oblog.crude.fetch('GET', path, callback, params);
      }
    },
    pages: {
      list: function(callback, params) { oblog.crude.list('/pages',callback,params) },
      get: function(id, callback, params) { oblog.crude.list('/pages/'+id,callback,params) },
      
      insert: function(body, callback, params) { oblog.crude.insert('/pages',callback,params,body); },
      update: function(id, body, callback, params) { oblog.crude.update('/pages/'+id,callback,params,body); },
      patch: function(id, body, callback, params) { oblog.crude.patch('/pages/'+id,callback,params,body); },
      delete: function(id, callback) { oblog.crude.delete('/pages/'+id,callback); }
    },
    posts: {
      search: function(query, callback, params) { oblog.crude.list('/posts/search?q='+query,callback,params) },
      list: function(callback, params) { oblog.crude.list('/posts',callback,params) },
      get: function(id, callback, params) { oblog.crude.list('/posts/'+id,callback,params) },
      getByPath: function(path, callback, params) { oblog.crude.list('/posts/bypath?path='+path,callback,params) },
      
      insert: function(body, callback, params) { oblog.crude.insert('/posts',callback,params,body); },
      update: function(id, body, callback, params) { oblog.crude.update('/posts/'+id,callback,params,body); },
      patch: function(id, body, callback, params) { oblog.crude.patch('/posts/'+id,callback,params,body); },
      delete: function(id, callback) { oblog.crude.delete('/posts/'+id,callback); }
    },
    postUserInfos: {
      list: function(uid, blogId, callback,params) { oblog.crude.list('users/'+uid+'/blogs/'+blogId+'/posts',callback,params) },
    },
    users: {
      get: function(id, callback, params) { oblog.crude.list('users/'+id,callback,params); },
      getBlogInfo: function(id, callback, params) { oblog.crude.list('users/'+id+'/blogs/'+configData.blogId,callback,params); },
    },
    blogs: {
      get: function(id, callback, params) { oblog.crude.list('blogs/'+id, callback, params); },
      getByUrl: function(name, callback, params) { oblog.crude.list('blogs/byurl?url=http://'+name+'.blogspot.com', callback, params); },
      list: function(uid, callback, params) {
        if (uid)
          oblog.crude.list('users/g'+uid+'/blogs/', callback, params);
        else
          oblog.crude.list('users/g'+configData.uid+'/blogs/', callback, params);
      },
    },
    
    matchBlog: function(callback) {
      let found = false;
      
      for (let blog of configData.blogs) {
        if (blog.name == configData.blog && blog.id !== undefined) {
          configData.blogId = blog.id;
          found = true;
          if (callback)
            callback(blog.id);
          break;
        }
      }
      
      return found
    },
    getBlogId: function(callback) {
      let found = oblog.matchBlog(callback);
      
      if (!found) {
        oblog.blogs.getByUrl(configData.blog, d => {
          let found = oblog.matchBlog();
          if (!found) {
            configData.blogId = d.id;
            configData.blogs.push({id:d.id,name:configData.blog});
            if (callback)
              callback(d.id);
          }
        });
      }
    }
  };
  
  if (window.oblog === undefined)
    window.oblog = oblog;
  else
    console.error('oblog.js:', 'Failed to initialize. Duplicate variable exists.');
})();