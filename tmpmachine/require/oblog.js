// v0.071 - 28 june 19 -- fix get blog id on request failed
// v0.07 - 27 june 19 -- fix get blog id
// v0.06 - 5 june 19 -- switch functionality into module for auth0.js
// v0.056 - 20 apr 19 -- login iframe now will not display
// v0.055 - 19 mar 19 -- fix refreshToken
// v0.054 - 18 mar 19 -- remove message listener on logout, remove revoke token
// v0.053 - 19 jan 19 -- fix authentication failed : reset auth data
// v0.052 - 17 jan 19 -- added postUserinfos method
// v0.051 - 16 jan 19 -- added getByPath method for posts
// v0.050 - 24 dec 18 -- change API from XMLHttpRequest to fetch, add more flexibility to use Blogger API
// v0.042 - 19 dec 18 -- fill null input secret key
// v0.041 - 3 dec 18 -- update lsdb.js
// v0.040 - 17 sep 18 - added getApiUrl for dynamic blogId change2
// v0.039 - 13 sep 18 - o.js change
// v0.038 - 4 sep 18 - added 6th state


const oblog = {
  apiURL: 'https://www.googleapis.com/blogger/v3/',
  callback: null,
  authModule: null,
  connect: function(auth) {
    oblog.authModule = auth;
    
    const root = {
      ubid: '',
      role: '',
      blogs: [],
      blogId: '-',
      blog: ''
    };
    
    oblog.authModule.config(root, true);
  },
  config: function(config) {
    
    for (var cf in config)
      oblog.authModule.auth.data[cf] = config[cf];
    
  },
  state: function() {
    var warning = false;
    var errors = arguments;
    for (var e of errors)
    {
      switch (e)
      {
        case 0:
          if (oblog.authModule.auth.data.blog === '')
          {
            console.error('oblog configuration ['+e+']: "blog" not specified.');
            warning = true;
          }
        break;
        case 1:
          if (oblog.authModule.auth.data.uid === '')
            warning = true;
        break;
      }
    }
    return warning;
  },
  crude: {
    errorHandler: function(e) {
      switch (e.code)
      {
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
    fetch: function(method, path, callback, params, body) {
      if (oblog.authModule.state(2))
      {
        console.error('oblog authentication: Failed. You are not authorized.');
        return;
      }
      
      if (params === '') params = '?fields= ';

      if (params)
      {
        if (!params.includes('fields='))
        {
          if (path.includes('?'))
            params = '&fields='+params;
          else
            params = '?fields='+params;
        }
      }
      else
        params = '';

      new Promise(function(resolve) {
        
        if (oblog.authModule.state(5))
        {
          if (path.includes('blogs/byurl'))
            return resolve();
          else
            oblog.getBlogId(function() {
              return resolve();
            });
        }
        else
        {
          oblog.authModule.requestToken(function() {
            if (path.includes('blogs/byurl'))
              return resolve();
            else
              oblog.getBlogId(function() {
                return resolve();
              });
          });
        }
        
      }).then(function(){
        
        if ((path.includes('/posts') || path.includes('/pages')) && !path.includes('/blogs'))
          path = 'blogs/'+oblog.authModule.auth.data.blogId+path;
          
        if (path == 'blogs/-')
          path = 'blogs/'+oblog.authModule.auth.data.blogId;
        
        var url = oblog.apiURL+path+params;
        
        var options = {
          method: method,
          headers: {
            'Authorization': 'Bearer '+oblog.authModule.auth.data.token,
            'Content-Type': 'application/json'
          }
        };
        
        if (body)
          options.body = JSON.stringify(body);
        
        
        fetch(url,options).then(function(response){
          if (method == 'DELETE' && response.ok)
          {
            if (callback)
              callback();
          }
          return response.json();
        }).then(function(result){
          if (result.error)
          {
            oblog.crude.errorHandler(result.error);
            result = result.error.code;
          }
          
          if (callback)
            callback(result);
        }).catch(function(error){
          console.log(error);
          console.log('Check your connection');
        });
      });
      
    },
    insert: function(path,callback,params,body) {
      oblog.crude.fetch('POST',path,callback,params,body);
    },
    update: function(path,callback,params,body) {
      oblog.crude.fetch('PUT',path,callback,params,body);
    },
    patch: function(path,callback,params,body) {
      oblog.crude.fetch('PATCH',path,callback,params,body);
    },
    delete: function(path,callback) {
      oblog.crude.fetch('DELETE',path,callback);
    },
    list: function(path, callback, params) {
      oblog.crude.fetch('GET', path, callback, params);
    }
  },
  pages: {
    list: function(callback,params) { oblog.crude.list('/pages',callback,params) },
    get: function(id,callback,params) { oblog.crude.list('/pages/'+id,callback,params) },
    
    insert: function(body,callback,params) { oblog.crude.insert('/pages',callback,params,body); },
    update: function(id,body,callback,params) { oblog.crude.update('/pages/'+id,callback,params,body); },
    patch: function(id,body,callback,params) { oblog.crude.patch('/pages/'+id,callback,params,body); },
    delete: function(id,callback) { oblog.crude.delete('/pages/'+id,callback); }
  },
  posts: {
    search: function(query,callback,params) { oblog.crude.list('/posts/search?q='+query,callback,params) },
    list: function(callback,params) { oblog.crude.list('/posts',callback,params) },
    get: function(id,callback,params) { oblog.crude.list('/posts/'+id,callback,params) },
    getByPath: function(path,callback,params) { oblog.crude.list('/posts/bypath?path='+path,callback,params) },
    
    insert: function(body,callback,params) { oblog.crude.insert('/posts',callback,params,body); },
    update: function(id,body,callback,params) { oblog.crude.update('/posts/'+id,callback,params,body); },
    patch: function(id,body,callback,params) { oblog.crude.patch('/posts/'+id,callback,params,body); },
    delete: function(id,callback) { oblog.crude.delete('/posts/'+id,callback); }
  },
  postUserInfos: {
    list: function(uid, blogId, callback,params) { oblog.crude.list('users/'+uid+'/blogs/'+blogId+'/posts',callback,params) },
  },
  users: {
    get: function(id,callback,params) { oblog.crude.list('users/'+id,callback,params); },
    getBlogInfo: function(id,callback,params) { oblog.crude.list('users/'+id+'/blogs/'+oblog.authModule.auth.data.blogId,callback,params); },
  },
  blogs: {
    get: function(id, callback, params) { oblog.crude.list('blogs/'+id, callback, params); },
    getByUrl: function(name, callback, params) { oblog.crude.list('blogs/byurl?url=http://'+name+'.blogspot.com', callback, params); },
    list: function(uid, callback, params) {
      if (uid)
        oblog.crude.list('users/g'+uid+'/blogs/', callback, params);
      else
        oblog.crude.list('users/g'+oblog.authModule.auth.data.uid+'/blogs/', callback, params);
    },
  },
  
  matchBlog: function(callback) {
    var found = false;
    
    for (var blog of oblog.authModule.auth.data.blogs)
    {
      if (blog.name == oblog.authModule.auth.data.blog && blog.id !== undefined)
      {
        oblog.authModule.auth.data.blogId = blog.id;
        found = true;
        if (callback)
          callback(blog.id);
        break;
      }
    }
    
    return found
  },
  getBlogId: function(callback) {
    var found = oblog.matchBlog(callback);
    
    if (!found && oblog.authModule.state(5))
    {
      oblog.blogs.getByUrl(oblog.authModule.auth.data.blog, function(d) {
        var found = oblog.matchBlog();
        if (!found)
        {
          oblog.authModule.auth.data.blogId = d.id;
          oblog.authModule.auth.data.blogs.push({id:d.id,name:oblog.authModule.auth.data.blog});
          oblog.authModule.auth.save();
          if (callback)
            callback(d.id);
        }
      });
    }
  }
};