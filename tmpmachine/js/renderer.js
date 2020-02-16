let uploadBody = '';
let locked = -1;
let previewWindow = null;

(function() {
  
  let loadedScriptAndLink = [];
  let loadingStatus = 0;
  let waitRender = null;
  
  function getDirectory(source, parentId, path) {
    
    while (source.match('//'))
      source = source.replace('//','/');
    
    let dir = source.split('/');
    let folder;
    
    while (dir.length > 1) {
      
      if (dir[0] === '..' || dir[0] === '.'  || dir[0] === '') {
        
        folder = odin.dataOf(parentId, fs.data.folders, 'fid');
        if (folder === undefined) {
          acFold = -2;
          break;
        }
        dir.splice(0, 1);
        path.pop();
        parentId = folder.parentId;
      } else {
        
        let folders = odin.filterData(parentId, fs.data.folders, 'parentId');
        folder = odin.dataOf(dir[0], folders, 'name');
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
    return content.match(/<file include=.*?><\/file>|<template include=.*?><\/template>|<mscript include=.*?><\/mscript>|<script include=.*?><\/script>|<link include=.*?>|<mlink include=.*?>|@import .*?;/);
  }
  
  function replaceLocal(body, preParent = -1, path = ['root']) {

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
    
  
    let match = getMatch(body);
    
    while (match !== null) {
      
      let tagName;
      let isScriptOrLink = false;
      let isFile = false;
      let isMinified = false;
      let start = 19;
      let end = 13;
      
      if (match[0].includes('<mscript')) {
        start = 18;
        end = 12;
        isScriptOrLink = true;
        isMinified = true;
        tagName = 'script';
      } else if (match[0].includes('<script')) {
        start = 17;
        end = 11;
        isScriptOrLink = true;
        tagName = 'script';
      } else if (match[0].includes('<mlink')) {
        start = 16;
        end = 3;
        isScriptOrLink = true;
        isMinified = true;
        tagName = 'style';
      } else if (match[0].includes('<link')) {
        start = 15;
        end = 3;
        isScriptOrLink = true;
        tagName = 'style';
      } else if (match[0].includes('<file')) {
        start = 15;
        end = 9;
        isScriptOrLink = true;
        isFile = true;
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
          match = getMatch(body);
          continue;
        }
      }
      
      if (src.startsWith('__')) {
        relativeParent = -1;
        src = src.replace(/__\//, '');
      }
      
      let absolutePath = JSON.parse(JSON.stringify(path));
      let parentId = getDirectory(src, relativeParent, path);
      let files = odin.filterData(parentId, fs.data.files, 'parentId');
      let name = src.replace(/.*?\//g,'');
      let file = odin.dataOf(name, files, 'name');
      L(path.join('/') + '/' + file.name);
      if (file === undefined) {
        body = body.replace(match[0], '<b style="font-size:0.9em;">THOR unexpected: '+src+' not found.</b><br/>');
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
          content = (activeFile && activeFile.fid === file.fid) ? $('#editor').env.editor.getValue() : fileTab[tabIdx].content;
        else
          content = file.content;
        
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
  
  function renderBlog(isForceDeploy) {
    
    let body = replaceLocal();
    loadedScriptAndLink.length = 0;
    body = clearComments(body);
    
    if ($('#chk-render-plate-html').checked)
      body = plate.cook(body);
    
    if (isForceDeploy) {
      uploadBody = body;
      return;
    }
    
    let check = checkBlossemURL();
    if (check.hasBlossemURL) {
      previewWindow.postMessage({tmp:true, html: body}, '*');
      uploadBody = body;
    } else {
      previewWindow.postMessage({type:'reload'}, '*');
    
      waitRender = function () {
        
        if (loadingStatus != 200) {
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
  
  window.renderBlog = renderBlog;
  
  window.addEventListener('message', function(e) {
    
    if (e.data.type !== undefined && e.data.type == 'loaded') {
      
      if (waitRender !== null)
        loadingStatus = 200;
      else
        renderBlog();
    }
    
  }, false);
  
})();