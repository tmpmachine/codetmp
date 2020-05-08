let activeSha;
let branch = '';
let repoName = '';
let token = '';
let username = '';
let email = '';
let sha1;
let sha2;
let sha3;
let gitTree = [];
  
const downloadFile = function(url) {
  return new Promise((resolve, reject) => {
    fetch(url).then(function(r) {
      return r.text();
    }).then(function(r) {
      resolve(r);
    });
  });
};
  
const registerFile = function(file, parentId) {
  L('downloading '+file.path);
  downloadFile(file.download_url).then(result => {
    new File({
      parentId,
      content: result,
      name: file.name,
    });
  });
};
  
const registerDir = function(repo, file, parentId) {
  let _file = new Folder({
    parentId,
    name: file.name,
  });
  clonePath(repo, file.path, _file.fid);
};
  
const readingData = function(repo, files, parentId) {
  for (let file of files) {
    if (file.type == 'file')
      registerFile(file, parentId);
    else if (file.type == 'dir')
      registerDir(repo, file, parentId);
  }
};
  
const clonePath = function(repo, path = '', parentId = activeFolder) {
  
  fetch('https://api.github.com/repos/'+repo.username+'/'+repo.name+'/contents/'+path).then(function(r){
    return r.json(); })
  .then(function(r){
    readingData(repo, r, parentId);
  });
};


const clone = function(url) {
  let segments = url.replace('https://github.com/','').split('/');
  let repo = {
    name: segments[1].replace('.git',''),
    username: segments[0],
  };
  
  clonePath(repo);
};
  
  
function listFile() {
  fetch('https://api.github.com/repos/'+username+'/'+repoName+'/contents/').then(function(r){
    return r.json(); })
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
  fetch('https://api.github.com/repos/'+username+'/'+repoName+'/branches').then(function(r){
    return r.json(); })
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
  }).then(r => {
    return r.json();
  }).then(r => {
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
  }).then(r => {
    return r.json();
  }).then(r => {
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
  }).then(r => {
    return r.json()
  }).then(r => {
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
  }).then(r => {
    return r.json()
  }).then(r => {
    L(r);
  })
}