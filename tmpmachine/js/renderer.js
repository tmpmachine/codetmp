let uploadBody = '';
let locked = -1;
let previewWindow = null;
let PWALoadWindow = null;
let PWAPreviewWindow = null;
let isPWAFrameLoaded = false;

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
    return content.match(/<file include=.*?><\/file>|<template include=.*?><\/template>|<mscript .*?src=.*?><\/mscript>|<script .*?src=.*?><\/script>|<link .*?href=.*?>|<mlink .*?href=.*?>|@import .*?;/);
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
      let src = '';
      
      if (match[0].includes('<mscript')) {
        src = match[0].match(/src=['|"].*?['|"]/)[0];
        src = src.substring(5, src.length - 1);
        isScriptOrLink = true;
        isMinified = true;
        tagName = 'script';
      } else if (match[0].includes('<script')) {
        src = match[0].match(/src=['|"].*?['|"]/)[0];
        src = src.substring(5, src.length - 1);
        isScriptOrLink = true;
        tagName = 'script';
      } else if (match[0].includes('<mlink')) {
        src = match[0].match(/href=['|"].*?['|"]/)[0];
        src = src.substring(6, src.length - 1);
        isScriptOrLink = true;
        isMinified = true;
        tagName = 'style';
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
      } else if (match[0].includes('@import ')) {
        start = 9;
        end = 2;
      }
      
      src = (src.length > 0) ? src : match[0].substring(start, match[0].length-end);
      let relativeParent = preParent;
      
      if (isScriptOrLink) {
        if (loadedScriptAndLink.indexOf(src) < 0) {
          loadedScriptAndLink.push(src);
        } else {
          body = body.replace(new RegExp(match[0].replace('$','\\$')), '');
          match = getMatch(body);
          continue;
        }
      }
      
      if (src.startsWith('$')) {
        body = body.replace(match[0], match[0].replace('href=','href-web=').replace('src=','src-web=').replace("='$","='").replace('="$','="'));
        continue;
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
      if (file === undefined) {
        body = body.replace(match[0], '<b style="font-size:0.9em;">THOR unexpected: '+src+' not found.</b><br/>');
      } else {
        L(path.join('/') + '/' + file.name);
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
    
    let body = replaceLocal().replace(/src-web=/g, 'src=').replace(/href-web=/g, 'href=');
    loadedScriptAndLink.length = 0;
    body = clearComments(body);
    
    if ($('#chk-render-plate-html').checked)
      body = (typeof(plate) != 'undefined') ? plate.cook(body) : body;
    
    if (isForceDeploy) {
      uploadBody = body;
      return;
    }
    
    let check = checkBlossemURL();
    if (check.hasBlossemURL) {
      previewWindow.postMessage({tmp:true, html: body}, '*');
      uploadBody = body;
    } else if ($('#in-PWA-enabled').checked) {
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
          
          PWALoadWindow.postMessage({type:'install',appData:{
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
    if (e.data.type) {
      if (e.data.type == 'loaded') {
        if (waitRender !== null)
          loadingStatus = 200;
        else
          renderBlog();
      }
      else if (e.data.type == 'pwa-frame-isReady')
        isPWAFrameLoaded = true;
      else if (e.data.type == 'pwa-app-installed') {
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
          PWAPreviewWindow = window.open(e.data.url, 'preview');
        }
      }
    }
    
  }, false);
  
})();