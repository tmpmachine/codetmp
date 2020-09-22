let uploadBody = '';
let locked = -1;
let previewWindow = null;
let PWALoadWindow = null;
let PreviewLoadWindow = null;
let isPWAFrameLoaded = false;
let isPreviewFrameLoaded = false;

(function() {
  
  function getDirectory(source, parentId, path) {
    
    while (source.match('//'))
      source = source.replace('//','/');
    
    let dir = source.split('/');
    let folder;
    
    while (dir.length > 1) {
      
      if (dir[0] === '..' || dir[0] === '.'  || dir[0] === '') {
        
        folder = odin.dataOf(parentId, fileStorage.data.folders, 'fid');
        if (folder === undefined) {
          acFold = -2;
          break;
        }
        dir.splice(0, 1);
        path.pop();
        parentId = folder.parentId;
      } else {
        
        let folders = odin.filterData(parentId, fileStorage.data.folders, 'parentId');
        for (let f of folders) {
          if (f.name == dir[0] && !f.trashed) {
            folder = f;
            break;
          }
        }
        if (folder) {
          parentId = folder.fid;
          path.push(folder.name);
          dir.splice(0, 1);
        } else {
          parentId = -2;
          break;
        }
      }
    }
    
    return parentId;
  }
  
  function getMatch(content) {
    return content.match(/<file include=.*?><\/file>|<template include=.*?><\/template>|<script .*?src=.*?><\/script>|<link .*?href=.*?>/);
  }
  
  function replaceLocal(body, preParent = -1, path = ['root']) {

    if (body === undefined) {
      gitTree.length = 0;
      if (locked === -1 || (activeFile && locked === activeFile.fid)) {
      
        body = fileTab[activeTab].editor.env.editor.getValue();
        
        preParent = activeFile ? activeFile.parentId : activeFolder;
        // if (activeFile)
          // appendGitTree(activeFile.name, plate.cook(body).replace(/href="\$/g,'href="').replace(/__\//g,''));
      } else {
      
        let file = odin.dataOf(locked, fileStorage.data.files, 'fid');
        
        let tabIdx = odin.idxOf(file.fid, fileTab, 'fid');
        if (tabIdx >= 0)
          body = fileTab[tabIdx].editor.env.editor.getValue();
        else
          body = file.content;
        
        preParent = file.parentId;
        // appendGitTree(file.name, plate.cook(body).replace(/href="\$/g,'href="').replace(/__\//g,''));
      }
      
    }
    
  
    let match = getMatch(body);
    
    while (match !== null) {

      let tagName;
      let isScriptOrLink = false;
      let isFile = false;
      let isMinified = false;
      let start = 19;
      let end = 13;
      let src = '';
      
      if (match[0].includes('<script')) {
        src = match[0].match(/src=['|"].*?['|"]/)[0];
        src = src.substring(5, src.length - 1);
        isScriptOrLink = true;
        tagName = 'script';
      } else if (match[0].includes('<link')) {
        src = match[0].match(/href=['|"].*?['|"]/)[0];
        src = src.substring(6, src.length - 1);
        isScriptOrLink = true;
        tagName = 'style';
      } else if (match[0].includes('<file')) {
        start = 15;
        end = 9;
        isScriptOrLink = true;
        isFile = true;
      }
      
      src = (src.length > 0) ? src : match[0].substring(start, match[0].length-end);
      let relativeParent = preParent;
      
      if (src.startsWith('https://') || src.startsWith('http://')) {
        body = body.replace(match[0], match[0].replace('href=','href-web=').replace('src=','src-web='));
        match = getMatch(body);
        continue;
      }
      
      if (src.startsWith('__')) {
        relativeParent = -1;
        src = src.replace(/__\//, '');
      }
      
      let absolutePath = JSON.parse(JSON.stringify(path));
      let parentId = getDirectory(src, relativeParent, path);
      let files = odin.filterData(parentId, fileStorage.data.files, 'parentId');
      let name = src.replace(/.*?\//g,'');
      let file = odin.dataOf(name, files, 'name');
      if (file === undefined) {
        body = body.replace(match[0], '');
        console.log(src+' not found');
      } else {
        if (!file.loaded) {
          aww.pop('Downloading required file : '+name);
          drive.downloadDependencies(file);
        }
        
        let ot = '', ct = '';
        if (tagName) {
          ot = '<'+tagName+'>\n';
          ct = '\n</'+tagName+'>';
        }
        
        
        let tabIdx = odin.idxOf(file.fid, fileTab, 'fid');
        let content;
        if (tabIdx >= 0)
          content = (activeFile && activeFile.fid === file.fid) ? fileTab[activeTab].editor.env.editor.getValue() : fileTab[tabIdx].editor.env.editor.getValue();
        else
          content = file.content;
        // appendGitTree((path.join('/') + '/').replace('root/','') + file.name, content);
        
        if ($('#chk-deploy-minified').checked && isMinified)
          content = content.replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '').replace(/\n|\t+/g,'');
        else if (isFile)
          content = content.replace(/</g,'&lt;').replace(/\[/g,'&lsqb;').replace(/]/g,'&rsqb;');
      
        let swap = ot + replaceLocal(content, parentId, path) + ct;
        body = body.replace(new RegExp(match[0]), swap);
      }
     
      path = absolutePath;
      match = getMatch(body);
    }
    
    return body;
  }
  
  function clearComments(xml) {
    xml = xml.replace(new RegExp('<!--_(.|\n)*?-->','g'),'');
    return xml;
  }
  
  function previewHTML(isForceDeploy) {
    
    let body = replaceLocal().replace(/src-web=/g, 'src=').replace(/href-web=/g, 'href=');
    body = clearComments(body);
    
    if ($('#chk-render-plate-html').checked)
      body = (typeof(plate) != 'undefined') ? plate.cook(body) : body;
    
    appendGitTree('index.html', body);
    
    if (isForceDeploy) {
      uploadBody = body;
      return;
    }
    
    if ($('#in-PWA-enabled').checked) {
      if (!$('#PWAFrame'))
        $('#limbo-element').append(o.cel('iframe', {id:'PWAFrame',name:'PWAFrame'}));
      
      if (!isPWAFrameLoaded) {
        aww.pop('Waiting for PWA installer...');
        if (debugPWAUrl.length > 0)
          PWALoadWindow = window.open(debugPWAUrl,'PWAFrame');
        else
          PWALoadWindow = window.open('https://localpwa.web.app/','PWAFrame');
      }
      
      let waitFirstLoad = setInterval(() => {
        
        if (isPWAFrameLoaded) {
          aww.pop('Saving app data on device...');
          let canvas = document.createElement('canvas');
          let ctx = canvas.getContext('2d');
          let backgrounds = ['#000839','#ffa41b','#000000','#192b58','#ffa34d','#f67575','#d4f8e8'];
          let bg = backgrounds[Math.floor(Math.random()*6)+0];

          let src128 = {
            url: $('#in-PWA-src-128-url').value.trim(),
            type: $('#in-PWA-src-128-type').value.trim(),
          }
          if (!['image/png','image/jpg','image/jpeg'].includes(src128.type))
            src128.type = 'image/png';
          if (src128.url.length == 0)
            src128.url = location.origin+'/images/128.png';
          
          let src192 = {
            url: $('#in-PWA-src-192-url').value.trim(),
            type: $('#in-PWA-src-192-type').value.trim(),
          }
          if (!['image/png','image/jpg','image/jpeg'].includes(src192.type))
            src192.type = 'image/png';
          if (src192.url.length == 0)
            src192.url = location.origin+'/images/192.png';
          
          PWALoadWindow.postMessage({type:'install', appData:{
            src128,
            src192,
            url: $('#in-PWA-app-url').value.trim(),
            name: $('#in-PWA-app-name').value.trim(),
            html: body,
          }}, '*');
          clearInterval(waitFirstLoad);
        }
      }, 100)
    } else {
      
      if (!$('#PreviewFrame'))
        $('#limbo-element').append(o.cel('iframe', {id:'PreviewFrame',name:'PreviewFrame'}));
      
      if (!isPreviewFrameLoaded) {
        if (previewUrl.length > 0) {
          previewLoadWindow = window.open(previewUrl,'PreviewFrame');
        } else {
          previewLoadWindow = window.open('https://attemp.web.app/','PreviewFrame');
        }
      }
      
      let waitPreviewLoad = setInterval(() => {
        if (isPreviewFrameLoaded) {
          previewLoadWindow.postMessage({type:'install', appData:{
            url: 'default',
            name: 'default',
            html: body,
          }}, '*');
          clearInterval(waitPreviewLoad);
        }
      }, 100);
    }
  }
  
  window.previewHTML = previewHTML;
  
})();

window.addEventListener('message', function(e) {
  if (e.data.type) {
    switch (e.data.type) {
    case 'pwa-frame-isReady':
        isPWAFrameLoaded = true;
        break;
    case 'preview-frame-isReady':
        isPreviewFrameLoaded = true;
        break;
    case 'pwa-app-installed':
        aww.pop('PWA ready!');
        if ($('#in-seperate-PWA-process').checked) {
          let a = o.cel('a', {
            href: e.data.url,
            rel: 'noreferrer',
            target: '_blank'
          })
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          window.open(e.data.url, 'preview');
        }
        break;
    }
  }

  if (e.data.message) {
    if (e.data.message == 'cached') {
      window.open(e.data.url, 'preview');
    }
  }

}, false);

navigator.serviceWorker.addEventListener('message', e => {
  if (e.data.message) {
    if (e.data.message == 'emmet-cached') {
      editorManager.initEmmet();
    }
  }
});