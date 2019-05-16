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
  onready: function(){},
  onlogin: function(){},
  onrefresh: function(){},
  onlogout: function(){},
  config: function(config) {
    var portal = (oblog.auth) ? oblog.auth.data.portal : '';
    var blog = (oblog.auth) ? oblog.auth.data.blog : '';
    var line;
    
    if (config)
    {
      if (config.portal)
        portal = config.portal;
      if (config.blog)
        blog = config.blog;
      if (config.line)
        line = config.line;
    }
    
    if (!oblog.auth || portal !== oblog.auth.data.portal)
    {
      oblog.auth = new lsdb('oblog'+portal+line,{
        root: {
          token: '',
          tokenExp: 0,
          uid: '',
          ubid: '',
          role: '',
          secretKey: '',
          
          bypass: false,
          
          blogs: [],
          blog: blog,
          blogId: '-',
          portal: portal,
          line: line
        }
      });
    }
    
    oblog.auth.data.blog = blog;
    oblog.getBlogId();
    
    if (!oblog.state(3))
    {
      oblog.getUID(function(result){
        if (oblog.state(5))
          oblog.onready();
        else
          oblog.requestToken();
      });
    }
  },
  state: function() {
    var warning = false;
    var errors = arguments;
    for (var e of errors)
    {
      switch (e)
      {
        case 0:
          if (!oblog.auth || oblog.auth.data.blog === '')
          {
            console.error('oblog configuration ['+errors[i]+']: "blog" not specified.');
            warning = true;
          }
        break;
        case 1:
          if (!oblog.auth || oblog.auth.data.portal === '')
          {
            console.error('oblog configuration ['+errors[i]+']: "portal" not specified.');
            warning = true;
          }
        break;
        case 2:
          if (!oblog.auth || oblog.auth.data.token === '')
            warning = true;
        break;
        case 3:
          if (!oblog.auth || oblog.auth.data.uid === '')
            warning = true;
        break;
        case 4:
          if (new Date().getTime() - oblog.auth.data.tokenExp >= 0)
            warning = true;
        break;
        case 5:
          if (new Date().getTime() - oblog.auth.data.tokenExp < 0)
            warning = true;
        break;
      }
    }
    return warning;
  },
  login: function() {
    if (oblog.state(0,1)) return;
    
    if (oblog.state(5))
    {
      oblog.getUID();
      return;
    }
    
    if (oblog.state(2))
    {
      var secretKey = window.prompt('Secret key : ');
      if (secretKey === null) return;
      
      if (!oblog.state(3))
        oblog.auth.data.bypass = true;
      
      oblog.auth.data.secretKey = secretKey;
    }
    
    oblog.requestToken();
  },
  logout: function() {
    oblog.auth.reset();
    oblog.auth.save();
    oblog.onlogout();
    window.removeEventListener('message', oblog.onMessage);
  },
  onMessage: function(event) {
    oblog.messageListener(event.data);
    var iframe = document.getElementById('oblogPortal');
    if (iframe !== null)
      document.body.removeChild(iframe);
  },
  requestToken: function(callback) {
    oblog.callback = callback;
    window.addEventListener("message", oblog.onMessage);
    
    var loginUrl = 'https://'+oblog.auth.data.portal+'.blogspot.com/search?q=(title:'+oblog.auth.data.line+'|secret:'+oblog.auth.data.secretKey;
    
    var el = document.createElement('iframe');
    el.setAttribute('id','oblogPortal');
    el.setAttribute('height','0');
    el.setAttribute('style','display:none;');
    if (oblog.state(2))
      window.open(loginUrl+')');
    else
    {
      el.setAttribute('src',loginUrl+')&uid='+oblog.auth.data.uid);
      document.body.appendChild(el);
    }
  },
  messageListener: function(response) {
    switch (response)
    {
      case 'failed':
        console.error('oblog authentication: Failed. Secret key not registered.');
        oblog.auth.reset();
        window.removeEventListener('message', oblog.onMessage);
      break;
      default:
        if (response.match('error='))
          console.error('oblog authentication: Failed. Access denied.');
        else
        {
          var mode = 'login';
          if (!oblog.state(2))
            mode = 'refresh';
            
          oblog.auth.data.token = response.match(/access_token=.*?\&/)[0].split('=')[1].split('&')[0];
          oblog.auth.data.tokenExp = new Date().getTime() + 3480000;
          oblog.auth.save();
          oblog.getUID();
          oblog.getBlogId();
          
          if (mode == 'login')
            oblog.onlogin();
          else
            oblog.onrefresh();

          oblog.onready();
        }
      break;
    }
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
          console.error('oblog ['+e.code+'] : API request failed. Contact oblog author and give him this error code.');
        break;
      }
    },
    fetch: function(method,path,callback,params,body) {
      if (oblog.state(2))
        console.error('oblog authentication: Failed. You are not authorized.');
      if (oblog.state(0,1,2,6)) return;
      
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

      new Promise(function(resolve){
        
        if (oblog.state(5))
        {
          if (path.includes('blogs/byurl'))
            return resolve();
          else
            oblog.getBlogId(function(){
              return resolve();
            })
        }
        else
        {
          oblog.requestToken(function(){
            if (path.includes('blogs/byurl'))
              return resolve();
            else
              oblog.getBlogId(function(){
                return resolve();
              })
          })
        }
        
      }).then(function(){
        
        if ((path.includes('/posts') || path.includes('/pages')) && !path.includes('/blogs'))
          path = 'blogs/'+oblog.auth.data.blogId+path
        
        var url = oblog.apiURL+path+params;
        
        var options = {
          method: method,
          headers: {
            'Authorization': 'Bearer '+oblog.auth.data.token,
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
            oblog.crude.errorHandler(result.error)
            result = result.error.code;
          }
          
          if (callback)
            callback(result)
        }).catch(function(error){
          console.log(error);
          console.log('Check your connection');
        });
      })
      
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
    list: function(path,callback,params) {
      oblog.crude.fetch('GET',path,callback,params);
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
    list: function(callback,params) { oblog.crude.list('users/'+oblog.auth.data.ubid+'/blogs/'+oblog.auth.data.blogId+'/posts',callback,params) },
  },
  users: {
    get: function(id,callback,params) { oblog.crude.list('users/'+id,callback,params); },
    getBlogInfo: function(id,callback,params) { oblog.crude.list('users/'+id+'/blogs/'+oblog.auth.data.blogId,callback,params); },
  },
  blogs: {
    get: function(id,callback,params) { oblog.crude.list('blogs/'+id,callback,params); },
    getByUrl: function(name,callback,params) { oblog.crude.list('blogs/byurl?url=http://'+name+'.blogspot.com',callback,params); }
  },
  matchBlog: function(callback) {
    var found = false;
    
    for (var blog of oblog.auth.data.blogs)
    {
      if (blog.name == oblog.auth.data.blog)
      {
        oblog.auth.data.blogId = blog.id;
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
    
    if (!found && oblog.state(5))
    {
      oblog.blogs.getByUrl(oblog.auth.data.blog,function(d){
        var found = oblog.matchBlog();
        if (!found)
        {
          oblog.auth.data.blogId = d.id;
          oblog.auth.data.blogs.push({id:d.id,name:oblog.auth.data.blog});
          oblog.auth.save();
          if (callback)
            callback(d.id);
        }
      });
    }
  },
  getUID: function(callback) {
    fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token='+oblog.auth.data.token).then(function(response){
      return response.json();
    }).then(function(result){
      if (result.error_description)
      {
        if (callback)
          callback(0)
      }
      else
      {
        oblog.auth.data.uid = result.sub;
        
        oblog.users.get('g'+oblog.auth.data.uid,function(r){
          oblog.auth.data.ubid = r.id;
          oblog.auth.save();
        },'id')
        
        oblog.users.getBlogInfo('g'+oblog.auth.data.uid,function(r){
          oblog.auth.data.role = r.blog_user_info.role;
          oblog.auth.save();
        },'blog_user_info(role)')
        
        
        oblog.auth.data.bypass = true;
        oblog.auth.save();
        if (callback)
          callback(result.sub);
      }
    }).catch(function(error){
      console.log(error);
      console.log('Check your connection');
    });
  }
};