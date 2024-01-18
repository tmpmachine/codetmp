let fileManager = (function() {
  
  let SELF = {
    TaskInitIDBStorage,
    TaskOnStorageReady,

    CreateFile,
    CreateFolder,
    RenameFile,
    RenameFolder,
    TaskClearStorage,
    OpenFolder,
    UnloadItem,
    TaskOpenLocal,
    TaskDeleteFile,
    TaskDeleteFolder,
    
    TaskGetFile,
    TaskUpdate,
    TaskMoveFile,
    TaskListFiles,
    TaskListFolders,
    TaskGetAllFolders,
    TaskGetListFolder,
    TaskGetExistingItem,
    
    TaskGetPreviewLink,
    save,
  };

  let STORAGE_TYPE = 'localStorage'; 
  
  if ('indexedDB' in window) {
     // check if cirrently not using fileStorage
     let storageType = window.localStorage.getItem('codetmp-storage-type');
     let fs = window.fileStorage.data;
     if (storageType == 'idb' || (fs.files.length == 0 && fs.folders.length == 0 && fs.sync.length == 0)) {
       STORAGE_TYPE = 'idb';
       window.localStorage.setItem('codetmp-storage-type', 'idb');
     }
  }

  async function TaskInitIDBStorage() {
    let dbName = 'codetmp';
    let dbVersion = 1;
    window.idbStorage = await idb.openDB(dbName, dbVersion, {
      upgrade(db, oldVersion, newVersion, transaction, event) {
        let fileStore = db.createObjectStore('files', { keyPath: 'fid', autoIncrement: true });
        let folderStore = db.createObjectStore('folders', { keyPath: 'fid', autoIncrement: true });
        fileStore.createIndex('id', 'id', { unique: false });
        fileStore.createIndex('parentId', 'parentId', { unique: false });
        folderStore.createIndex('id', 'id', { unique: false });
        folderStore.createIndex('parentId', 'parentId', { unique: false });
      },
    });
  }

  async function TaskOnStorageReady() {
    return new Promise(resolve => {
      let interval = window.setInterval(() => {
        if (STORAGE_TYPE != 'idb' || window.idbStorage !== undefined) {
          window.clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }

  async function CreateFile(data = {}, workspaceId = activeWorkspace, isStoreWriteable = true) {
    
    let temp = activeWorkspace;
    activeWorkspace = workspaceId;
    
    let file = fileStorage.new('files');
    
    let predefinedData = {
      fid: fileStorage.data.counter.files,
      name: 'untitled.html',
      content: fileTab[activeTab].editor.env.editor.getValue(),
      loaded: true,
      parentId: activeFolder,
      modifiedTime: new Date().toISOString(),
    };
    fileStorage.data.counter.files += 1;
    
    for (let key in predefinedData) {
      if (file.hasOwnProperty(key)) {
        file[key] = predefinedData[key];
      }
    }
    
    for (let key in data) {
      if (file.hasOwnProperty(key))
        file[key] = data[key];
    }
    
    // store data
    if (STORAGE_TYPE == 'idb'  && activeWorkspace == 0) {
      
      delete file.fid;
      let fid = await window.idbStorage.put('files', file);
      file.fid = fid;

    } else {
      
      if (activeWorkspace == 2) {

        let currentDir = await TaskGetFile({fid:file.parentId, type: 'folders'});
        
        if (currentDir) {

          try {

            let dirHandle = currentDir.directoryHandle;
            if (dirHandle == null) {
              dirHandle = await currentDir.parentDirectoryHandle.getDirectoryHandle(currentDir.name);
              currentDir.directoryHandle = dirHandle;
            }

            let fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
            
            if (isStoreWriteable) {
              
              const writable = await fileHandle.createWritable();
              if (helper.hasFileReference(file.fileRef)) {
                await writable.write(file.fileRef); // write stream from copied file
              } else {
                await writable.write(file.content); // write stream from editor
              }
              await writable.close();
            }
            
            let fileRef = await fileHandle.getFile();
            fileRef.entry = fileHandle;
            file.fileRef = fileRef;
            file.content = null;
            
          } catch (error) {
            // no directory handler found with such name
            console.error(error);
          }
          
        }

      }

      fileStorage.data.files.push(file);

    }

    activeWorkspace = temp;
    return file;
  }

  async function CreateFolder(data = {}, workspaceId = activeWorkspace) {
    
    let temp = activeWorkspace;
    activeWorkspace = workspaceId;
    
    let file = fileStorage.new('folders');
    
    let predefinedData = {
      fid: fileStorage.data.counter.folders,
      name: 'New Folder',
      parentId: activeFolder,
      modifiedTime: new Date().toISOString(),

      directoryHandle: null,
      parentDirectoryHandle: null,
    };
    fileStorage.data.counter.folders += 1;
    
    for (let key in predefinedData) {
      if (file.hasOwnProperty(key))
        file[key] = predefinedData[key];
    }
    
    for (let key in data) {
      if (file.hasOwnProperty(key))
        file[key] = data[key];
    }
    
    // store data
    if (STORAGE_TYPE == 'idb' && activeWorkspace == 0) {
      delete file.fid;
      let fid = await window.idbStorage.put('folders', file);
      file.fid = fid;
    } else {
      
      // todo: WIP - handle creating new file on file system
      if (activeWorkspace == 2) {
        let currentDir = await TaskGetFile({fid:activeFolder, type: 'folders'});
        if (currentDir) {
          try {
            let dirHandle = currentDir.directoryHandle;
            if (dirHandle == null) {
              dirHandle = await currentDir.parentDirectoryHandle.getDirectoryHandle(currentDir.name);
              currentDir.directoryHandle = dirHandle;
            }

            let newDirHandle = await dirHandle.getDirectoryHandle(file.name, { create: true });
            file.directoryHandle = newDirHandle;
          } catch (error) {
            // no directory handler found with such name
            console.error(error);
          }
          
        }
      }

      fileStorage.data.folders.push(file);
      fileStorage.save();

    }

    activeWorkspace = temp;
    return file;
  }

  async function RenameFile(fid, newFileName) {
    let file = await TaskGetFile({fid, type:'files'});
    
    file.name = newFileName;
    await TaskUpdate(file, 'files');
    commit({
      fid: fid,
      action: 'update',
      metadata: ['name'],
      type: 'files'
    });

    if (activeWorkspace == 2 && helper.hasFileReference(file.fileRef)) {
      try {
        let fileHandle = file.fileRef.entry;
        fileHandle.move(newFileName);
      } catch (error) {
        console.error(error)
      }
    }

    return file;
  }

  // not yet supported, keep for later
  async function RenameFolder(fid, newFileName) {
    let folder = await fileManager.TaskGetFile({fid, type: 'folders'});

    let oldFileName = folder.name;
    folder.name = newFileName;
    folder.modifiedTime = new Date().toISOString();
    await TaskUpdate(folder, 'folders');
    commit({
      fid: folder.fid,
      action: 'update',
      metadata: ['name'],
      type: 'folders'
    });

    if (activeWorkspace == 2) {
      try {
        let dirHandle = folder.directoryHandle;
        if (dirHandle == null) {
          dirHandle = await folder.parentDirectoryHandle.getDirectoryHandle(oldFileName);
          folder.directoryHandle = dirHandle;
        }
        dirHandle.move(newFileName);
      } catch (error) {
        console.error(error)
      }
    }

    return folder;
  }


  async function taskWriteToDisk(fileHandle, editorContent, tabFileName, tabFile) {
    
    let writable = await fileHandle.createWritable();
    let content = editorContent;
	  if (helper.isMediaTypeHTML(tabFileName) && settings.data.editor.divlessHTMLFSEnabled) {

	    // check for divless directory
	    let currentFile = tabFile;
      let hasDivlessFile = false;
      if (currentFile) {
        let parent = await TaskGetFile({fid: currentFile.parentId, type: 'folders'});
        if (parent && parent.name == '.divless' && parent.trashed == false) {
          let targetFile = currentFile.divlessTarget;
          if (!currentFile.divlessTarget) {
            let files = await TaskListFiles(parent.parentId);
            targetFile = files.find(file => file.name == currentFile.name && !file.trashed);
          }
          if (targetFile) {
            hasDivlessFile = true;
            currentFile.divlessTarget = targetFile;
            await writeToDiskFile(divless.replace(content), targetFile);
          }
        } 
      }

    }

    await writable.write(content);
    await writable.close();

  }
  
  async function writeToDiskFile(content, file) {
    let writable = await file.fileRef.entry.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async function TaskDisplayListFolders() {
    let folders = await TaskListFolders(activeFolder);
    folders.sort(function(a, b) {
      return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
    });

    let counter = 1;
    let downloadQueue = [];

    let docFrag = document.createDocumentFragment();

    for (let f of folders) {
      if (f.trashed) continue;
      let el = $('#tmp-folder-list').content.cloneNode(true);
      $('.Name', el)[0].textContent = f.name;
      $('.Clicker', el)[0].setAttribute('title', f.name);
      $('.Clicker', el)[0].setAttribute('data', f.fid);
      $('.Clicker', el)[0].dataset.number = counter;

      docFrag.append(el);
      counter++;
      if (!f.isLoaded)
        downloadQueue.push(f.id)
    }
    
    $('#file-list').appendChild(docFrag);

    if (downloadQueue.length > 0) {
      let notifId = compoNotif.Add({
        title: 'Loading directory',
      });
      drive.syncFromDrivePartial(downloadQueue).then(() => {
        compoNotif.GetInstance().update(notifId, {content:'Done'}, true);
      });
    }
  }

  async function TaskGetListFolder(parentId = activeFolder) {
    let folders = await TaskListFolders(parentId);
    folders.sort(function(a, b) {
      return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
    });
    let result = [];
    let downloadQueue = [];
    for (let f of folders) {
      if (f.trashed) 
        continue;
      if (!f.isLoaded)
        downloadQueue.push(f.id)
      result.push(f)
    }

    if (downloadQueue.length > 0) {
      let notifId = compoNotif.Add({
        title: 'Loading directory',
      });
      drive.syncFromDrivePartial(downloadQueue).then(() => {
        compoNotif.GetInstance().update(notifId, {content:'Done'}, true);
      });
    }
    return result;
  }
  
  function traversePath(parentId, path = []) {
    if (parentId === -1)
      return path;
    let folder = odin.dataOf(parentId, fileStorage.data.folders, 'fid');
    path.push(folder.name);
    return traversePath(folder.parentId, path);
  }

  SELF.getFullPath = function(file) {
    let path = traversePath(file.parentId).reverse();
    path.push(file.name);
    return path.join('/');
  };

  async function TaskListFiles(parentId) {
    if (STORAGE_TYPE == 'idb' && activeWorkspace == 0) {
      return await window.idbStorage.getAllFromIndex('files','parentId', parseInt(parentId));
    } else {
      return odin.filterData(parentId, fileStorage.data.files, 'parentId');
    }
  }

  async function TaskListFolders(parentId, column = 'parentId') {
    if (STORAGE_TYPE == 'idb' && activeWorkspace == 0) {
      if (column == 'parentId') {
        return await window.idbStorage.getAllFromIndex('folders', column, parseInt(parentId));
      } else if (column == 'fid') {
        return await window.idbStorage.getAllFromIndex('folders', column, parseInt(parentId));
      }
    } else {
      return odin.filterData(parentId, fileStorage.data.folders, column);
    }
  }
  
  async function TaskGetAllFolders() {
    if (STORAGE_TYPE == 'idb' && activeWorkspace == 0) {
      let store = window.idbStorage.transaction('folders').objectStore('folders');
      return await store.getAll();
    } else {
      if (activeWorkspace === 0) {
        return mainStorage.data.folders;
      }
    }  
    return [];
  }
  
  async function TaskDisplayListFiles() {
    
    let files = await fileManager.TaskListFiles(activeFolder);
    files.sort(function(a, b) {
      return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
    });
    
    let docFrag = document.createDocumentFragment();
    let counter = 1;

    for (let {fid, id, isTemp, name, trashed, fileRef} of files) {
      if (trashed) continue;
      
      let el = $('#tmp-file-list').content.cloneNode(true);
      $('.Name', el)[0].textContent = name;
      $('.Icon', el)[0].style.color = helper.getFileIconColor(name);
      $('.Clicker', el)[0].setAttribute('title', name);
      $('.Clicker', el)[0].setAttribute('data', fid);
      $('.Clicker', el)[0].dataset.fid = fid;
      $('.Clicker', el)[0].dataset.number = counter;

      if (isTemp) {
        if (fileRef.name === undefined && id.length === 0) {
          $('.Label', el)[0].textContent = 'missing link (!)';
          $('.Preview-icon', el)[0].textContent = 'broken_image';
        } else {
          if (fileRef.entry !== undefined) {
            $('.Label', el)[0].textContent = 'local';
            $('.Preview-icon', el)[0].textContent = 'attach_file';
          }
        }
      }
      
      docFrag.append(el);
      counter++;
    }
    $('#file-list').append(docFrag);

  }

  SELF.getListFiles = async function(parentId = activeFolder) {
    let files = await TaskListFiles(parentId);
    files.sort(function(a, b) {
      return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
    });
    let result = []
    for (let file of files) {
      if (file.trashed) continue;
      result.push(file)
    }
    return result;
  }

  SELF.downloadDependencies = function(file, source) {
    return new Promise((resolve, reject) => {
      if (source.origin == 'git')
        git.downloadFile(source.downloadUrl).then(resolve);
      else
        drive.downloadDependencies(file).then(resolve).catch(reject);
    });
  }

  SELF.downloadMedia = function(file) {
    return new Promise(resolve => {
      
      let notifId = compoNotif.Add({
        title: 'Downloading media',
        content: `file: ${file.name}`,
      });
      
      aww.pop('Downloading required file : '+file.name);
      let source = {};
      if (helper.isHasSource(file.content)) {
        source = helper.getRemoteDataContent(file.content);
      }
      fileManager.downloadDependencies(file, source).then(async (content) => {
        file.content = content;
        file.loaded = true;
        file.isTemp = false;

        if (STORAGE_TYPE == 'idb' && activeWorkspace == 0) {
          await TaskUpdate(file, 'files');
        }
        fileStorage.save();
        
        if (source.origin == 'git') {
          fileManager.sync({
            fid: file.fid,
            action: 'update',
            metadata: ['media'],
            type: 'files'
          });
          drive.syncToDrive();
        }

        if (helper.isHasSource(content)) {
          fileManager.downloadMedia(file).then(() => {
            compoNotif.GetInstance().update(notifId,{content:`file: ${file.name} (done)`}, true);
            resolve();
          });
        } else {
          aww.pop('Successfully download required file: '+file.name);
          compoNotif.GetInstance().update(notifId,{content:`file: ${file.name} (done)`}, true);
          resolve();
        }
      }).catch(errMsg => {
        compoNotif.GetInstance().update(notifId, {
          title: 'Downloading failed',
          content: `file: ${file.name}.<br>Error : ${errMsg}`,
        }, true);
      })
    });
  }
  
  SELF.sync = function(data) {
    if (activeWorkspace === 0) {
      SELF.handleSync(data);
    }
  };

  async function TaskOpenLocal(event) {
    if (typeof(window.showOpenFilePicker) !== 'undefined') {
      event.preventDefault();
      let [entry] = await window.showOpenFilePicker();
  		entry.getFile().then(r => {
  			r.text().then(r => {
  				ui.openNewTab(-1, {
  					fid: '-' + (new Date).getTime(),
  					name: entry.name,
  					editor: compoEditor.Init(r),
  					content: r,
  					fileHandle: entry,
  				});
  			});
  		});
    }
  }
  
  function saveAsNewFile() {
  	let fileName = $('.file-name')[activeTab].textContent;
    modal.prompt('File name', fileName, '', helper.getFileNameLength(fileName)).then(async (name) => {
      if (!name) return;
      
      let isCreatedFromFileTab = true;
      let file = await CreateFile({
        name,
      });
      fileManager.sync({
        fid: file.fid, 
        action: 'create', 
        type: 'files',
      });
      drive.syncToDrive();
      await SELF.list();
      fileStorage.save();
      
      let scrollTop = fileTab[activeTab].editor.env.editor.getSession().getScrollTop();
      let row = fileTab[activeTab].editor.env.editor.getCursorPosition().row;
      let col = fileTab[activeTab].editor.env.editor.getCursorPosition().column;
      
      uiTreeExplorer.AppendFile(file);

      fileContent = file.content;
      if (activeWorkspace == 2) {
        fileContent = fileTab[activeTab].editor.env.editor.getValue();
      }

      tabManager.ConfirmCloseTab(false);
      let tabData = {
        fid: file.fid,
        name: file.name,
        fiber: 'close',
        file: file,
        fileHandle: ( (activeWorkspace == 2 && file.fileRef && file.fileRef.entry) ? file.fileRef.entry : null ),
        editor: compoEditor.Init(fileContent, scrollTop, row, col),
      };
      tabManager.newTab(activeTab, tabData);

    }).catch((err) => {
      fileTab[activeTab].editor.env.editor.focus();
    });
  }

  async function saveExistingFile() {
    let fid = activeFile.fid;
    let file = await TaskGetFile({fid, type: 'files'});
    file.content = fileTab[activeTab].editor.env.editor.getValue();
    file.modifiedTime = (new Date()).toISOString();
    fileManager.sync({
      fid,
      action: 'update',
      metadata: ['media'],
      type: 'files'
    });

    if (STORAGE_TYPE == 'idb' && activeWorkspace == 0) {
      await TaskUpdate(file, 'files');
    }
    fileStorage.save();
    drive.syncToDrive();

    fileTab[activeTab].fiber = 'close';
    $('.icon-rename')[activeTab].textContent = 'close';
  }

  async function save() {

    if (fileTab[activeTab].fileHandle !== null) {

      let sourceTab = fileTab[activeTab]; 
      let tabFid = sourceTab.fid;

      let fileHandle = sourceTab.fileHandle;
      let editorContent = sourceTab.editor.env.editor.getValue();
      let tabFileName = sourceTab.name;
      let tabFile = sourceTab.file;
      
      await taskWriteToDisk(fileHandle, editorContent, tabFileName, tabFile);

      // user may have close or change active tab, check the tab again
      {
        let tabIndex = tabManager.GetIndexByFid(tabFid);
        if (tabIndex >= 0) {
          fileTab[tabIndex].fiber = 'close';
          $('.icon-rename')[tabIndex].textContent = 'close';
        }
      }

    } else {
      
      if (activeFile === null) {
      	saveAsNewFile();
      } else {
        saveExistingFile();
      }

    }

  }

  async function TaskUpdate(data, type) {
    if (STORAGE_TYPE == 'idb' && activeWorkspace == 0) {
      if (type == 'files') {
        await window.idbStorage.put('files', data);
      } else if (type == 'folders') {
        await window.idbStorage.put('folders', data);
      }
    }
  }

  async function TaskMoveFile(data, targetFolderFid, fileType) {

    // handle file system move file
    if (activeWorkspace == 2) {

      let currentDir = await TaskGetFile({fid:targetFolderFid, type: 'folders'});
      if (currentDir) {

        try {

          let dirHandle = currentDir.directoryHandle;
          if (dirHandle == null) {
            dirHandle = await currentDir.parentDirectoryHandle.getDirectoryHandle(currentDir.name);
            currentDir.directoryHandle = dirHandle;
          }

          let fileHandle = getFileHandle(data);
          if (fileHandle !== null) {
            await fileHandle.move(dirHandle);
          }
          
        } catch (error) {
          // no directory handler found with such name
          console.error(error);
        }
        
      }

    }

    data.parentId = targetFolderFid;
    await TaskUpdate(data, fileType);
  }
  
  SELF.list = async function() {
    $('#file-list').innerHTML = '';
    await TaskDisplayListFolders();
    $('#file-list').appendChild(o.element('div', { style: 'flex: 0 0 100%', class: 'separator w3-padding-small' }));
    await TaskDisplayListFiles();
    uiFileExplorer.LoadBreadCrumbs();
    selectedFile.splice(0, 1);
    ui.toggleFileActionButton();
  };

  function getFileContent(file) {
    return new Promise(resolve => {
      if (typeof(file.fileRef.name) != 'undefined' && file.content === null) {
        if (file.fileRef.entry) {
          file.fileRef.entry.getFile().then(file => {
            file.text().then(resolve);
          });
        } else {
          file.fileRef.text().then(resolve);
        }
      } else {
        resolve(file.content);
      }
    })
  }
  
  async function TaskGetFile(data, workspaceId = activeWorkspace) {
    let haystack;

    if (STORAGE_TYPE == 'idb' && activeWorkspace == 0) {
      let store;
      if (data.type == 'files') {
        store = window.idbStorage.transaction('files').objectStore('files');
      } else {
        store = window.idbStorage.transaction('folders').objectStore('folders');
      }
      if (data.id !== undefined)
        return await window.idbStorage.getFromIndex(data.type, 'id', data.id);
      else if (data.fid !== undefined)
        return await store.get(parseInt(data.fid));
    } else {
      if (workspaceId === 0) {
        haystack = (data.type == 'files') ? mainStorage.data.files : mainStorage.data.folders;
      } else {
        haystack = (data.type == 'files') ? fileStorage.data.files : fileStorage.data.folders;
      }
      
      if (data.id !== undefined) {
        return odin.dataOf(data.id, haystack, 'id')
      } else if (data.fid !== undefined) {
        return odin.dataOf(data.fid, haystack, 'fid')
      }
    }
  }

  function getFileHandle(file) {
    if (typeof(file.fileRef.name) != 'undefined') {
      if (typeof(file.fileRef.entry) != 'undefined') {
        return file.fileRef.entry;
      }
    }
    return null;
  }

  function openOnEditor(f) {
    activeFile = f;
    if (fileTab.length == 1 && fileTab[activeTab].editor.env.editor.getValue().length == 0 && String(fileTab[0].fid)[0] == '-') {
      tabManager.ConfirmCloseTab(false);
    }

    getFileContent(f).then(content => {
      let idx = odin.idxOf(f.fid, fileTab, 'fid')
      if (idx < 0) {
        ui.openNewTab(fileTab.length, {
          fid: f.fid,
          editor: compoEditor.Init(content),
          name: f.name,
          fiber: 'close',
          file: f,
          fileHandle: getFileHandle(f),
        });
      } else {
        fileTab[activeTab].content = fileTab[activeTab].editor.env.editor.getValue();
        tabManager.focusTab(f.fid, false);
      }
      
    if ($('#btn-menu-my-files').classList.contains('active'))
        $('#btn-menu-my-files').click();
    })
  }

  SELF.open = async function(fid) {
    let f = await TaskGetFile({fid, type: 'files'});
    let mimeType = helper.getMimeType(f.name);

    new Promise(function(resolve, reject) {
      let isMediaTypeMultimedia = helper.isMediaTypeMultimedia(mimeType);
  	  if (f.loaded || isMediaTypeMultimedia) {
  	    resolve();
  	  } else {
  	    if (f.isTemp && f.content === null && f.id === '') {
  	    	reject(404)
  	    } else {
  	    	fileManager.downloadMedia(f).then(resolve);
  	    }
  	  }
  	}).then(() => {
      let isMediaTypeText = helper.isMediaTypeText(f.name);
      let isMediaTypeStream = helper.isMediaTypeStream(f.name);
      if (isMediaTypeText || isMediaTypeStream) {
     	  openOnEditor(f);
      } else {
        ui.previewMedia(f, mimeType);
      }
    }).catch(function(error) {
      if (error === 404) {
	      let notifId = compoNotif.Add({title: 'Failed to open file', content: 'Missing file link : '+f.name});
	      setTimeout(() => compoNotif.GetInstance().update(notifId, {}, true), 3000);
      } else {
      	aww.pop('Could not download file');
      }
    });
  };

  function TaskGetPreviewLink(f) {
    return new Promise(async (resolve, reject) => {

      let src = f.contentLink;

      if (f.isTemp && helper.hasFileReference(f.fileRef) && f.content === null) {
      // if (f.fileRef.name !== undefined) {
        src = URL.createObjectURL(f.fileRef);
      } else {
        if (helper.isHasSource(f.content)) {
          src = helper.getRemoteDataContent(f.content).downloadUrl;
        } else {
          if (f.id.length > 0 && src.length === 0) {
            let contentLink = await drive.getWebContentLink(f.id);
            f.contentLink = contentLink;
            src = contentLink;
            if (STORAGE_TYPE == 'idb' && activeWorkspace == 0) {
              await TaskUpdate(f, 'files');
            } else {
              fileStorage.save();
            }
          }
        }
      }

      if (src.length === 0)
        reject();
      else
        resolve(src);
    });
  }

  async function TaskGetExistingItem(name, parentId, type = 'file') {
    let haystack;
    if (type == 'file')
      haystack = await TaskListFiles(parentId);
    else if (type == 'folder')
      haystack = await TaskListFolders(parentId);

    for (var i=0; i<haystack.length; i++) {
      if (haystack[i].trashed)
        continue;
      if (haystack[i].name === name) {
        return haystack[i];
      }
    }
    return null;
  }

  SELF.getDuplicateName = async function(parentId, name, type = 'file', originalName = '', duplicateCount = 1) {
    if (originalName == '')
      originalName = name;
    let existing = await TaskGetExistingItem(name, parentId, type);
    if (existing !== null) {
        let ext = '';
        var arr = originalName.split('.');
        if (arr.length > 1) {
          ext = '.'+arr.pop();
        }
        return await SELF.getDuplicateName(parentId, arr.join('.')+' ('+duplicateCount+')'+ext, type, originalName, duplicateCount+1);
    }
    return name;
  }

  async function OpenFolder(folderId) {
    activeFolder = folderId;
    
    if (activeFolder == -1) {
      breadcrumbs.splice(1);
    } else {
      let folder = await TaskGetFile({fid: folderId, type: 'folders'});
      let title = folder.name;
      breadcrumbs.push({folderId:activeFolder, title})
    }
    
    fileManager.list();
  }

  SELF.handleSync = function(sync) {
    
    if (sync.action === 'create' || sync.action === 'copy') {
      sync.metadata = [];
      fileStorage.data.sync.push(sync);
    } else if (sync.action === 'update') {
      // Reduce request load by merging, modifying, and swapping sync request in queue.
      // Do not reorder sync with type of files to prevent file being created before parent directory.
      fileStorage.data.sync.push(sync);
      
      for (let i=0; i<fileStorage.data.sync.length-1; i++) {
        let s = fileStorage.data.sync[i];
        
        if (s.fid === sync.fid && s.type == sync.type) {
          switch (s.action) {
            case 'create':
            case 'copy':
              if (!sync.metadata.includes('trashed')) {
                if (sync.type == 'files') {
                  fileStorage.data.sync.splice(i, 1);
                  sync.action = s.action;
                  sync.metadata = [];
                }
              }
              break;
            case 'update':
              for (let meta of s.metadata) {
                if (sync.metadata.indexOf(meta) < 0)
                  sync.metadata.push(meta);
                  
                if (meta === 'parents')
                  sync.source = s.source;
              }
              if (sync.type == 'files' && !s.isSyncInProgress) 
                fileStorage.data.sync.splice(i, 1);
              break;
          }
          break;
        }
      }
    } else if (sync.action === 'delete') {
      for (let i=0; i<fileStorage.data.sync.length; i++) {
        if (fileStorage.data.sync[i].fid === sync.fid)
          fileStorage.data.sync.splice(i, 1);
      }
    }
  }

  SELF.reloadBreadcrumb = async function() {
    breadcrumbs.length = 0;
    let folderId = activeFolder;
    while (folderId != -1) {
      let folder = await TaskGetFile({fid: folderId, type: 'folders'});
      breadcrumbs.push({folderId:folder.fid, title: folder.name})
      folderId = folder.parentId;
    }
    breadcrumbs.push({folderId:-1, title: 'My Files'});
    breadcrumbs.reverse();
    uiFileExplorer.LoadBreadCrumbs();
  }

  async function TaskDeleteFolder(fid) {
    let data = await TaskGetFile({fid, type: 'folders'});
    data.trashed = true;
    await TaskUpdate(data, 'folders');
    
    // delete the folder in file system mode
    if (activeWorkspace == 2) {
      try {
        let parentDirectoryHandle = data.parentDirectoryHandle;
        if (parentDirectoryHandle == null) {
          let parentDir = await TaskGetFile({fid: data.parentId, type: 'folders'});
          parentDirectoryHandle = parentDir.directoryHandle;
        }
        await parentDirectoryHandle.removeEntry(data.name, { recursive: true });
      } catch (error) {
        console.error(error)
      }
    }

    commit({
      fid: data.fid,
      action: 'update',
      metadata: ['trashed'],
      type: 'folders'
    });
    app.getComponent('fileTree').then(fileTree => {
      fileTree.removeFolder(data);
    });
  }

  async function TaskDeleteFile(fid) {
    let data = await TaskGetFile({fid, type: 'files'});
    data.trashed = true;
    await TaskUpdate(data, 'files');;
  
    // delete the file in file system mode
    if (activeWorkspace == 2) {
      if (helper.hasFileReference(data.fileRef)) {
        try {
          let fileHandle = data.fileRef.entry;
          await fileHandle.remove();  
        } catch (error) {
          console.error(error);
        }
      } 
    }

    for (let sync of fileStorage.data.sync) {
      if (sync.action === 52 && sync.copyId === fid) {
        sync.action = 12;
      }
    }

    commit({
        fid: data.fid,
        action: 'update',
        metadata: ['trashed'],
        type: 'files'
    });

    app.getComponent('fileTree').then(fileTree => {
      fileTree.removeFile(data);
    });
  }

  async function UnloadItem(fid, type) {
    let data = await TaskGetFile({fid, type: type});
    if (type == 'folders') {
      data.isLoaded = false;
    } else if (type == 'files') {
      data.loaded = false;
    }
    await TaskUpdate(data, type);
  }
  
  async function TaskClearStorage() {
    if (STORAGE_TYPE == 'idb') {
      await window.idbStorage.clear('folders');  
      await window.idbStorage.clear('files');  
    }
    window.localStorage.removeItem('codetmp-storage-type');
    fileStorage.reset();
  }

  function commit(data) {
    SELF.sync(data);
    drive.syncToDrive();
    fileStorage.save();
    SELF.list();
  }
  
  return SELF;
  
})();