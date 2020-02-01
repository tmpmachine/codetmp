(function() {
  
  let activeSha;
  let branch = 'master';
  let repoName = '';
  let token = '';
  let username = '';
  let email = ''
  
  function viewFile(name) {
    fetch('https://api.github.com/repos/'+username+'/'+repoName+'/contents/'+name).then(function(r){
      return r.json();
    }).then(function(r){
      $('#in-name').value = r.name
      activeSha = r.sha;
      fetch(r.download_url)
      .then( (r) => r.text() )
      .then( (r) => $('#in-upload').value = r )
    })
  }
  
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