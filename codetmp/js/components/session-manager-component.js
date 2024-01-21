let compoSessionManager = (function () {

  let SELF = {
    CreateSession,
    UpdateSessionDirHandle,
    SetSidParameter,
    GetSidParameter,
    TaskRestoreSession,
    TaskRestoreOpenFileHandlers,
  };

  let urlParamKey = 'session'
  let data = {

  };

  async function CreateSession(sessionId) {
    SetSidParameter(sessionId);
    let sessionData = {
      sessionId,
      activeWorkspace, // from global
    }
    let fid = await window.idbEditorSessionStorage.put('sessions', sessionData);
  }

  async function UpdateSessionDirHandle(dirHandle) {
    let item = await taskGetSessionData();
    if (!item) return;

    item['dirHandle'] = dirHandle;

    let fid = await window.idbEditorSessionStorage.put('sessions', item);
  }

  async function taskGetSessionData() {
    let sid = GetSidParameter();
    if (!sid) return null;

    await helper.TaskWaitUntil(() => window.idbEditorSessionStorage);
    
    let store = window.idbEditorSessionStorage.transaction('sessions').objectStore('sessions');
    let data = await store.get(sid);
    if (!data) return null;

    return data;
  }

  async function TaskRestoreSession() {
    return await taskGetSessionData();
  }

  async function TaskRestoreOpenFileHandlers(sessionData) {
    let dirHandle = await TaskGetDirHandle();
    
    if (!dirHandle) return;
    
    let parentFolderId = -1; // root
    await helper.TaskWaitUntil(() => typeof(fileReaderModule) == 'object');
    await fileReaderModule.TaskPopulateFiles(dirHandle, parentFolderId);
  }

  async function TaskGetDirHandle() {
    let item = await taskGetSessionData();
    if (!item || !item.dirHandle) return;

    await modal.confirm('You will need to grant file system access read/write permission to reopen previous session files.');

    let isPermissionGranted = await verifyPermission(item.dirHandle, true);
    if (!isPermissionGranted) return;

    return item.dirHandle;
  }

  async function verifyPermission(fileHandle, readWrite) {
    const options = {};
    if (readWrite) {
      options.mode = 'readwrite';
    }
    // Check if permission was already granted. If so, return true.
    if ((await fileHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    // Request permission. If the user grants permission, return true.
    if ((await fileHandle.requestPermission(options)) === 'granted') {
      return true;
    }
    // The user didn't grant permission, so return false.
    return false;
  }

  function SetSidParameter(sidValue) {
    // Get the current URL search parameters
    let urlSearchParams = new URLSearchParams(window.location.search);

    // Update or add the "sid" parameter
    urlSearchParams.set('session', sidValue);

    // Update the URL with the new search parameters
    window.history.replaceState({}, '', `${window.location.pathname}?${urlSearchParams.toString()}${window.location.hash}`);
  }

  function GetSidParameter() {
    // Get the current URL search parameters
    let urlSearchParams = new URLSearchParams(window.location.search);

    // Retrieve the value of the "sid" parameter
    return urlSearchParams.get('session');
  }

  return SELF;

})();