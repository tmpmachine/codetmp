const git = (function() {

  let activeSha;
  let branch = '';
  let repoName = '';
  let token = settings.data.gitToken;
  let username = '';
  let email = '';
  let sha1;
  let sha2;
  let sha3;
  let gitTree = [];
  let listChanges;
  let rateLimit = 'checking ...';

  function requestRateLImit() {
	  fetch('https://api.github.com/rate_limit', getHeader())
	  .then(asJSON)
	  .then(json => {
	  	rateLimit = json.rate.remaining;
	  });
  }

  function asText(response) {
    return response.text();
  }

  function asJSON(response) {
  	let headers = response.headers;
  	let rateLimitRemaining = headers.get('x-ratelimit-remaining');
  	if (rateLimitRemaining) {
  		rateLimit = parseInt(rateLimitRemaining)
  	}
    return response.json();
  }

  const downloadFile = function(url) {
    return new Promise((resolve, reject) => {
      fetch(url).then(asText).then(function(r) {
        resolve(r);
      });
    });
  };
    
  const downloadFileData = function(url) {
    return new Promise(resolve => {
      fetch(url).then(r => r.blob()).then(resolve);
    })
  };

  const registerFile = function(_file, parentId) {
    let file = new File({
      parentId,
      loaded: false,
      name: _file.name,
      content: helper.generateRemoteDataContent('git', _file.download_url),
    });
    let mimeType = helper.getMimeType(file.name);
    if (helper.isMediaTypeMultimedia(mimeType)) {
      file.contentLink = _file.download_url;
    }

    fileManager.sync({
      fid: file.fid, 
      action: 'create', 
      type: 'files',
    });
  };
    
  const registerDir = function(repo, _file, parentId) {
    let file = new Folder({
      parentId,
      name: _file.name,
    });
    fileManager.sync({
      fid: file.fid, 
      action: 'create', 
      type: 'folders',
    });
    clonePath(repo, _file.path, file.fid);
  };
    
  const readingData = function(repo, files, parentId) {
    for (let file of files) {
      if (file.type == 'file')
        registerFile(file, parentId);
      else if (file.type == 'dir')
        registerDir(repo, file, parentId);
    }

    window.clearTimeout(listChanges);
    listChanges = window.setTimeout(function() {
      fileManager.list();
      fileStorage.save();
      drive.syncToDrive();
    }, 300);
  };

  function setToken(_token) {
  	token = _token;
    settings.data.gitToken = '';
    if (settings.data.saveGitToken) {
      settings.data.gitToken = token;
    }
    settings.save();
  	requestRateLImit();
  }
  
  function getHeader() {
  	if (token == '') {
  		return {}
  	} else {
	  	return {
	      method:'GET',
	      headers:{
	        'Authorization':'token '+token
	      },
	    }
  	}
  }

  const clonePath = function(repo, path = '', parentId) {
    fetch('https://api.github.com/repos/'+repo.username+'/'+repo.name+'/contents/'+path, getHeader())
    .then(asJSON)
    .then(function(r){
      readingData(repo, r, parentId);
    })
    .catch(showConnectionErrorMsg);
  };

  function showConnectionErrorMsg(error) {
    ui.alert({
      text: 'Request failed. Check your internet connection.', 
      timeout: 5000,
    });
    L(error);
  }

  const initClonePath = function(repo, parentId) {
    fetch('https://api.github.com/repos/'+repo.username+'/'+repo.name+'/contents/', getHeader())
    .then(asJSON)
    .then(function(r) {
      if (r.message == 'Not Found') {
        ui.alert({
          text: 'Repository not found. Check repository web URL.', 
          timeout: 5000,
        });
      } else {
        let folder = new Folder({
          parentId: activeFolder,
          name: repo.name,
        });
        fileManager.sync({
          fid: folder.fid, 
          action: 'create', 
          type: 'folders',
        });
        readingData(repo, r, folder.fid);
      }
    })
    .catch(showConnectionErrorMsg);
  };

  const clone = function(url) {
    let segments = url.replace('https://github.com/','').split('/');
    let repo = {
      username: segments[0],
      name: segments[1].replace('.git',''),
    };
    initClonePath(repo, activeFolder);
  };
    
    
  function listFile() {
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/contents/')
    .then(asJSON)
    .then(function(r){
      $('#file-list').innerHTML = o.creps('tmp-list',r);
    });
  }
    
  function loadFile(self) {
    let r = new FileReader();
    r.onload = function() {
      $('#in-upload').value = this.result;
    };
    $('#in-name').value = self.files[0].name;
    r.readAsText(self.files[0]);
  }
    
  function createFile(mode) {
    let fileContent = 'testing 2';
    let message = window.prompt('message');
    if (!message) return;
    
    body = {
      "message": message,
      'committer':{
        'name':username,
        'email':email
      },
      'content': btoa(fileContent),
      'branch': branch,
    };
    
    if (mode == 'update') {
      body.sha = activeSha;
      aww.pop('Updating file...');
    } else {
      aww.pop('Uploading new file...');
    }
    
    let filename = 'index.html';
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/contents/'+filename, {
      method:'PUT',
      headers:{
        'Authorization':'token '+token
      },
      body:JSON.stringify(body)
    }).then(r => {
      return r.json();
    }).then(r => {
      L(r);
      aww.pop('Done');
    });
  }
    
  function createBranch() {
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/git/refs/heads').then(function(r){
      return r.json(); })
    .then(function(r) {
      let sha = r[0].object.sha;
      fetch('https://api.github.com/repos/'+username+'/'+repoName+'/git/refs',{
        method:'POST',
        headers:{
          'Authorization':'token '+token
        },
        body:JSON.stringify({
          ref: 'refs/heads/'+branch,
          sha: sha
        })
      }).then((r)=>{
        return r.json();
      }).then((r)=>{
        L(r);
        aww.pop('Done');
      });
    });
  }
    
  function listBranch() {
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/branches')
    .then(asJSON)
    .then(function(r){
      L(r);
    });
  }

  // get branch info
  const step1 = function() {
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/branches/'+branch, {
      method:'GET',
      headers:{
        'Authorization':'token '+token
      }
    })
    .then(asJSON)
    .then(r => {
      L(r);
      sha1 = r.commit.sha;
      step2();
    });
  };

  function appendGitTree(path, content) {
    gitTree.push({
      mode: "100644",
      path,
      content: content,
      type: "blob"
    });
  };

  // create a tree
  const step2 = function() {
    let tree_sha = sha1;
    let input = {
      base_tree: tree_sha,
      tree: gitTree,
    };
    
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/git/trees', {
      method:'POST',
      headers:{
        'Authorization':'token '+token
      },
      body:JSON.stringify(input)
    })
    .then(asJSON)
    .then(r => {
      L(r);
      sha2 = r.sha;
      step3();
    });
  };

  // commits the tree
  const step3 = function() {
    input = {
      message: window.prompt('message'),
      tree: sha2,
      committer: {
        'name':username,
        'email':email
      },
      parents: [sha1]
    }

    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/git/commits', {
      method:'POST',
      headers:{
        'Authorization':'token '+token
      },
      body:JSON.stringify(input)
    }).then(asJSON).then(r => {
      L(r);
      sha3 = r.sha
      step4()
    })
  }

  const step4 = function() {
    input = {
      sha: sha3
    }
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/git/refs/heads/'+branch, {
      method:'PATCH',
      headers:{
        'Authorization':'token '+token
      },
      body:JSON.stringify(input)
    }).then(asJSON).then(r => {
      L(r);
    })
  }

  requestRateLImit();

  let self = {
    clone,
    downloadFile,
    downloadFileData,
    setToken,
  };

  Object.defineProperty(self, 'rateLimit', {
  	get: () => rateLimit,
  });

  return self;

})();