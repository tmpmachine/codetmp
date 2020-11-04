(function () {

  let access_token = localStorage.getItem('data-token');
  let expires_at = parseInt(localStorage.getItem('data-token-expires'));
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
      checkAuth();
    }
    // send token to other component from here
    if (typeof(drive) != 'undefined') {
      drive.setToken(access_token);
    }
  }

  function init() {
    return new Promise((resolve, reject) => {
      if (expires_at - new Date().getTime() > 0) {
        resolve()
      } else {
        gapi.auth2.getAuthInstance().currentUser.get().reloadAuthResponse().then(authData => {
          storeAuthData(authData);
          resolve();
        });
      }
    });
  }
  
  if (window.auth2 === undefined) {
    window.auth2 = {
      onSignIn,
      init,
    };
  } else {
    console.error('auth2helper.js:', 'Failed to initialize. Duplicate variable exists.');
  }

})();