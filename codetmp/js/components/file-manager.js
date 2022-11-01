let fileManager = new FileManager();

function FileManager() {
  
  let SELF = {

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

  SELF.initIDBStorage = async function() {
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
  };

  SELF.onStorageReady = async function() {
    return new Promise(resolve => {
      let interval = window.setInterval(() => {
        if (STORAGE_TYPE != 'idb' || window.idbStorage !== undefined) {
          window.clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }

  async function CreateFile(data, workspaceId) {
    
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
      fileStorage.data.files.push(file);
      fileStorage.data.counter.files++;
    }

    activeWorkspace = temp;
    return file;
  }

  async function CreateFolder(data, workspaceId) {
    
    let temp = activeWorkspace;
    activeWorkspace = workspaceId;
    
    let file = fileStorage.new('folders');
    
    let predefinedData = {
      fid: fileStorage.data.counter.folders,
      name: 'New Folder',
      parentId: activeFolder,
      modifiedTime: new Date().toISOString(),
    };
    
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
      fileStorage.data.counter.folders++;
      fileStorage.data.folders.push(file);
      fileStorage.save();
    }

    activeWorkspace = temp;
    return file;
  }
  
  SELF.newFile = async function(data = {}, workspaceId = activeWorkspace) {
    return await CreateFile(data, workspaceId)
  };

  SELF.newFolder = async function(data = {}, workspaceId = activeWorkspace) {
    return await CreateFolder(data, workspaceId)
  };

  async function writeToDisk() {
    let writable = await fileTab[activeTab].fileHandle.createWritable();
    let content = fileTab[activeTab].editor.env.editor.getValue();
	  if (helper.isMediaTypeHTML(fileTab[activeTab].name) && settings.data.editor.divlessHTMLFSEnabled) {
      content = divless.replace(content);
    }
    await writable.write(content);
    await writable.close();
    fileTab[activeTab].fiber = 'close';
    $('.icon-rename')[activeTab].textContent = 'close';
  }

  async function displayListFolders() {
    let folders = await SELF.listFolders(activeFolder);
    folders.sort(function(a, b) {
      return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
    });
    let counter = 1;
    let downloadQueue = [];
    for (let f of folders) {
      if (f.trashed) continue;
      let el = $('#tmp-folder-list').content.cloneNode(true);
      $('.Name', el)[0].textContent = f.name;
      $('.Clicker', el)[0].setAttribute('title', f.name);
      $('.Clicker', el)[0].setAttribute('data', f.fid);
      $('.Clicker', el)[0].dataset.number = counter;

      $('#file-list').appendChild(el);
      counter++;
      if (!f.isLoaded)
        downloadQueue.push(f.id)
    }
    if (downloadQueue.length > 0) {
      let notifId = notif.add({
        title: 'Loading directory',
      });
      drive.syncFromDrivePartial(downloadQueue).then(() => {
        notif.update(notifId, {content:'Done'}, true);
      });
    }
  }

  SELF.getListFolder = async function(parentId = activeFolder) {
    let folders = await SELF.listFolders(parentId);
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
      let notifId = notif.add({
        title: 'Loading directory',
      });
      drive.syncFromDrivePartial(downloadQueue).then(() => {
        notif.update(notifId, {content:'Done'}, true);
      });
    }
    return result;
  };
  
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

  SELF.listFiles = async function(parentId) {
    if (STORAGE_TYPE == 'idb' && activeWorkspace == 0) {
      return await window.idbStorage.getAllFromIndex('files','parentId', parseInt(parentId));
    } else {
      return odin.filterData(parentId, fileStorage.data.files, 'parentId');
    }
  };

  SELF.listFolders = async function(parentId, column = 'parentId') {
    if (STORAGE_TYPE == 'idb' && activeWorkspace == 0) {
      if (column == 'parentId') {
        return await window.idbStorage.getAllFromIndex('folders', column, parseInt(parentId));
      } else if (column == 'fid') {
        return await window.idbStorage.getAllFromIndex('folders', column, parseInt(parentId));
      }
    } else {
      return odin.filterData(parentId, fileStorage.data.folders, column);
    }
  };
  
  SELF.getAllFolders = async function() {
    if (STORAGE_TYPE == 'idb' && activeWorkspace == 0) {
      let store = window.idbStorage.transaction('folders').objectStore('folders');
      return await store.getAll();
    } else {
      if (activeWorkspace === 0) {
        return mainStorage.data.folders;
      }
    }  
    return [];
  };
  
  async function displayListFiles() {
    let files = await fileManager.listFiles(activeFolder);
    files.sort(function(a, b) {
      return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
    });
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
      
      $('#file-list').appendChild(el);
      counter++;
    }
  }

  SELF.getListFiles = async function(parentId = activeFolder) {
    let files = await SELF.listFiles(parentId);
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
      
      let notifId = notif.add({
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

        if (source.origin == 'git') {
          fileManager.sync({
            fid: file.fid,
            action: 'update',
            metadata: ['media'],
            type: 'files'
          });
          drive.syncToDrive();
        }
        if (STORAGE_TYPE == 'idb' && activeWorkspace == 0) {
          await SELF.update(file, 'files');
        }
        fileStorage.save();

        if (helper.isHasSource(content)) {
          fileManager.downloadMedia(file).then(() => {
            notif.update(notifId,{content:`file: ${file.name} (done)`}, true);
            resolve();
          });
        } else {
          aww.pop('Successfully download required file: '+file.name);
          notif.update(notifId,{content:`file: ${file.name} (done)`}, true);
          resolve();
        }
      }).catch(errMsg => {
        notif.update(notifId, {
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

  SELF.openLocal = async function(event) {
    if (typeof(window.showOpenFilePicker) !== 'undefined') {
      event.preventDefault();
      let [entry] = await window.showOpenFilePicker();
  		entry.getFile().then(r => {
  			r.text().then(r => {
  				newTab(-1, {
  					fid: '-' + (new Date).getTime(),
  					name: entry.name,
  					editor: initEditor(r),
  					content: r,
  					fileHandle: entry,
  				});
  			});
  		});
    }
  };
  
  function saveAsNewFile() {
  	let fileName = $('.file-name')[activeTab].textContent;
    modal.prompt('File name', fileName, '', helper.getFileNameLength(fileName)).then(async (name) => {
      if (!name) 
      	return;
      
      let file = await SELF.newFile({
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
      
      ui.tree.appendFile(file);

      confirmCloseTab(false);
      newTab(activeTab, {
        fid: file.fid,
        name: file.name,
        fiber: 'close',
        file: file,
        editor: initEditor(file.content, scrollTop, row, col),
      });

    }).catch((err) => {
      fileTab[activeTab].editor.env.editor.focus();
    });
  }

  async function saveExistingFile() {
    let fid = activeFile.fid;
    let file = await fileManager.get({fid, type: 'files'});
    file.content = fileTab[activeTab].editor.env.editor.getValue();
    file.modifiedTime = (new Date()).toISOString();
    fileManager.sync({
      fid,
      action: 'update',
      metadata: ['media'],
      type: 'files'
    });
    drive.syncToDrive();

    if (STORAGE_TYPE == 'idb' && activeWorkspace == 0) {
      await SELF.update(file, 'files');
    }
    fileStorage.save();
    fileTab[activeTab].fiber = 'close';
    $('.icon-rename')[activeTab].textContent = 'close';
  }

  SELF.save = function() {
    if (fileTab[activeTab].fileHandle !== null) {
        writeToDisk();
    } else {
      if (activeFile === null) {
      	saveAsNewFile();
      } else {
        saveExistingFile();
      }
    }
  };

  SELF.update = async function(data, type) {
    if (STORAGE_TYPE == 'idb' && activeWorkspace == 0) {
      if (type == 'files') {
        await window.idbStorage.put('files', data);
      } else if (type == 'folders') {
        await window.idbStorage.put('folders', data);
      }
    }
  };
  
  SELF.list = async function() {
    $('#file-list').innerHTML = '';
    await displayListFolders();
    $('#file-list').appendChild(o.element('div', { style: 'flex: 0 0 100%', class: 'separator w3-padding-small' }));
    await displayListFiles();
    loadBreadCrumbs();
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
  
  SELF.get = async function(data, workspaceId = activeWorkspace) {
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
      if (workspaceId === 0)
        haystack = (data.type == 'files') ? mainStorage.data.files : mainStorage.data.folders;
      else
        haystack = (data.type == 'files') ? fileStorage.data.files : fileStorage.data.folders;
        if (data.id !== undefined)
          return odin.dataOf(data.id, haystack, 'id')
        else if (data.fid !== undefined)
          return odin.dataOf(data.fid, haystack, 'fid')
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
    if (fileTab.length == 1 && fileTab[activeTab].editor.env.editor.getValue().length == 0 && String(fileTab[0].fid)[0] == '-')
      confirmCloseTab(false);

    getFileContent(f).then(content => {
      let idx = odin.idxOf(f.fid, fileTab, 'fid')
      if (idx < 0) {
        newTab(fileTab.length, {
          fid: f.fid,
          editor: initEditor(content),
          name: f.name,
          fiber: 'close',
          file: f,
          fileHandle: getFileHandle(f),
        });
      } else {
        fileTab[activeTab].content = fileTab[activeTab].editor.env.editor.getValue();
        focusTab(f.fid, false);
      }
      
    if ($('#btn-menu-my-files').classList.contains('active'))
        $('#btn-menu-my-files').click();
    })
  }

  SELF.open = async function(fid) {
    let f = await fileManager.get({fid, type: 'files'});
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
	      let notifId = notif.add({title: 'Failed to open file', content: 'Missing file link : '+f.name});
	      setTimeout(() => notif.update(notifId, {}, true), 3000);
      } else {
      	aww.pop('Could not download file');
      }
    });
  };

  SELF.getPreviewLink = function(f) {
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
              await SELF.update(f, 'files');
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

  SELF.getExistingItem = async function(name, parentId, type = 'file') {
    let haystack;
    if (type == 'file')
      haystack = await SELF.listFiles(parentId);
    else if (type == 'folder')
      haystack = await SELF.listFolders(parentId);

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
    let existing = await SELF.getExistingItem(name, parentId, type);
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

  SELF.openFolder = async function(folderId) {
    activeFolder = folderId;
    
    if (activeFolder == -1) {
      breadcrumbs.splice(1);
    } else {
      let folder = await fileManager.get({fid: folderId, type: 'folders'});
      title = folder.name;
      breadcrumbs.push({folderId:activeFolder, title: title})
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
              if (sync.type == 'files') 
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

  SELF.reloadBreadcrumb = function() {
    breadcrumbs.length = 0;
    let folderId = activeFolder;
    while (folderId != -1) {
      let folder = fileManager.get({fid: folderId, type: 'folders'});
      breadcrumbs.push({folderId:folder.fid, title: folder.name})
      folderId = folder.parentId;
    }
    breadcrumbs.push({folderId:-1, title: 'My Files'});
    breadcrumbs.reverse();
    loadBreadCrumbs();
  }


  function getFileAtPath(path, parentId = -1) {
      
    while (path.match('//'))
      path = path.replace('//','/');
    
    let dir = path.split('/');
    let folder;
    
    while (dir.length > 1) {
      
      if (dir[0] === '..' || dir[0] === '.'  || dir[0] === '') {
        
        folder = fileManager.get({fid: parentId, type: 'folders'});
        if (folder === undefined)
          break;
        dir.splice(0, 1);
        parentId = folder.parentId;
      } else {
        
        let folders = fileManager.listFolders(parentId);
        folder = odin.dataOf(dir[0], folders, 'name');
        if (folder) {
          parentId = folder.fid;
          dir.splice(0, 1);
        } else {
          parentId = -2;
          break;
        }
      }
    }
    
    let fileName = path.replace(/.+\//g,'')
    let files = fileManager.listFiles(parentId);
    let found = files.find(file => file.name == fileName);
    return found;
  }


  function trashList() {
    
    var el;
    $('#list-trash').innerHTML = '';
    
    let folders = odin.filterData(true, fileStorage.data.folders, 'trashed');
    
    folders.sort(function(a, b) {
      return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
    });

    for (let f of folders) {
      el = o.element('div',{innerHTML:o.template('tmp-list-folder-trash', f)});
      $('#list-trash').appendChild(el);
    }
    
    $('#list-trash').appendChild(o.element('div', {style:'flex:0 0 100%;height:16px;'}));
    
    let files = odin.filterData(true, fileStorage.data.files, 'trashed');
    
    files.sort(function(a, b) {
      return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
    });
    
    for (let {fid, name, trashed} of files) {
      let iconColor = helper.getFileIconColor(name);
        
      el = o.element('div',{ innerHTML: o.template('tmp-list-file-trash', {
        fid,
        name,
        iconColor,
      }) });
      
      $('#list-trash').appendChild(el);
    }
  }

  SELF.deleteFolder = async function(fid) {
    let data = await SELF.get({fid, type: 'folders'});
    data.trashed = true;
    await SELF.update(data, 'folders');
    
    commit({
      fid: data.fid,
      action: 'update',
      metadata: ['trashed'],
      type: 'folders'
    });
    window.app.getComponent('fileTree').then(fileTree => {
      fileTree.removeFolder(data);
    });
  }

  SELF.deleteFile = async function(fid) {
    let data = await SELF.get({fid, type: 'files'});
    data.trashed = true;
    await SELF.update(data, 'files');;
  
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

    window.app.getComponent('fileTree').then(fileTree => {
      fileTree.removeFile(data);
    });
  };
  
  SELF.clearStorage = async function() {
    if (STORAGE_TYPE == 'idb') {
      await window.idbStorage.clear('folders');  
      await window.idbStorage.clear('files');  
    }
    window.localStorage.removeItem('codetmp-storage-type');
    fileStorage.reset();
  };

  function commit(data) {
    SELF.sync(data);
    drive.syncToDrive();
    fileStorage.save();
    SELF.list();
  }

  return SELF;

}