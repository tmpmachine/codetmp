const drive = (function() {

  let apiUrl = 'https://www.googleapis.com/drive/v3/';
  let apiUrlUpload = 'https://www.googleapis.com/upload/drive/v3/';
  let appFolderName = 'Codetmp';
  let httpHeaders = {
    Authorization: '',
  };

  function setToken(access_token) {
    httpHeaders.Authorization = 'Bearer '+access_token;
  }

  function getAvailParents() {
    let folds = [mainStorage.data.rootId];
    mainStorage.data.folders.map((folder) => {
      if (folder.id.length > 0 && !folder.isSync)
        folds.push(folder.id);
    });
    return folds;
  }

  function getRegisteredParents() {
    let folds = [mainStorage.data.rootId];
    mainStorage.data.folders.map((folder) => {
      if (folder.id !== '')
        folds.push(folder.id);
    });
    return folds;
  }

  let downloadQueue = {};
  let waitList = []
  let queueLimit = 10;
  let queueInLine = 0;
  
  function nextDownloadQueue() {
  	if (waitList.length > 0) {
	    if (queueInLine < queueLimit) {
	      queueInLine++;
	      let resolver = waitList.shift();
	      resolver();
	    }
  	}
  }
  
  function waitInQueue() {
    return new Promise(resolve => {
      waitList.push(resolve);
      nextDownloadQueue();
    })
  }
  
  async function downloadDependencies(file, returnType = 'text') {
    return new Promise(async (resolve, reject) => {
     await auth2.init();
     if (downloadQueue[file.id]) {
      downloadQueue[file.id].resolver.push(resolve);
      downloadQueue[file.id].rejector.push(reject);
     } else {
      	downloadQueue[file.id] = { resolver: [resolve], rejector: [reject] };
	      waitInQueue().then(() => {
	      	fetch(apiUrl+'files/'+file.id+'?alt=media', {
		        method:'GET',
		        headers: httpHeaders,
		      }).then(function(r) {
		        if (r.ok)
		          return r[returnType]();
		        else
		          throw r.status;
		      }).then(data => {
		        for (let r of downloadQueue[file.id].resolver)
		          r(data);
		        delete downloadQueue[file.id];
		        queueInLine--;
		        nextDownloadQueue();
		      }).catch(err => {
		        for (let r of downloadQueue[file.id].rejector)
		          r(err.message);
		        delete downloadQueue[file.id];
		     	queueInLine--;
		        nextDownloadQueue();
		      });
	      });
     }
    });
  }

  function registerFolder(folders, newBranch = []) {
    
    if (folders.length === 0) return newBranch;
    
    let {id, name, modifiedTime, trashed, parents, isLoaded} = folders[0];
    let f = fileManager.get({id, type: 'folders'}, 0);

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
          let folder = fileManager.newFolder({
            id,
            name,
            modifiedTime,
            trashed,
            isLoaded,
            parentId: parentFolderId,
          }, 0);
          newBranch.push(id);
          ui.tree.appendFile(folder);
        }
      }
      if (activeWorkspace === 0) {
        if (parentFolderId == activeFolder) {
          syncFromDrive.refresh = true;
        	syncFromDrivePartial.refresh = true;
        }
      }
    }

    folders.splice(0, 1);
    return registerFolder(folders, newBranch);
  }

  function registerFile(files) {
    
    if (files.length === 0) return;
    
    let {id, name, modifiedTime, trashed, parents} = files[0];
    let f = fileManager.get({id, type: 'files'}, 0);
    let mimeType = helper.getMimeType(name);

    if (parents) {
      
      let parentFolderId = getParentId(parents[0]);
      if (f) {
        f.name = name;
        f.trashed = trashed;
        f.parentId = parentFolderId;
  
        if (new Date(f.modifiedTime).getTime()-new Date(modifiedTime).getTime() < -100) {
          
          f.modifiedTime = modifiedTime;
          delete f.blob;
          
          if (f.loaded) {
	          downloadDependencies(f).then(content => {
	          	f.content = content;
	          	mainStorage.save();
	          	ui.reloadOpenTab(f.fid);
	          });
          }
        }
      } else {
        if (parentFolderId > -2) {
          let data = {
            id,
            name,
            modifiedTime,
            trashed,
            loaded: false,
            parentId: parentFolderId,
          };
          let file  = fileManager.newFile(data, 0);
          ui.tree.appendFile(file);
        }
      }
      if (activeWorkspace === 0) {
        if (parentFolderId == activeFolder) {
          syncFromDrive.refresh = true;
          syncFromDrivePartial.refresh = true;
        }
      }
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
    let notifId = notif.add({
      title: 'Checking for file changes ...',
    });
    fetch(apiUrl+'changes?pageToken='+pageToken+'&fields=nextPageToken,newStartPageToken,changes(file(name,id,trashed,parents,mimeType,modifiedTime))', {
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
      mainStorage.save();

      if (json.nextPageToken) {
        listChanges(json.nextPageToken);
      } else {
        notif.update(notifId, {content:'Your files is up to date'}, true);
      }
      
      if (syncFromDrive.refresh) {
        syncFromDrive.refresh = false;
        if (activeWorkspace === 0)
          fileManager.list();
      }
      
      settings.data.drive.startPageToken = json.newStartPageToken;
      settings.save();
    });
  }

  async function syncFromDrive(parents = getAvailParents(), dirLevel = 1, nextPageToken, pendingBranch = []) {
    if (settings.data.drive.startPageToken.length === 0) {
      
      if (!mainStorage.data.rootId) 
      	return;
      if (parents.length === 0) {
        mainStorage.save();
        getStartPageToken();
        return;
      }
      
      let qParents = [];
      for (let p of parents) {
      	qParents.push(`"${p}"`);
      };
      let queryParents = '('+qParents.join(' in parents or ')+' in parents)';
      let url = apiUrl+'files?q=('+escape(queryParents)+')&fields=nextPageToken,files(name, id, trashed, parents, mimeType, modifiedTime)';
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
          if (file.mimeType.endsWith('.folder')) {
            file.isLoaded = dirLevel < 2 ? true : false;
            allFolders.push(file);
          } else {
            allFiles.push(file);
          }
        });
        
        let newBranch = [...registerFolder(allFolders), ...pendingBranch];
        registerFile(allFiles);
  
        if (typeof(json.nextPageToken) !== 'undefined') {
          syncFromDrive(parents, dirLevel, json.nextPageToken, newBranch);
        } else {
          for (let parentId of parents) {
            let folder = fileManager.get({id: parentId, type: 'folders'}, 0);
            if (folder)
              folder.isSync = true;
          }
          mainStorage.save();
          if (dirLevel < 2)
	        syncFromDrive(newBranch, dirLevel+1);
	      else
	        getStartPageToken();
        }
        
        if (syncFromDrive.refresh) {
          syncFromDrive.refresh = false;
          if (activeWorkspace === 0)
            fileManager.list();
        }
      });
    } else {
      listChanges();
    }
  }

  let dirSyncQueue = [];
  function syncFromDrivePartial(parents, dirLevel = 1, nextPageToken = '', pendingBranch = []) {

  	return new Promise(async resolve => {

      if (!mainStorage.data.rootId) {
        resolve();
      	return;
      }

      if (parents.length === 0) {
        mainStorage.save();
        resolve();
        return;
      }
   		   
   		if (nextPageToken.length > 0) {
	      for (var i = 0; i < parents.length; i++) {
	      	if (dirSyncQueue.indexOf(parents[i]) > 0) {
	      		parents.splice(i, 1);
	      		i--;
	      	} else {
	      		dirSyncQueue.push(parents[i])
	      	}
	      }
   		}

      if (parents.length === 0) {
        mainStorage.save();
        resolve();
      }

      let a = [];
      for (let p of parents) {
      	a.push(`"${p}"`);
      };
      let queryParents = '('+a.join(' in parents or ')+' in parents)';
      let url = apiUrl+'files?q=('+escape(queryParents)+')&fields=nextPageToken,files(name, id, trashed, parents, mimeType, modifiedTime)';
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
          if (file.mimeType.endsWith('.folder')) {
            file.isLoaded = dirLevel < 2 ? true : false;
            allFolders.push(file);
          } else {
            allFiles.push(file);
          }
        });
        
        let newBranch = [...registerFolder(allFolders), ...pendingBranch];
        registerFile(allFiles);
  
        if (syncFromDrivePartial.refresh) {
          syncFromDrivePartial.refresh = false;
          if (activeWorkspace === 0)
            fileManager.list();
        }

        if (typeof(json.nextPageToken) !== 'undefined') {
          syncFromDrivePartial(parents, dirLevel, json.nextPageToken, newBranch)
          .then(resolve);
        } else {
          for (let parentId of parents) {
          	let index = dirSyncQueue.indexOf(parentId);
          	dirSyncQueue.splice(index, 1);
            let folder = fileManager.get({id: parentId, type: 'folders'}, 0);
            if (folder) {
              folder.isSync = true;
              folder.isLoaded = true;
            }
          }
          mainStorage.save();
          if (dirLevel < 2) {
	          syncFromDrivePartial(newBranch, dirLevel+1)
	          .then(resolve);
          } else {
          	resolve();
          }
        }
      });

     });
  }

  async function syncFile({ action, fid, metadata, type, source, isTemp }) {
    
    let method;
    let fetchUrl;
    let metaHeader = {};
    let form = new FormData();
    let fileBlob;
    
    if (action === 'create' || action === 'copy') {
      ({ id, name, trashed, modifiedTime, parentId, content, fileRef } = fileManager.get({fid, type}, 0));
      method = 'POST';
      metaHeader = {
        modifiedTime,
        parents: [getParents(parentId).id],
        mimeType: (type === 'folders') ? 'application/vnd.google-apps.folder' : helper.getMimeType(name),
      };
      
      if (action === 'create') {
        metaHeader.name = name;
        fetchUrl = apiUrlUpload+'files?uploadType=multipart&fields=id';
      } else {
        fetchUrl = apiUrl+'files/'+id+'/copy?alt=json&fields=id';
      }
      
    } else if (action === 'update') {
      
      ({ id, name, trashed, modifiedTime, parentId, content, fileRef } = fileManager.get({fid, type}, 0));

      fetchUrl = apiUrlUpload+'files/'+id+'?uploadType=multipart&fields=id';
      method = 'PATCH';
      
      metaHeader = {
        modifiedTime
      };
      
      for (let meta of metadata) {
        if (meta === 'name')
          metaHeader.name = name;
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
        if (isTemp && helper.hasFileReference(fileRef) && content === null) {
          fileBlob = fileRef
          form.append('file', fileBlob);
        } else {
        // if (fileRef.name === undefined) {
      		if (helper.isHasSource(content)) {
	        	let source = helper.getRemoteDataContent(content);
	        	let fileData = await git.downloadFileData(source.downloadUrl);
          		form.append('file', fileData);
              fileBlob = fileData; 
	      	} else {
            fileBlob = new Blob([content], { type: helper.getMimeType(name) });
          		form.append('file', fileBlob);
	      	}
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

        if (typeof(fileBlob) != 'undefined' && fileBlob.size > 5000000) {

          let notifId = notif.add({
            title: `(Syncing) ${name}`,
            content: '0%',
          })

          let total = fileBlob.size;
          let chunks = [];
          let bytes = 0;
          let limit = 256 * 1024 * 8; // kb to bytes * multiplier
          let lastChunkSize = total % limit;
          while (bytes < fileBlob.size) {
            let chunk = fileBlob.slice(bytes, bytes+limit);
            let end = bytes + Math.min(chunk.size, limit);
            chunks.push({
              end: end-1,
              start: bytes,
              blob: chunk,
            })
            bytes += limit;
          }
          let headers = {
            'Authorization': options.headers.Authorization,
          };
          
          fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id', {
            method: method == 'PATH' ? 'PUT' : 'POST',
            headers: {
              Authorization: options.headers.Authorization,
              'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify(metaHeader)
          }).then((response) => {
            if (response.ok) {
              resumeUpload(response.headers.get('location'), chunks, total, resolve, reject, action, type, headers, notifId)
            }
          })

        } else {

          let notifId = notif.add({
            title: `(Syncing) ${name}`,
            content: 'in progress',
          })
          let request = new XMLHttpRequest();
          request.open(options.method, fetchUrl); 

          request.addEventListener('load', function(e) {
            if (request.status === 200) {
              notif.update(notifId, {content: 'finished'}, true);
              let json = JSON.parse(e.target.responseText);
              resolve({...json, ...{action, type}});
            } else if (request.status === 404) {
              notif.update(notifId, {content: `Failed. File not found on Google Drive. Relog your account.`}, true);
              reject(e);
            } else {
              notif.update(notifId, {content: `Failed. Error ${request.status}`}, true);
              reject(e);
            }
          });

          for (let key in options.headers) {
            request.setRequestHeader(key, options.headers[key]);
          }
          request.send(form);
        }

    });
  }

   async function resumeUpload(loc, chunks, total, resolve, reject, action, type, headers, notifId) {
    let chunk = chunks.shift();
    let size = chunk.blob.size;
    headers['Content-Length'] = size;
    headers['Content-Range'] = `bytes ${chunk.start}-${chunk.end}/${total}`;

    await auth2.init();

      fetch(loc, {
        headers,
        method: 'PUT',
        body: chunk.blob
      }).then(response => {
        if (response.status == 308) {
          notif.update(notifId, {content: `${Math.floor((chunk.start+size)/total*100)}%`}, true);
          if (chunks.length > 0)
            resumeUpload(loc, chunks, total, resolve, reject, action, type, headers, notifId)
          else
            reject('Missing upload part.')
        } else if (response.status === 200) {
          notif.update(notifId, {content: `${Math.floor((chunk.start+size)/total*100)}% (complete)`}, true);
          response.json().then(json => {
            resolve({...json, ...{action, type}});
          });
        } else {
          return reject(response.status);
        }
      }).catch(status => {
        notif.update(notifId, {content: `Failed. Error ${status}`}, true);
        reject(status);
      })
  }

  function syncToDrive() {
    
    $('#txt-sync').textContent = '';
    if (!mainStorage.data.rootId || !settings.data.autoSync) return;
    
    let sync = mainStorage.data.sync[0];
    if (sync === undefined || syncToDrive.enabled) return;
    
    syncToDrive.enabled = true;
    $('#txt-sync').textContent = 'Sync ('+mainStorage.data.sync.length+')';
    
      syncFile(sync).then((json) => {
        if (json.action === 'create' || json.action === 'copy') {
          let file = fileManager.get({fid: mainStorage.data.sync[0].fid, type: json.type}, 0);
          file.id = json.id;
          // if (sync.isTemp)
          	// file.isTemp = false;
        }
        mainStorage.data.sync.splice(0, 1);
        syncToDrive.enabled = false;
        syncToDrive();
        mainStorage.save();
  
      }).catch((error) => {
        syncToDrive.enabled = false;  
      });
  }

  function checkPermission(id) {
    fetch(apiUrl+'files/'+id+'/permissions?fields=permissions(type,role)', {
      method:'GET',
      headers: httpHeaders,
    })
    .then(r => r.json())
    .then(json => {
      let isShared = false;
      for (let p of json.permissions) {
        if (p.type == 'anyone' && p.role == 'viewer') {
          isShared = true;
          break;
        }
      }        
      if (!isShared)
        setAppFolderPermission(id);
    })
  }

  function setAppFolderPermission(id) {
    let headers = Object.assign({}, httpHeaders);
    headers['Content-Type'] = 'application/json';

    fetch(apiUrl+'files/'+id+'/permissions', {
      headers,
      method: 'POST',
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  }

  function initAppData(systemFolderId) {
    mainStorage.data.rootId = systemFolderId;
    mainStorage.save();
    checkPermission(systemFolderId)
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
      return { id: mainStorage.data.rootId} ;
      
    return fileManager.get({fid: parentId, type: 'folders'}, 0);
  }

  function getParentId(id) {
    if (id === mainStorage.data.rootId)
      return -1;
      
    let data = fileManager.get({id, type:'folders'}, 0);
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
    syncFromDrivePartial,
    getWebContentLink,
    downloadDependencies,
  };
})();