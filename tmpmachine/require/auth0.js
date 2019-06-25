// v0.04 - 16 june 19 -- fix redirect and onready
// v0.03 - 13 june 19 -- add redirect, public, and private portal support
// v0.02 - 7 june 19 -- unique lsdb name
// v0.01 - 5 june 19 -- project started

const auth0 = {
  callback: null,
  root: {
    token: '',
    tokenExp: 0,
    key: '',
    redirect: false,
    uid: '',
    bypass: false,
    portal: '',
    line: ''
  },
  onready: function() {},
  onlogin: function() {},
  onrefresh: function() {},
  onlogout: function() {},
  config: function(config, isModule) {
    
    for (var cf in config)
      auth0.root[cf] = config[cf];
    
    auth0.auth = new lsdb('auth0_'+auth0.root.portal+'_'+auth0.root.line, {
      root: auth0.root
    });
    
    if (!isModule && !auth0.getToken() && !auth0.state(2))
    {
      if (auth0.state(5))
      {
        auth0.onready();
        auth0.getUID();
      }
      else
        auth0.requestToken(null, true);
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
          if (!auth0.auth || auth0.auth.data.line === '')
          {
            console.error('auth0 configuration ['+e+']: "line" not specified.');
            warning = true;
          }
        break;
        case 1:
          if (!auth0.auth || auth0.auth.data.portal === '')
          {
            console.error('auth0 configuration ['+e+']: "portal" not specified.');
            warning = true;
          }
        break;
        case 2:
          if (!auth0.auth || auth0.auth.data.token === '')
            warning = true;
        break;
        case 3:
          if (!auth0.auth || auth0.auth.data.uid === '')
            warning = true;
        break;
        case 4: // token expired
          if (new Date().getTime() - auth0.auth.data.tokenExp >= 0)
            warning = true;
        break;
        case 5: // token valid
          if (new Date().getTime() - auth0.auth.data.tokenExp < 0)
            warning = true;
        break;
      }
    }
    return warning;
  },
  login: function() {
    
    if (auth0.state(0, 1)) return;
    
    if (auth0.state(5))
    {
      auth0.getUID();
      return;
    }
    
    if (auth0.state(2))
    {
      if (!auth0.state(3))
        auth0.auth.data.bypass = true;
      
      auth0.requestToken();
    }
    else
      auth0.requestToken();
    
  },
  logout: function() {
    auth0.auth.reset();
    auth0.auth.save();
    auth0.onlogout();
    window.removeEventListener('message', auth0.onMessage);
  },
  onMessage: function(event) {
    auth0.messageListener(event.data);
    var iframe = document.getElementById('auth0Portal');
    if (iframe !== null)
    {
      setTimeout(function() {
        document.body.removeChild(iframe);
      }, 100);
    }
  },
  requestToken: function(callback, isRefresh) {
    auth0.callback = callback;
    window.addEventListener("message", auth0.onMessage);
    
    var loginUrl;
    if (auth0.auth.data.redirect && !isRefresh)
      loginUrl = 'https://'+auth0.auth.data.portal+'.blogspot.com/search?q=(title:'+auth0.auth.data.line+'|key-'+auth0.auth.data.key+'|'+location.href;
    else
      loginUrl = 'https://'+auth0.auth.data.portal+'.blogspot.com/search?q=(title:'+auth0.auth.data.line+'|key-'+auth0.auth.data.key+'|';
    
    var el = document.createElement('iframe');
    el.setAttribute('id','auth0Portal');
    el.setAttribute('height','0');
    el.setAttribute('style','display:none;');
    if (auth0.state(2))
    {
      if (auth0.auth.data.redirect)
        location.href = loginUrl+')';
      else
        window.open(loginUrl+')');
    }
    else
    {
      if (auth0.state(3))
        el.setAttribute('src',loginUrl+')');
      else
        el.setAttribute('src',loginUrl+')&uid='+auth0.auth.data.uid);
      document.body.appendChild(el);
    }
  },
  messageListener: function(response) {
    switch (response)
    {
      case 'failed':
        console.error('auth0 authentication: Failed. Secret key not registered.');
        auth0.auth.reset();
        window.removeEventListener('message', auth0.onMessage);
      break;
      default:
        if (response.match('error='))
          console.error('auth0 authentication: Failed. Access denied.');
        else
        {
          var mode = 'login';
          if (!auth0.state(2))
            mode = 'refresh';
            
          auth0.auth.data.token = response.match(/access_token=.*?\&/)[0].split('=')[1].split('&')[0];
          auth0.auth.data.tokenExp = new Date().getTime() + 3480000;
          auth0.auth.save();
          auth0.getUID();
          
          if (mode == 'login')
            auth0.onlogin();
          else
            auth0.onrefresh();

          auth0.onready();
          
          if (auth0.callback)
          {
            auth0.callback();
            auth0.callback = null;
          }
        }
      break;
    }
  },
  getUID: function(callback) {
    
    if (!auth0.state(3))
    {
      if (callback)
        callback();
      return;
    }
    
    fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token='+auth0.auth.data.token).then(function(response) {
      return response.json();
    }).then(function(result) {
      if (result.error_description)
      {
        if (callback)
          callback(0);
      }
      else
      {
        auth0.auth.data.uid = result.sub;
        auth0.auth.data.bypass = true;
        auth0.auth.save();
        
        if (callback)
          callback(result.sub);
      }
    }).catch(function(error) {
      console.log(error);
      console.log('Check your connection');
    });
  },
  getToken: function() {
    
    let result = false;
    
    if (location.href.indexOf('#token=') > 0)
    {
      auth0.auth.data.token = location.href.split('#token=')[1];
      auth0.auth.data.tokenExp = new Date().getTime() + 3480000;
      auth0.auth.save();
      auth0.onlogin();
      auth0.onready();
      auth0.getUID();
      
      history.replaceState(null, '', location.href.split('#token=')[0]);
      result = true;
    }
    
    return result;
  }
};