(function() {

  window.settings = new lsdb('settings', {
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
    }
  });

  // testing out development data
  window.tempData = new lsdb('tempData', {
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
    let mainStorage = new lsdb('file-storage', fileStructure);
    let tempStorage = new lsdb('temp-file-storage', fileStructure, {
      isStoreData: false,
    });
    let temp2Storage = new lsdb('temp2-file-storage', fileStructure, {
      isStoreData: false,
    });
    let workspaces = [mainStorage, tempStorage, temp2Storage];
    window.mainStorage = mainStorage;
    Object.defineProperty(window, 'fileStorage', { 
      get: () => workspaces[activeWorkspace],
    });

  }

  initWorkspace();

})();