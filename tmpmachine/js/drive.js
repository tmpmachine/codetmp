const drive = {
  apiUrl: 'https://www.googleapis.com/drive/v3/',
  apiUrlUpload: 'https://www.googleapis.com/upload/drive/v3/',
  downloadDependencies: function(data) {

    if (!data.loaded && data.id !== '')
    {
      fetch(drive.apiUrl+'files/'+data.id+'?alt=media', {
        method:'GET',
        headers: {
          'Authorization':'Bearer '+auth0.auth.data.token
        }
      }).then(function(r) {
        if (r.ok)
          return r.text();
        else
          throw r.status;
      }).then((media) => {
        
        aww.pop('Successfully download required file: '+data.name);
        data.content = media;
        data.loaded = true;
        fs.save();
        
      }).catch(() => {
        
        aww.pop('Could not download required file: '+data.name);
        
      });
    }

  },
  registerFolder: function(folders, newBranch = []) {
    
    if (folders.length === 0) return newBranch;
    
    let {id, name, modifiedTime, trashed, parents} = folders[0];
    let f = odin.dataOf(id, fs.data.folders, 'id');

    if (f)
    {
      f.trashed = trashed;
      f.parentFolderId = drive.getParentId(parents[0]);

      if (new Date(f.modifiedTime).getTime()-new Date(modifiedTime).getTime() < -100)
      {
        // L(f.name+' updated');
        if (f.parentFolderId == activeFolder)
          drive.syncFromDrive.refresh = true;
          
        f.name = name;
        f.modifiedTime = modifiedTime;
      }
    }
    else
    {
      let parentFolderId = drive.getParentId(parents[0]);
      
      fm.INSERT.folder({
        id,
        name,
        modifiedTime,
        trashed,
        parentId: parentFolderId,
      });
      newBranch.push('"'+id+'"');
      
      if (parentFolderId == activeFolder)
          drive.syncFromDrive.refresh = true;
    }

    folders.splice(0, 1);
    return drive.registerFolder(folders, newBranch);
  },
  registerFile: function(files) {
    
    if (files.length === 0) return;
    
    let {id, name, description = '', modifiedTime, trashed, parents} = files[0];
    let f = odin.dataOf(id, fs.data.files, 'id');

    if (f)
    {
      f.trashed = trashed;
      f.parentFolderId = drive.getParentId(parents[0]);

      if (new Date(f.modifiedTime).getTime()-new Date(modifiedTime).getTime() < -100)
      {
        if (f.parentFolderId == activeFolder)
          drive.syncFromDrive.refresh = true;
        
        L(f.name+' updated');
        f.name = name;
        f.modifiedTime = modifiedTime;
        f.content = '';
        f.loaded = false;
        f.description = description;
        
        drive.downloadDependencies(f);
      }
    }
    else
    {
      let parentFolderId = drive.getParentId(parents[0]);
      fm.INSERT.file({
        id,
        name,
        modifiedTime,
        trashed,
        description,
        parentId: parentFolderId,
      });
      
      if (parentFolderId == activeFolder)
          drive.syncFromDrive.refresh = true;
    }

    files.splice(0, 1);
    return drive.registerFile(files);
  },
  syncFromDrive: function(parents = getAvailParents(), nextPageToken, pendingBranch = []) {
    
    if (!fs.data.rootId) return;
    if (parents.length === 0)
    {
      fs.save();
      return;
    }
    
    let queryParents = '('+parents.join(' in parents or ')+' in parents)';
    let url = drive.apiUrl+'files?q=('+escape(queryParents)+')&fields=nextPageToken,files(name, description, id, trashed, parents, mimeType, modifiedTime)';
    if (typeof(nextPageToken) !== 'undefined')
      url = url+'&pageToken='+nextPageToken;
    
    fetch(url, {
      method:'GET',
      headers: {
        'Authorization':'Bearer '+auth0.auth.data.token
      }
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
      
      let newBranch = [...drive.registerFolder(allFolders), ...pendingBranch];
      drive.registerFile(allFiles);

      if (typeof(json.nextPageToken) !== 'undefined')
        drive.syncFromDrive(parents, json.nextPageToken, newBranch);
      else
        drive.syncFromDrive(newBranch);
      
      if (drive.syncFromDrive.refresh)
      {
        drive.syncFromDrive.refresh = false;
        fileList();
      }
    });
  },
  syncFile: function({ action, fid, metadata, type, source }) {
    
    let method;
    let fetchUrl;
    let metaHeader = {};
    let form = new FormData();
    
    if (action === 'create' || action === 'copy')
    {
      ({ id, name, description, trashed, modifiedTime, parentId, content } = odin.dataOf(fid, fs.data[type], 'fid'));

      method = 'POST';
      metaHeader = {
        modifiedTime,
        parents: [drive.getParents(parentId).id],
        mimeType: (type === 'folders') ? 'application/vnd.google-apps.folder' : 'text/plain',
      };
      
      if (action === 'create')
      {
        metaHeader.name = name;
        metaHeader.description = description;
        fetchUrl = drive.apiUrlUpload+'files?uploadType=multipart&fields=id';
      }
      else
        fetchUrl = drive.apiUrl+'files/'+id+'/copy?alt=json&fields=id';

      
    }
    else if (action === 'update')
    {
      
      ({ id, name, description, trashed, modifiedTime, parentId, content } = odin.dataOf(fid, fs.data[type], 'fid'));

      fetchUrl = drive.apiUrlUpload+'files/'+id+'?uploadType=multipart&fields=id';
      method = 'PATCH';
      
      metaHeader = {
        modifiedTime
      };
      
      for (let meta of metadata)
      {
        if (meta === 'name')
          metaHeader.name = name;
        else if (meta === 'description')
          metaHeader.description = description;
        else if (meta === 'trashed')
          metaHeader.trashed = trashed;
        else if (meta === 'parents')
        {
          source = drive.getParents(source).id;
          let destination = drive.getParents(parentId).id;
        
          fetchUrl = drive.apiUrlUpload+'files/'+id+'?uploadType=multipart&fields=id&addParents='+destination+'&removeParents='+source;
        }
      }
       
    }
    
    // metadata first!
    if (action === 'copy')
      form = JSON.stringify(metaHeader);
    else
    {
      form.append('metadata', new Blob([JSON.stringify(metaHeader)], { type: 'application/json' }));
      if (action === 'create' || metadata.includes('media') && type === 'files')
        form.append('file', new Blob([content], { type: 'text/plain' }));
    }

    let options = {
      method,
      body: form,
      headers: {
        'Authorization': 'Bearer '+auth0.auth.data.token
      }
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

  },
  syncToDrive: function(sync = fs.data.sync[0]) {
    
    $('#syncing').textContent = '';
    if (!fs.data.rootId) return;
    if (sync === undefined || drive.syncToDrive.enabled) return;
    
    drive.syncToDrive.enabled = true;
    $('#syncing').textContent = 'Sync ('+fs.data.sync.length+')';
    
    drive.syncFile(sync).then((json) => {

      // L(json)
      $('#action-info').innerHTML = '&nbsp;';
      if (json.action === 'create' || json.action === 'copy')
      {
        let data = odin.dataOf(fs.data.sync[0].fid, fs.data[json.type], 'fid');
        data.id = json.id;
      }
      fs.data.sync.splice(0, 1);
      drive.syncToDrive.enabled = false;
      drive.syncToDrive();
      fs.save();

    }).catch((error) => {

      L(error);
      drive.syncToDrive.enabled = false;
      $('#action-info').textContent = 'Refreshing authentication...';
      oblog.authModule.requestToken(() => {
        $('#action-info').textContent = '';
        drive.syncToDrive();
      }, true)

    });
  },
  initAppData: function(systemFolderId) {
    fs.data.rootId = systemFolderId;
    fs.save();
    drive.syncFromDrive();
  },
  readAppData: function() {
    
    L('reading app data...');
    
    fetch(drive.apiUrl+'files?spaces=appDataFolder&fields=files(id)', {
      headers: {
        'Authorization':'Bearer '+auth0.auth.data.token
      }
    }).then(function(r) {
      
      return r.json();
      
    }).then(function(json) {
      
      if (json.files.length > 0)
      {
        L('app data found. reading app data...');
        drive.getFile(json.files[0].id, 'text', '?alt=media').then(function(media) {
          
          L('searching root folder...');
          drive.getFile(JSON.parse(media).id, 'json', '?fields=id,trashed').then(function({ id, trashed }) {
            
            if (trashed)
            {
              L('root folder deleted. deleting app data...');
              drive.deleteFile(json.files[0].id).then(function() {
                L('re-initialize app data...');
                drive.readAppData();
              });
            }
            else
            {
              L('root folder found. initializing data...');
              drive.initAppData(id);
            }
            
          }).catch(function(errorCode) {
            
            if (errorCode === 404)
            {
              L('root folder not found. deleting app data...');
              drive.deleteFile(json.files[0].id).then(function() {
                L('re-initialize app data...');
                drive.readAppData();
              });
            }
            
          });
          
        });
      }
      else
      {
        
        L('app data not found. creating system folder...')
        drive.createSystemFolder().then(function(systemFolderJSON) {
          
          L('system folder created');
          L('creating config file...');
          drive.createAppData(systemFolderJSON).then(function() {

            L('config file created. initializing data...');
            drive.initAppData(systemFolderJSON.id);

          });
          
        });
        
      }
      
    });
  },
  createAppData: function(systemFolderJSON) {
    
    return new Promise(function(resolve, reject) {
      
      let form = new FormData();
      let metadata = {
        name: 'config.json',
        parents: ['appDataFolder'],
        mimeType: 'application/json',
      };
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([JSON.stringify(systemFolderJSON)], { type: 'text/plain'} ));
      
      let options = {
        method: 'POST',
        body: form,
        headers: {
          'Authorization': 'Bearer '+auth0.auth.data.token
        }
      }
      fetch(drive.apiUrlUpload+'files?uploadType=multipart&fields=id', options).then((result) => {
        if (result.ok)
          return result.json();
      }).then(resolve);
    });
  },
  createSystemFolder: function() {
    
    return new Promise(function(resolve, reject) {
      
      let form = new FormData();
      let metadata = {
        name: 'TMPmachine',
        parents: ['root'],
        mimeType: 'application/vnd.google-apps.folder',
      };
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      
      let options = {
        method: 'POST',
        body: form,
        headers: {
          'Authorization': 'Bearer '+auth0.auth.data.token
        }
      }
      fetch(drive.apiUrlUpload+'files?uploadType=multipart&fields=id', options).then((result) => {
        return result.json();
      }).then(resolve);
    });
  },
  getParents: function(parentId) {
    if (parentId === -1)
      return { id: fs.data.rootId} ;
      
    return odin.dataOf(parentId, fs.data.folders, 'fid');
  },
  getParentId: function(id) {
    if (id === fs.data.rootId)
      return -1;
      
    return odin.dataOf(id, fs.data.folders, 'id').fid;
  },
  getFile: function(id, type = 'text', param = '') {
    
    return new Promise(function(resolve, reject) {
      
      fetch(drive.apiUrl+'files/'+id+param, {
        headers: {
          'Authorization': 'Bearer '+auth0.auth.data.token
        }
      }).then(function(result) {
  
        if (result.status === 404)
          reject(404);
        else
          return (type === 'json') ? result.json() : result.text();
  
      }).then(function(media) {
  
        resolve(media);
  
      })
      
    });
    
  },
  deleteFile: function(id) {
    
    return new Promise(function(resolve, reject) {
      
      fetch(drive.apiUrl+'files/'+id, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer '+auth0.auth.data.token
        }
      }).then(function(result) {
  
        if (result.status === 404)
          reject(404);
        else
          resolve();
  
      })
      
    });
    
  },
  
};