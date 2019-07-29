const debug = {
  getAppData: function() {
    
    fetch(drive.apiUrl+'files?spaces=appDataFolder&fields=files(id)', {
      headers: {
        'Authorization':'Bearer '+auth0.auth.data.token
      }
    }).then(function(r) {
      
      return r.json();
      
    }).then(function(json) {
      
      L(json)
      debug.getMedia(json.files[0].id);
      
    });
  },
  delete: function(id) {
    
    fetch(drive.apiUrl+'files/'+id, {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer '+auth0.auth.data.token
      }
    }).then(function(result) {
      
      L(result);

    })
    
  },
  update: function(id, content) {
    let form = new FormData();
    let metadata = {
    };
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'text/plain' }));
    
    fetch(drive.apiUrlUpload+'files/'+id+'?uploadType=multipart&fields=id', {
      method: 'PATCH',
      body: form,
      headers: {
        'Authorization':'Bearer '+auth0.auth.data.token
      },
    }).then(function(r) {
      
      return r.json();
      
    }).then(function(json) {
      
      L(json);
      debug.getMedia(json.files[0].id);
      
    });
    
  },
  
  list: function(ids) {
    let queryParents = '('+ids.join(' in parents or ')+' in parents)';
    fetch(drive.apiUrl+'files?q=('+escape(queryParents)+')&fields=files(name, id, trashed, parents, mimeType, modifiedTime)', {
      method:'GET',
      headers: {
        'Authorization':'Bearer '+auth0.auth.data.token
      }
    }).then(function(result) {
      return result.json();
    }).then(function(json) {
      json.files.forEach((file) => {
        L(file)
      });
    });
  },
  
  revs: function(id) {
    // let queryParents = '('+ids.join(' in parents or ')+' in parents)';
    // fetch(drive.apiUrl+'files?q=('+escape(queryParents)+')&fields=files(name, id, trashed, parents, mimeType, modifiedTime)', {
    fetch(drive.apiUrl+'files/'+id+'/revisions?fields=revisions(id)&q=(keepForevers = true)', {
      method:'GET',
      headers: {
        'Authorization':'Bearer '+auth0.auth.data.token
      }
    }).then(function(result) {
      return result.json();
    }).then(function(json) {
      console.log(json)
      
      json.revisions.forEach((rev) => {
        L(rev)
      });
      
    });
  },
  
  file: function(id) {
    
    fetch(drive.apiUrl+'files/'+id+'?fields=parents,id,name,trashed,webContentLink,webViewLink,headRevisionId', {
      headers: {
        'Authorization':'Bearer '+auth0.auth.data.token
      }
    }).then(function(r) {
      
      return r.json();
      
    }).then(function(json) {
      
      L(json);
      
    });
  },
  
  rev: function(id) {
    
    fetch(drive.apiUrl+'files/'+id+'/revisions?fields=*', {
      headers: {
        'Authorization':'Bearer '+auth0.auth.data.token
      }
    }).then(function(r) {
      
      return r.json();
      
    }).then(function(json) {
      
      L(json);
      
    });
  },
  
  trash: function(id, restore) {
    
    let form = new FormData();
    let metadata = { trashed: restore ? false : true }
    
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}))
    
    fetch(drive.apiUrlUpload+'files/'+id+'?uploadType=multipart&fields=parents,id,name,trashed', {
      method: 'PATCH',
      body: form,
      headers: {
        
        'Authorization':'Bearer '+auth0.auth.data.token
      }
    }).then(function(r) {
      
      return r.json();
      
    }).then(function(json) {
      
      L(json);
      
    });
    
  },
  
  
  publishRevision: function(headId) {
    
  },
  
  
  
  getMedia: function(id, rev) {
    let url;
    if (rev)
      url = drive.apiUrl+'files/'+id+'/revisions/'+rev+'?alt=media';
    else
      url = drive.apiUrl+'files/'+id+'?alt=media';
      
    fetch(url, {
      headers: {
        'Authorization':'Bearer '+auth0.auth.data.token
      }
    }).then(function(result) {
      return result.text()
    }).then(function(media){
      L(media)
    })
    
  }
  
};