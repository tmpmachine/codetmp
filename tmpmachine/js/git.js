(function() {
  
  function Git() {
    this.activeSha;
    this.branch;
    this.repoName;
    this.token;
    this.username;
    this.email;
    
    return this;
  }
  
  Git.prototype.downloadFile = function(url) {
    return new Promise((resolve, reject) => {
      fetch(url).then(function(r) {
        return r.text();
      }).then(function(r){
        resolve(r)
      })
    })
  }
  
  Git.prototype.registerFile = function(file, parentId) {
    L('downloading '+file.path);
    git.downloadFile(file.download_url).then(result => {
      new File({
        parentId,
        content: result,
        name: file.name,
      });
    });
  };
  
  Git.prototype.registerDir = function(repo, file, parentId) {
    let _file = new Folder({
      parentId,
      name: file.name,
    });
    git.clonePath(repo, file.path, _file.fid);
  };
    
  Git.prototype.readingData = function(repo, files, parentId) {
    for (let file of files) {
      if (file.type == 'file')
        git.registerFile(file, parentId)
      else if (file.type == 'dir')
        git.registerDir(repo, file, parentId)
    }
  };
  
  Git.prototype.clone = function(url) {
    
    let segments = url.replace('https://github.com/','').split('/');
    let repo = {
      name: segments[1].replace('.git',''),
      username: segments[0],
    };
    
    git.clonePath(repo);
  };
  
    
  Git.prototype.clonePath = function(repo, path = '', parentId = activeFolder) {
    
    fetch('https://api.github.com/repos/'+repo.username+'/'+repo.name+'/contents/'+path).then(function(r){
      return r.json(); })
    .then(function(r){
      git.readingData(repo, r, parentId);
    });
  };
  
  window.git = new Git();
  
  
  function listFile() {
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/contents/').then(function(r){
      return r.json(); })
    .then(function(r){
      $('#file-list').innerHTML = o.creps('tmp-list',r);
    })
  }
  
  function loadFile(self) {
    let r = new FileReader();
    r.onload = function() {
      $('#in-upload').value = this.result
    }
    $('#in-name').value = self.files[0].name;
    r.readAsText(self.files[0]);
  }
  
  function createFile(mode) {
    
    let fileContent = $('#in-upload').value;
    let message = window.prompt('message')
    if (!message) return
    
    body = {
      "message": message,
      'committer':{
        'name':username,
        'email':email
      },
      'content': btoa(fileContent),
      'branch': branch,
    }
    
    if (mode == 'update') {
      body.sha = activeSha;
      aww.pop('Updating file...');
    } else {
      aww.pop('Uploading new file...');
    }
    
    let filename = $('#in-name').value
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/contents/'+filename, {
      method:'PUT',
      headers:{
        'Authorization':'token '+token
      },
      body:JSON.stringify(body)
    }).then(r => {
      return r.json()
    }).then(r => {
      L(r);
      aww.pop('Done')
      listFile();
    })
  }
  
  function createBranch() {
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/git/refs/heads').then(function(r){
      return r.json(); })
    .then(function(r){
      let sha = r[0].object.sha
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
        return r.json()
      }).then((r)=>{
        aww.pop('Done')
        // listFile();
      })
      // $('#file-list').innerHTML = o.creps('tmp-list',r);
    })
  }
  
  function listBranch() {
    // GET /repos/:owner/:repo/branches
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/branches').then(function(r){
      return r.json(); })
    .then(function(r){
      L(r)
      // $('#file-list').innerHTML = o.creps('tmp-list',r);
    })
  }
  
  // get branch info
  function step1() {
    
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/branches/master', {
      method:'GET',
      headers:{
        'Authorization':'token '+token
      }
    }).then(r => {
      return r.json()
    }).then(r => {
      L(r);
      step1.sha = r.commit.sha
    })
  }
  
  // create a tree
  function step2() {
    let tree_sha = step1.sha;
    let input = {
      base_tree: tree_sha,
      tree: [{
        mode: "100644",
        path: "etc/view.js",
        content: "first commit \n second to go /wo markdown",
        type: "blob"
      }, {
        mode: "100644",
        path: "etc/doramon.id",
        content: "first commit \n second to <b>go</b> /w markdown",
        type: "blob"
      }]
    }
    
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/git/trees', {
      method:'POST',
      headers:{
        'Authorization':'token '+token
      },
      body:JSON.stringify(input)
    }).then(r => {
      return r.json()
    }).then(r => {
      L(r);
      step2.sha = r.sha;
    })
  }
  
  // commits the tree
  function step3() {
    input = {
      message: window.prompt('message'),
      tree: step2.sha,
      committer: {
        'name':username,
        'email':email
      },
      parents: [step1.sha]
    }
  
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/git/commits', {
      method:'POST',
      headers:{
        'Authorization':'token '+token
      },
      body:JSON.stringify(input)
    }).then(r => {
      return r.json()
    }).then(r => {
      L(r);
      step3.sha = r.sha
    })
  }
  
  // update heads/master refs to point to the new tree
  function step4() {
    input = {
      sha: step3.sha
    }
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/git/refs/heads/master', {
      method:'PATCH',
      headers:{
        'Authorization':'token '+token
      },
      body:JSON.stringify(input)
    }).then(r => {
      return r.json()
    }).then(r => {
      L(r);
    })
  }

})();