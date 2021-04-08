const drive = (function() {

  let apiUrl = 'https://www.googleapis.com/drive/v3/';
  let apiUrlUpload = 'https://www.googleapis.com/upload/drive/v3/';
  let appFolderName = 'Codetmp';
  let httpHeaders = {
    Authorization: ''
  };

  function setToken(access_token) {
    httpHeaders.Authorization = 'Bearer '+access_token;
  }

  function getAvailParents() {
    let folds = ['"'+fileStorage.data.rootId+'"'];
    fileStorage.data.folders.map((folder) => {
      if (folder.id.length > 0 && !folder.isSync)
        folds.push('"'+folder.id+'"');
    });
    return folds;
  }

  function getRegisteredParents() {
    let folds = [fileStorage.data.rootId];
    fileStorage.data.folders.map((folder) => {
      if (folder.id !== '')
        folds.push(folder.id);
    });
    return folds;
  }

  async function downloadDependencies(data) {
    if (!data.loaded && data.id !== '') {
      return new Promise((resolve, reject) => {

        auth2.init().then(() => {

          fetch(apiUrl+'files/'+data.id+'?alt=media', {
            method:'GET',
            headers: httpHeaders,
          }).then(function(r) {
            if (r.ok)
              return r.text();
            else
              throw r.status;
          })
          .then(resolve)
          .catch(() => {
            aww.pop('Could not download required file: '+data.name);
            reject();
          });

        }).catch(() => {
          aww.pop('Authentication failed. Could not download required file: '+data.name);
          reject();
        });
      })
    }
  }

  function registerFolder(folders, newBranch = []) {
    
    if (folders.length === 0) return newBranch;
    
    let {id, name, modifiedTime, trashed, parents} = folders[0];
    let f = fileManager.get({id, type: 'folders'});

    if (parents) {
      
      let parentFolderId = getParentId(parents[0]);
      if (f) {
        f.name = name;
        f.trashed = trashed;
        f.parentId = parentFolderId;
    
        if (new Date(f.modifiedTime).getTime()-new Date(modifiedTime).getTime() < -100) {
          f.modifiedTime = modifiedTime;
        }
      } else {
        if (parentFolderId > -2) {
          new Folder({
            id,
            name,
            modifiedTime,
            trashed,
            parentId: parentFolderId,
          });
          newBranch.push('"'+id+'"');
        }
      }
      if (parentFolderId == activeFolder)
        syncFromDrive.refresh = true;
    }

    folders.splice(0, 1);
    return registerFolder(folders, newBranch);
  }

  function registerFile(files) {
    
    if (files.length === 0) return;
    
    let {id, name, description = '', modifiedTime, trashed, parents} = files[0];
    let f = fileManager.get({id, type: 'files'});
    let mimeType = helper.getMimeType(name);

    if (parents) {
      
      let parentFolderId = getParentId(parents[0]);
      if (f) {
        f.name = name;
        f.trashed = trashed;
        f.parentId = parentFolderId;
  
        if (new Date(f.modifiedTime).getTime()-new Date(modifiedTime).getTime() < -100) {
          
          f.modifiedTime = modifiedTime;
          f.content = '';
          f.loaded = false;
          f.description = JSON.parse(description);
          
          downloadDependencies(f);
        }
      } else {
        if (parentFolderId > -2) {
          let data = {
            id,
            name,
            modifiedTime,
            trashed,
            loaded: false,
            description,
            parentId: parentFolderId,
          };
          new File(data);
        }
      }
      if (parentFolderId == activeFolder)
        syncFromDrive.refresh = true;
    }

    files.splice(0, 1);
    return registerFile(files);
  }

  async function getStartPageToken() {
    await auth2.init();
    fetch(apiUrl+'changes/startPageToken', {
      method: 'GET',
      headers: httpHeaders,
    }).then(response => {
      return response.json();
    }).then(({startPageToken}) => {
      settings.data.drive.startPageToken = startPageToken;
      settings.save();
    });
  }

  async function listChanges(pageToken = settings.data.drive.startPageToken) {
    await auth2.init();
    fetch(apiUrl+'changes?pageToken='+pageToken+'&fields=nextPageToken,newStartPageToken,changes(file(name,description,id,trashed,parents,mimeType,modifiedTime))', {
      method: 'GET',
      headers: httpHeaders,
    }).then(response => {
      return response.json();
    }).then(json => {
      
      let allFolders = [];
      let allFiles = [];
      
      json.changes.forEach(({file}) => {
        if (file.mimeType.endsWith('.folder')) {
          allFolders.push(file);
        } else {
          allFiles.push(file);
        }
      });
      
      registerFolder(allFolders);
      registerFile(allFiles);
      fileStorage.save();

      if (json.nextPageToken)
        listChanges(json.nextPageToken);
      
      if (syncFromDrive.refresh) {
        syncFromDrive.refresh = false;
        fileManager.list();
      }
      
      settings.data.drive.startPageToken = json.newStartPageToken;
      settings.save();
    });
  }

  async function syncFromDrive(parents = getAvailParents(), nextPageToken, pendingBranch = []) {
    
    if (settings.data.drive.startPageToken.length === 0) {
      
      if (!fileStorage.data.rootId) return;
      if (parents.length === 0) {
        fileStorage.save();
        getStartPageToken();
        return;
      }
      
      let queryParents = '('+parents.join(' in parents or ')+' in parents)';
      let url = apiUrl+'files?q=('+escape(queryParents)+')&fields=nextPageToken,files(name, description, id, trashed, parents, mimeType, modifiedTime)';
      if (typeof(nextPageToken) !== 'undefined')
        url = url+'&pageToken='+nextPageToken;
      
      await auth2.init();
      fetch(url, {
        method:'GET',
        headers: httpHeaders,
      }).then(function(result) {
        return result.json();
      }).then(function(json) {
        let folds = [];
        let allFolders = [];
        let allFiles = [];
        
        json.files.forEach((file) => {
          if (file.mimeType.endsWith('.folder'))
            allFolders.push(file);
          else
            allFiles.push(file);
        });
        
        let newBranch = [...registerFolder(allFolders), ...pendingBranch];
        registerFile(allFiles);
  
        if (typeof(json.nextPageToken) !== 'undefined')
          syncFromDrive(parents, json.nextPageToken, newBranch);
        else {
          
          for (let parentId of parents) {
            let folder = fileManager.get({id: parentId.substring(1, parentId.length-1), type: 'folders'});
            if (folder)
              folder.isSync = true;
          }
          fileStorage.save();
          
          syncFromDrive(newBranch);
        }
        
        if (syncFromDrive.refresh) {
          syncFromDrive.refresh = false;
          fileManager.list();
        }
      });
    } else {
      listChanges();
    }
  }

  async function syncFile({ action, fid, metadata, type, source }) {
    
    let method;
    let fetchUrl;
    let metaHeader = {};
    let form = new FormData();
    
    if (action === 'create' || action === 'copy') {
      ({ id, name, description, trashed, modifiedTime, parentId, content, fileRef } = fileManager.get({fid, type}));
      method = 'POST';
      metaHeader = {
        modifiedTime,
        parents: [getParents(parentId).id],
        mimeType: (type === 'folders') ? 'application/vnd.google-apps.folder' : helper.getMimeType(name),
      };
      
      if (action === 'create') {
        metaHeader.name = name;
        metaHeader.description = helper.parseDescription(description);
        fetchUrl = apiUrlUpload+'files?uploadType=multipart&fields=id';
      } else {
        fetchUrl = apiUrl+'files/'+id+'/copy?alt=json&fields=id';
      }
      
    } else if (action === 'update') {
      
      ({ id, name, description, trashed, modifiedTime, parentId, content, fileRef } = fileManager.get({fid, type}));

      fetchUrl = apiUrlUpload+'files/'+id+'?uploadType=multipart&fields=id';
      method = 'PATCH';
      
      metaHeader = {
        modifiedTime
      };
      
      for (let meta of metadata) {
        if (meta === 'name')
          metaHeader.name = name;
        else if (meta === 'description')
          metaHeader.description = JSON.stringify(description);
        else if (meta === 'trashed')
          metaHeader.trashed = trashed;
        else if (meta === 'parents') {
          source = getParents(source).id;
          let destination = getParents(parentId).id;
        
          fetchUrl = apiUrlUpload+'files/'+id+'?uploadType=multipart&fields=id&addParents='+destination+'&removeParents='+source;
        }
      }
    }

    if (action === 'copy') {
      form = JSON.stringify(metaHeader);
    } else {
      form.append('metadata', new Blob([JSON.stringify(metaHeader)], { type: 'application/json' }));
      if ((action === 'create' || metadata.includes('media')) && type === 'files') {
        if (fileRef.name === undefined) {
    		if (helper.isHasSource(content)) {
	        	let source = helper.getRemoteDataContent(content);
	        	let fileData = await git.downloadFileData(source.downloadUrl);
          		form.append('file', fileData);
	      	} else {
          		form.append('file', new Blob([content], { type: helper.getMimeType(name) }));
	      	}
        } else {
          form.append('file', fileRef);
        }
      }
    }

    await auth2.init();
    let options = {
      method,
      body: form,
      headers: Object.assign({}, httpHeaders),
    };
    
    if (action === 'copy')
      options.headers['Content-Type'] = 'application/json';

    return new Promise((resolve, reject) => {
      fetch(fetchUrl, options).then((result) => {
        if (result.ok)
          return result.json();
        else
          return reject(result.status);
      }).then((json) => {
        resolve({...json, ...{action, type}});
      }).catch(reject);
    });
  }

  function syncToDrive(sync = fileStorage.data.sync[0]) {
    
    $('#txt-sync').textContent = '';
    if (!fileStorage.data.rootId || !settings.data.autoSync) return;
    if (sync === undefined || syncToDrive.enabled) return;
    
    syncToDrive.enabled = true;
    $('#txt-sync').textContent = 'Sync ('+fileStorage.data.sync.length+')';
    
      syncFile(sync).then((json) => {
        if (json.action === 'create' || json.action === 'copy') {
          let file = fileManager.get({fid: fileStorage.data.sync[0].fid, type: json.type});
          file.id = json.id;
          if (sync.isTemp)
          	file.isTemp = false;
        }
        fileStorage.data.sync.splice(0, 1);
        syncToDrive.enabled = false;
        syncToDrive();
        fileStorage.save();
  
      }).catch((error) => {
        syncToDrive.enabled = false;  
      });
  }

  function initAppData(systemFolderId) {
    fileStorage.data.rootId = systemFolderId;
    fileStorage.save();
    syncFromDrive();
  }

  async function readAppData() {
    
    await auth2.init();
    fetch(apiUrl+'files?spaces=appDataFolder&fields=files(id)', {
      headers: httpHeaders,
    })
    .then(r => r.json())
    .then(json => {
      if (json.files.length > 0) {
        getFile(json.files[0].id, 'text', '?alt=media').then(function(media) {
          getFile(JSON.parse(media).id, 'json', '?fields=id,trashed').then(function({ id, trashed }) {
            if (trashed) {
              deleteFile(json.files[0].id).then(function() {
                readAppData();
              });
            } else {
              initAppData(id);
            }
          }).catch(function(errorCode) {
            if (errorCode === 404) {
              deleteFile(json.files[0].id).then(function() {
                readAppData();
              });
            }
          });
        });
      } else {
        createSystemFolder().then(function(systemFolderJSON) {
          createAppData(systemFolderJSON).then(function() {
            initAppData(systemFolderJSON.id);
          });
        });
      }
    });
  }

  function createAppData(systemFolderJSON) {
    
    return new Promise(async function(resolve, reject) {
      
      let form = new FormData();
      let metadata = {
        name: 'config.json',
        parents: ['appDataFolder'],
        mimeType: 'application/json',
      };
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([JSON.stringify(systemFolderJSON)], { type: 'text/plain'} ));
      
      await auth2.init();
      let options = {
        method: 'POST',
        body: form,
        headers: httpHeaders,
      }
      fetch(apiUrlUpload+'files?uploadType=multipart&fields=id', options).then((result) => {
        if (result.ok)
          return result.json();
      }).then(resolve);
    });
  }

  function createSystemFolder() {
    return new Promise(async function(resolve, reject) {
      let form = new FormData();
      let metadata = {
        name: appFolderName,
        parents: ['root'],
        mimeType: 'application/vnd.google-apps.folder',
      };
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      
      await auth2.init();
      let options = {
        method: 'POST',
        body: form,
        headers: httpHeaders,
      }
      fetch(apiUrlUpload+'files?uploadType=multipart&fields=id', options).then((result) => {
        return result.json();
      }).then(resolve);
    });
  }

  function getParents(parentId) {
    if (parseInt(parentId) === -1)
      return { id: fileStorage.data.rootId} ;
      
    return fileManager.get({fid: parentId, type: 'folders'});
  }

  function getParentId(id) {
    if (id === fileStorage.data.rootId)
      return -1;
      
    let data = fileManager.get({id, type:'folders'});;
    if (data)
      return data.fid;
    else
      return -2;
  }

  function getFile(id, type = 'text', param = '') {
    return new Promise(async function(resolve, reject) {
      await auth2.init();
      fetch(apiUrl+'files/'+id+param, {
        headers: httpHeaders,
      }).then(function(result) {
        if (result.status === 404)
          reject(404);
        else
          return (type === 'json') ? result.json() : result.text();
      }).then(function(media) {
        resolve(media);
      })
    });
  }

  function deleteFile(id) {
    return new Promise(async function(resolve, reject) {
      await auth2.init();
      fetch(apiUrl+'files/'+id, {
        method: 'DELETE',
        headers: httpHeaders,
      }).then(function(result) {
        if (result.status === 404)
          reject(404);
        else
          resolve();
      })   
    });
  }

  function getWebContentLink(id) {
  	return new Promise(resolve => {
	  	getFile(id, 'json', '?fields=webContentLink').then(json => {
	  		resolve(json.webContentLink);
	  	});
  	})
  }

  return {
    apiUrl,
    setToken,
    readAppData,
    syncToDrive,
    syncFromDrive,
    getWebContentLink,
    downloadDependencies,
  };
})();