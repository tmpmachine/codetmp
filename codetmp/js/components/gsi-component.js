let compoGsi = (function() {
  
  let SELF = {
    InitTokenClient,
    RequestToken,
    RevokeToken,
    InitData,
    TaskAuthorize,
    ClearToken,
    RestoreDataFromTemp,
    BackupDataToTemp,
    Commit,
    Logout,
    AddScope,
    Grant,
    RemoveScope,
    Request,
    HasGrantScope,
    ReceiveToken,
    ReceiveSilentSignal,
  };
  
  let data = {
    userEmail: '',
    access_token: '',
    grantedScope: '',
    expires_at: 0,
    additionalScopes: [],
  };
  
  let local = {
    silentFrame: null,
    isSilentFrameReady: false,
    client_id: '',
    scopes: [
      'https://www.googleapis.com/auth/drive.file', 
      'https://www.googleapis.com/auth/drive.appdata',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    tokenClient: null,
    isOnGoingAuthProcessStarted: false, 
    tempData: null,
  };

  // # func

  function ReceiveSilentSignal() {
    local.isSilentFrameReady = true;
  }

  function AddScope(scope) {
    if (data.additionalScopes.includes(scope)) return;
    
    data.additionalScopes.push(scope.trim());
  }

  function RemoveScope(scope) {
    let delIndex = data.additionalScopes.findIndex(x => x == scope);
    if (delIndex < 0) return;

    data.additionalScopes.splice(delIndex, 1);
  }
  
   async function Logout() {
    let isConfirm = window.confirm('Sign out now?');
    if (!isConfirm) return;
    
    data.userEmail = '';
    ClearToken();
    Commit();
    
    reloadAuthState();
  }
  
  function reloadAuthState() {
    if (data.access_token?.trim().length > 0) {
      viewStateUtil.Add('features-cloud', ['authorized']);
      app.AuthReady();
      return;
    }
    viewStateUtil.Remove('features-cloud', ['authorized']);
  }
  
  function ClearToken() {
    data.access_token = '';
    data.expires_at = 0;
  }
  
  function BackupDataToTemp() {
    local.tempData = clearReference(data);
  }
  
  function RestoreDataFromTemp() {
    if (local.tempData !== null) {
      data = clearReference(local.tempData);
    }
  }
  
  async function InitData(noReferenceData) {
    
    for (let key in noReferenceData) {
      if (typeof(data[key]) != 'undefined') {
        data[key] = noReferenceData[key];
      }
    }
    
    let now = new Date().getTime();
    if (data.access_token != '') {
      reloadAuthState();
      distributeTokenToComponents();
    } 
  }
  
  function distributeTokenToComponents() {
    compoDrive.SetToken(data.access_token);
    compoFirebaseHosting.setToken(data.access_token);
  }

  // # authorize
  async function TaskAuthorize() {
    
    return new Promise(async resolve => {
      
      let now = new Date().getTime();
      let thirtySc = 30 * 1000;
      
      if (data.expires_at - now <= thirtySc) {
        
        while (local.isOnGoingAuthProcessStarted) {
          await wait.Until(CheckNoOngoingAuthProcess, 500);
        }
        
        local.isOnGoingAuthProcessStarted = true;
        
        if (!local.isSilentFrameReady) {
          loadSilentRefreshFrame();
          await wait.Until(() => {
            local.silentFrame.postMessage({ 
              message: 'tryConnect', 
            }, '*');
            return local.isSilentFrameReady;
          }, 200);
        }

        RequestSilentToken();

        await wait.Until(CheckNoOngoingAuthProcess, 500);

      } else {
        distributeTokenToComponents();
      }
      
      resolve();
    
    });
    
  }
  
  function CheckNoOngoingAuthProcess() {
    return !local.isOnGoingAuthProcessStarted;
  }
  
  function clearReference(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function HasGrantScope(scope) {
    let localTokenData = {
      access_token: data.access_token,
      scope: data.grantedScope,
    };
    return google.accounts.oauth2.hasGrantedAnyScope(localTokenData, scope);
  }
  
  function Grant(scope) {
    AddScope(scope);
    InitTokenClient(data.additionalScopes);
    RequestToken();
  }
  
  function InitTokenClient(scopes) {
    local.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: local.client_id,
      scope: [...(scopes ?? local.scopes)].join(' '),
      callback: (tokenResponse) => onTokenResponse(tokenResponse),
    });
  }
  
  function onTokenResponse(tokenResponse) {
    try {

      data.grantedScope = tokenResponse.scope;
      data.access_token = tokenResponse.access_token;
      data.expires_at = new Date(new Date().getTime() + tokenResponse.expires_in * 1000).getTime();
      Commit();
      
      readToken();
      
      distributeTokenToComponents();
      reloadAuthState();
      
    } catch (e) {
      console.error(e);
    }
    
    local.isOnGoingAuthProcessStarted = false;
    
  }
  
  async function readToken() {
    if (typeof(data.email) != 'string' || data.email == '') {
      let tokenInfo = await getTokenUserInfo_(data.access_token);
      data.userEmail = tokenInfo.email;
      Commit();
    }
  }

  async function ReceiveToken(token) {
    let tokenInfo = await getTokenUserInfo_(token);

    try {
      data.grantedScope = tokenInfo.scope;
      data.access_token = token;
      data.expires_at = new Date(new Date().getTime() + tokenInfo.expires_in * 1000).getTime();
      data.userEmail = tokenInfo.email;

      Commit();
      distributeTokenToComponents();
      reloadAuthState();
      
    } catch (e) {
      console.error(e);
    }

    local.isOnGoingAuthProcessStarted = false;

  }
  
   function getTokenUserInfo_(access_token) {
    return new Promise(resolve => {
      fetch('https://www.googleapis.com/oauth2/v3/tokeninfo', {
        headers: {
          authorization: `Bearer ${access_token}`
        }
      })
      .then(r => r.json())
      .then(json => {
        resolve(json);
      });
    })
  }
  
  function loadSilentRefreshFrame() {
    local.silentFrame = window.open('./pages/silent-refresh.html', '_frameSilentRefresj')
  }

  function RequestSilentToken() {
    local.silentFrame.postMessage({ 
      message: 'requestToken', 
      scopes: data.grantedScope,
      hint: data.userEmail,
    }, '*')
  }
  
  function RequestToken() {
    local.isOnGoingAuthProcessStarted = true;
    
    let opt = {};
    
    if (data.userEmail) {
      opt.hint = data.userEmail;
      opt.prompt = '';
    }
    
    local.tokenClient.requestAccessToken(opt);
  }
  
  function RevokeToken() {
    google.accounts.oauth2.revoke(data.access_token, () => { console.log('access token revoked'); });
  }
  
  function Commit() {
    appData.SetComponentData('compoGsi', clearReference(data));
    appData.Save();
  }
  
  return SELF;
  
})();