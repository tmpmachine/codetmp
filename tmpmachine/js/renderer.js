window.name = 'parent';
let loadedScriptAndLink = [];
let previewMode = false;
let uploadBody = '';

let waitRender = null;
let totalLoader = 0;
let iframeRender = [];
let renderQueue = [];
let renderBody = '';
let renderTemplate = '';
let renderLib;
let libParentId;

let core;
let data = {
  view:{
    isPost:false,
    isPage:false,
    isSingleItem:false,
    isLayoutMode:false,
    isHomepage:false,
    isSearch:false,
    isArchive:false,
    isMultipleItems:false,
    isLabelSearch:false,
    isError:false,
    title:'',
    description:'',
    url:''
  },
  search: {
    label:'',
    query:'',
    resultsMessage:''
  },
  blog:{
    title:'',
    searchQuery:'',
    searchLabel:''
  }
};
let globalRender;
let locked = -1;
let previewWindow = null;
let previewTwice = false;
let currentPage = '';
let loadingStatus = 0;


window.addEventListener('message', function(e) {
  
  if (e.data.type !== undefined && e.data.type == 'loaded') {
    
    if (waitRender !== null)
      loadingStatus = 200;
    else
      renderBlog();
  }
  
}, false);


function getDirectory(source, parentId) {
  
  while (source.match('//'))
    source = source.replace('//','/');
  
  let dir = source.split('/');
  let currentFolder;
  
  while (dir.length > 1) {
    
    if (dir[0] === '..' || dir[0] === '.'  || dir[0] === '') {
      
      currentFolder = odin.dataOf(parentId, fs.data.folders, 'fid');
      if (currentFolder === undefined) {
        
        acFold = -2;
        break;
      }
      
      dir.splice(0, 1);
      parentId = currentFolder.parentId;
    } else {
      
      let folders = odin.filterData(parentId, fs.data.folders, 'parentId');
      
      currentFolder = odin.dataOf(dir[0], folders, 'name');
      if (currentFolder) {
        
        parentId = currentFolder.fid;
        dir.splice(0, 1);
      } else {
        
        parentId = -2;
        break;
      }
    }
  }
  
  return parentId;
}

function renderBlog(isForceDeploy) {
  
  let body = replaceLocal();
  loadedScriptAndLink.length = 0;
  body = clearComments(body);
  body = plate.cook(body);
  
  if (isForceDeploy) {
    uploadBody = body;
    return;
  }
  
  if ($('#in-blossem').value.trim().length > 0) {
    
    previewWindow.postMessage({tmp:true, html: body}, '*');
    uploadBody = body;
  } else {
    previewWindow.postMessage({type:'reload'}, '*');
  
    waitRender = function () {
      
      if (loadingStatus != 200)
      {
        setTimeout(function(){
          if (waitRender)
            waitRender();
          loadingStatus = 0;
        }, 500);
      } else {
        uploadBody = body;
        
        previewWindow.postMessage({
          type: 'template',
          xml: body
        }, '*');
        waitRender = null;
      }
    };
    waitRender();
  }
}


function replaceLocal(body, preParent = -1) {

  if (body === undefined) {
    
    if (locked === -1 || (activeFile && locked === activeFile.fid)) {
    
      body = $('#editor').env.editor.getValue();
      
      preParent = activeFile ? activeFile.parentId : activeFolder;
    } else {
    
      let file = odin.dataOf(locked, fs.data.files, 'fid');
      
      let tabIdx = odin.idxOf(file.fid, fileTab, 'fid');
      if (tabIdx >= 0)
        body = fileTab[tabIdx].content;
      else
        body = file.content;
      
      preParent = file.parentId;
    }
  }
  

  let match = body.match(/<template include=.*?><\/template>/);
  if (!match)
    match = body.match(/<script include=.*?><\/script>|<link include=.*?>/);
  if (!match)
    match = body.match(/@import .*?;/);
  
  
  while (match !== null) {
    
    let isScriptOrLink = false;
    let start = 19,
    end = 13;
    
    if (match[0].includes('<script')) {
      start = 17;
      end = 11;
      isScriptOrLink = true;
    } else if (match[0].includes('<link')) {
      start = 15;
      end = 3;
      isScriptOrLink = true;
    } else if (match[0].includes('@import ')) {
      start = 9;
      end = 2;
    }
    
    let src = match[0].substring(start, match[0].length-end);
    let relativeParent = preParent;
    
    
    if (isScriptOrLink) {
      
      if (loadedScriptAndLink.indexOf(src) < 0) {
        
        loadedScriptAndLink.push(src);
      } else {
        
        body = body.replace(new RegExp(match[0]), '');
        match = body.match(/<template include=.*?><\/template>/);
        if (!match)
          match = body.match(/<script include=.*?><\/script>|<link include=.*?>/);
        if (!match)
          match = body.match(/@import .*?;/);
          
        continue;
      }
    }
    
    if (src.startsWith('__')) {
      relativeParent = -1;
      src = src.replace(/__\//, '');
    }
    let parentId = getDirectory(src, relativeParent);
    let files = odin.filterData(parentId, fs.data.files, 'parentId');
    let name = src.replace(/.*?\//g,'')
    let data = odin.dataOf(name, files, 'name');
    
    if (data === undefined) {
      body = body.replace(match[0], '<b style="font-size:0.9em;">THOR unexpected: '+src+' not found.</b><br/>');
    } else {
      
      if (!data.loaded) {
        
        aww.pop('Downloading required file : '+name);
        drive.downloadDependencies(data);
      }
      
      let ot = '', ct = '';
      switch (start) {
        
        case 17:
          ot = '<script>\n';
          ct = '\n</script>';
          break;
        case 15:
          ot = '<style>\n';
          ct = '\n</style>';
          break;
      }
      
      let tabIdx = odin.idxOf(data.fid, fileTab, 'fid');
      let content;
      if (tabIdx >= 0)
        content = (activeFile && activeFile.fid === data.fid) ? $('#editor').env.editor.getValue() : fileTab[tabIdx].content;
      else
        content = data.content;
    
      let swap = ot+replaceLocal(content, parentId)+ct;
      body = body.replace(new RegExp(match[0]), swap);
    }
   
    
    match = body.match(/<template include=.*?><\/template>/);
    if (!match)
      match = body.match(/<script include=.*?><\/script>|<link include=.*?>/);
    if (!match)
      match = body.match(/@import .*?;/);
  }
  
  return body;
}


function clearComments(xml) {
  xml = xml.replace(new RegExp('<!--_(.|\n)*?-->','g'),'');
  return xml;
}

function lockRender(self, fid, name) {
  for (let el of $('.btn-lock'))
    el.classList.toggle('w3-text-purple', false)
  
  if (locked !== fid) {
    locked = fid;
    self.classList.toggle('w3-text-purple')
  } else {
    locked = -1;
  }
}