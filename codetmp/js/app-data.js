let appData = (function() {

  let SELF = {
    GetComponentData,
    SetComponentData,
    Save,
  };

  let lsdb = window.settings = new Lsdb('settings', {
    root: {
      gitToken: '',
      drive: {
        startPageToken: ''
      },
      editor: {
        emmetEnabled: false,
        autoCompleteEnabled: true,
        divlessHTMLEnabled: true,
        divlessHTMLFSEnabled: true,
        wordWrapEnabled: true,
        linkPreviewWindowProcess: false,

        // JS & CSS minifier
        minifyJs: false,
        minifyJsFirebase: false,
        minifyCssFirebase: false,
        transformCssFirebase: false,
      },
      explorer: {
        view: 'grid',
        tree: true,
      },
      showHomepage: true,
      autoSync: true,
      saveGitToken: false,
      
      // components
      components: {
        compoGsi: {},
      }
    }
  });

  // testing out development data
  window.tempData = new Lsdb('tempData', {
    root: {
      worktree: []
    }
  });

  function initWorkspace() {

    let fileStructure = {
      root: {
        rootId: '',
        files: [],
        folders: [],
        sync: [],
        counter: {
          files: 0,
          folders: 0
        }
      },
    
      folders:{
        fid: 0,
        parentId: -1,
        
        id: '',
        name: '',
        modifiedTime: '',
        trashed: false,
        isLoaded: true,
        isSync: false,

        directoryHandle: null,
        parentDirectoryHandle: null,
      },
      files: {
        fid: 0,
        parentId: -1,
        modifiedTime: '',
        isLock: false,
        loaded: false,
        
        contentLink: '',
        id: '',
        name: '',
        content: '',
        trashed: false,
        fileRef: {},
      },
      sync: {
        action: '',
        fid: -1,
        source: -1,
        metadata: [],
        type: '',
        isSyncInProgress: false,
      },
    };
    let mainStorage = new Lsdb('file-storage', fileStructure);
    let tempStorage = new Lsdb('temp-file-storage', fileStructure, {
      isStoreData: false,
    });
    let temp2Storage = new Lsdb('temp2-file-storage', fileStructure, {
      isStoreData: false,
    });
    let workspaces = [mainStorage, tempStorage, temp2Storage];
    window.mainStorage = mainStorage;
    Object.defineProperty(window, 'fileStorage', { 
      get: () => workspaces[activeWorkspace],
    });

  }

  function Save() {
    lsdb.save();
  }

  function clearReference(data) {
    return JSON.parse(JSON.stringify(data));
  }
  
  function SetComponentData(componentKey, noReferenceData) {
    if (!lsdb.data.components[componentKey]) return;
    
    lsdb.data.components[componentKey] = noReferenceData;
  }
  
  function GetComponentData(componentKey, callback) {
    if (!lsdb.data.components[componentKey]) return;
    
    callback(clearReference(lsdb.data.components[componentKey]));
  }

  initWorkspace();

  return SELF;

})();