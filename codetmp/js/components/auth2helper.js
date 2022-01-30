(function () {

  let resolverPool = [];
  let access_token = localStorage.getItem('data-token');
  let expires_at = parseInt(localStorage.getItem('data-token-expires'));
  let additionalScopes = localStorage.getItem('additionalScopes') || '';
  if (expires_at === NaN)
  	expires_at = 0

  function onSignIn(googleUser) {
    let authData = googleUser.getAuthResponse();
    storeAuthData(authData);
  }

  function storeAuthData(authData) {
    if (typeof(authData.access_token) != 'undefined') {
      access_token = authData.access_token;
      expires_at = authData.expires_at;
      localStorage.setItem('data-token', access_token);
      localStorage.setItem('data-token-expires', expires_at);
    }
    distributeToken();
  }

  function distributeToken() {
    previewHandler.setToken(access_token);
    if (typeof(drive) != 'undefined') 
      drive.setToken(access_token);
    if (typeof(fire) != 'undefined')
      fire.setToken(access_token);
  }

  function init() {
    return new Promise((resolve, reject) => {
      if (expires_at - new Date().getTime() > 0) {
        distributeToken();
        resolve()
      } else {
        resolverPool.push(resolve);
        let authInstance = gapi.auth2.getAuthInstance();
        if (authInstance !== null) {
          authInstance.currentUser.get().reloadAuthResponse().then(authData => {
            storeAuthData(authData);
            for (let resolver of resolverPool)
              resolver();
            resolverPool.length = 0;
          }).catch(reject);
        } else {
          reject();
        }
      }
    });
  }

  function addScope(scope) {
    if (additionalScopes.indexOf(scope) < 0) {
      additionalScopes += ' '+scope.trim();
      localStorage.setItem('additionalScopes', additionalScopes);
    }
  }

  function removeScope(scope) {
    if (additionalScopes.indexOf(scope) < 0) {
      additionalScopes = additionalScopes.replace(' '+scope.trim(), '');
      localStorage.setItem('additionalScopes', additionalScopes);
    }
  }
  
  function grant(scope) {
    const option = new gapi.auth2.SigninOptionsBuilder();
    option.setScope(scope);
    let googleUser = gapi.auth2.getAuthInstance().currentUser.get()
    googleUser.grant(option).then(
        function(success) {
          aww.pop('Access granted.');
          storeAuthData(success);
          authReady();
        },
        function(fail){
          aww.pop('Grant access failed. Check console.');
          L('Fail granting acess to '+scope+'. '+fail.error);
        });
  }

  function signOut() {
    localStorage.removeItem('data-token');
    localStorage.removeItem('data-token-expires');
    localStorage.removeItem('additionalScopes');
  }

  let self = {
    onSignIn,
    signOut,
    init,
    grant,
    addScope,
    removeScope,
  };

  Object.defineProperty(self, 'additionalScopes', {get: () => additionalScopes});

  window.auth2 = self;

})();