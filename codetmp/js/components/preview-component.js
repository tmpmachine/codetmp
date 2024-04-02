let compoPreview = (function () {
  
  let SELF = {
    previewPathAtPWA,
    getDirectory,
    setToken,
    replaceFile,
    previewPath,
    Init,
  };
  
  let local = {
    driveAccessToken: '',
    targetPreviewDomain: 'preview', // preview or pwa
    isPortOpened: false,
    resolvePort: null,
    messageChannel1: null, 
    messageChannel2: null,
    previewFrame1: window.open(environment.previewUrl, 'PreviewFrame'),
    previewFrame2: window.open(environment.previewUrlPWA, 'PreviewFramePWA'),
  }

  async function delayWindowFocus() {
    return new Promise(resolve => window.setTimeout(resolve, 1));
  }

  function previewPathAtPWA() {
    let targetPreviewDomain = 'pwa';
    previewPath(null, targetPreviewDomain);
  }

  async function previewPath(requestPath, _targetPreviewDomain = 'preview') {
    local.targetPreviewDomain = _targetPreviewDomain;
    if (!requestPath) {
      requestPath = await getPath();
    }
    let frameName = '';
    if (settings.data.editor.linkPreviewWindowProcess) {
      frameName = getFrameName();
    }
    let url = environment.previewUrl + requestPath;
    if (local.targetPreviewDomain == 'pwa') {
      url = environment.previewUrlPWA + requestPath;
  
    }

    if (local.isPortOpened) {

      testConnection(_targetPreviewDomain)
      .then(async () => {
        await delayWindowFocus();
        if (frameName) {
          window.open(url, frameName);
        } else {
          window.open(url, '_blank', 'noopener');
        }
      })
      .catch(() => {
        local.isPortOpened = false;
        previewPath(requestPath, _targetPreviewDomain);
      });

    } else {
      
      new Promise(resolve => {
        local.resolvePort = resolve;
      }).then(async () => {
        local.isPortOpened = true;
        local.resolvePort = null;
        await delayWindowFocus();
        if (frameName) {
          window.open(url, frameName);
        } else {
          window.open(url, '_blank', 'noopener');
        }
      });
      
      let channel = createMessageChannel(_targetPreviewDomain);
      getPreviewFrame().postMessage({ 
        message: 'init-message-port', 
        channelName: getMessageChannelName(), 
      }, '*', [channel.port2]);
    }

  };

  function createMessageChannel(channelName) {
    if (channelName == 'preview') {
      local.messageChannel1 = new MessageChannel();
      local.messageChannel1.port1.onmessage = fileResponseHandler;
      return local.messageChannel1;
    } else if (channelName == 'pwa') {
      local.messageChannel2 = new MessageChannel();
      local.messageChannel2.port1.onmessage = fileResponseHandler;
      return local.messageChannel2;
    }
  }
  
  let testConnectionResolver1, testConnectionResolver2;
  async function testConnection(channelName) {
    return new Promise((resolve, reject) => {
      setTestConnectionResolver(channelName, resolve);
      // testConnectionResolver = resolve;
      getMessageChannel(channelName).port1.postMessage({
        message: 'test-connection', 
        channelName: getMessageChannelName(),
      });
      window.setTimeout(() => {
        reject();
      }, 120);
    });
  }

  async function responseAsMedia(event, path, mimeType, channelName) {

  	let file = (await getFileAtPath(path)).file;
    if (file === null || file === undefined) {
      getMessageChannel(channelName).port1.postMessage({
        message: 'response-file', 
        mime: '',
        content: '<404></404>',
        resolverUID: event.data.resolverUID,
      });
    } else {

      if (helperUtils.hasFileReference(file.fileRef) && file.content === null) {
        
        let content = file.fileRef;
        if (file.fileRef.entry) {
          content = await file.fileRef.entry.getFile();
        }
        getMessageChannel(channelName).port1.postMessage({
          message: 'response-file', 
          mime: helperUtils.getMimeType(file.name),
          content: content,
          resolverUID: event.data.resolverUID,
        });

      } else { 

        let isHasSource = false;
        if (file.content.length > 0) {
          isHasSource = helperUtils.isHasSource(file.content);
        }

        let data = {
          contentLink: compoDrive.apiUrl+'files/'+file.id+'?alt=media',
          source: 'drive',
        };
        
        if (isHasSource) {
          data.contentLink = helperUtils.getRemoteDataContent(file.content).downloadUrl;
          data.source = 'git';
        } else {
          await auth2.init();
          data.accessToken = local.driveAccessToken;
        }

        getMessageChannel(channelName).port1.postMessage({
          message: 'response-file-multimedia', 
          mime: mimeType,
          content: data,
          resolverUID: event.data.resolverUID,
        });
        
      }
    }
  }

  async function responseAsText(event, path, mimeType, channelName) {

  	let content = await getContent(path, mimeType);
    if (typeof Terser != 'undefied' && mimeType == "text/javascript; charset=UTF-8" && settings.data.editor.minifyJs) {
      try {
        let result = await Terser.minify(content, { sourceMap: false });
        content = result.code;
      } catch (e) {
        console.log(e)
      }
    }
    
    getMessageChannel(channelName).port1.postMessage({
  		message: 'response-file', 
  		mime: mimeType,
  		content: content,
  		resolverUID: event.data.resolverUID,
  	});

  }

	async function fileResponseHandler(e) {
	  
    let channelName = 'preview'; // default
    if (e.data.channelName) {
      channelName = e.data.channelName;
    }
	  switch (e.data.message) {
	    case 'request-path':
        let path = decodeURI(removeParam(e.data.path));
        if(path.endsWith('/')) 
          path += 'index.html';
        let mimeType = helperUtils.getMimeType(path);
        if (helperUtils.isMediaTypeText(path)) {
          await responseAsText(e, path, mimeType+'; charset=UTF-8', channelName);
        } else {
          await responseAsMedia(e, path, mimeType, channelName);
        }
	      break;
      case 'test-connection':
        getMessageChannel(channelName).port1.postMessage({
          message: 'resolve-test-connection', 
        });
        break;
	    case 'resolve-test-connection':
        resolveTestConnection(channelName);
	      break;
	    case 'message-port-opened':
        if (local.resolvePort) {
          local.resolvePort();
        }
        break;
	  }
  }

  function resolveTestConnection(channelName) {
    let resolver = getTestConnectionResolver(channelName);
    if (resolver) {
      resolver();
    }
  }

  async function getFileAtPath(src) {
    let preParent = activeFolder;
    let relativeParent = preParent;
    let path = ['root'];
    let parentId = await getDirectory(src, relativeParent, path);
    let files = await fileManager.TaskListFiles(parentId);
    let name = src.replace(/.*?\//g,'');
    let isFileFound = false;
    let file = null;
    for (let i=0; i<files.length; i++) {
      if (files[i].name.toLowerCase() == name.toLowerCase() && !files[i].trashed) {
        file = files[i];
        break;
      }
    }
    return { file, parentId };
  }

	async function getContent(src, mimeType) {
    let content = '<404></404>';
    let isConvertDivless = ( settings.data.editor.divlessHTMLEnabled && mimeType.match(/text\/html|text\/xml/) );

    if (src == '/untitled.html') {
      content = fileTab[activeTab].editor.env.editor.getValue();
      // replace <file> tags relative to root dir.
      content = await replaceTemplate(content);
    } else {
      content = await getContentFromSrcAsync(src, isConvertDivless);
    }

    // convert to divless if enabled in Settings
    if (isConvertDivless) {
      return divless.replace(content);
    }

    return content;
  }

  async function getContentFromSrcAsync(src, isConvertDivless) {

    let content = '<404></404>';
    let filePathData = await getFileAtPath(src);
    let file = filePathData.file;
    let parentId = filePathData.parentId;
    
    if (file === null) return content;

    // return empty and download the file from the remote source at the same time.
    if (!file.loaded) {
      aww.pop('Downloading required file : '+file.name);
      fileManager.downloadMedia(file);
      return content;
    }

    /*
      Return order:
      --
      1. opened file tab
      2. opened divless file tab (.html only)
      3. either a file reference or file storage content depending on the active workspace type (Main, Playground, and File System)
    */

    // seek and return content from opened files
    let openedFileTab = fileTab.find(item => item.fid == file.fid);
    if (openedFileTab) {
      content = openedFileTab.editor.env.editor.getValue();
      return content;
    }

    // seek and return content from its divless file, only if it's currently opened
    if (isConvertDivless) {
      let divlessContent = await getOpenedDivlessFileContentAsync(file);
      if (divlessContent) {
        return divlessContent;
      } 
    }

    // File System workspace: return content from file reference
    if (activeWorkspace == 2) {

      let blob = null;

      if (file.fileRef.entry) {
        blob = await file.fileRef.entry.getFile();
      } else {
        blob = file.fileRef;
      }
      
      // return as text so that it can be converted from divless format
      if (isConvertDivless) {
        content = await new Promise(resolve => {
          let reader = new FileReader();
          reader.onload = async function() {
            resolve(reader.result)
          }
          reader.readAsText(blob);   
        })
        return content;
      } 
      
      // return blob as is
      return blob;
    }

    // oher workspaces: return content from file storage
    content = file.content;
    return content;

  }

  async function getOpenedDivlessFileContentAsync(file) {

    let content = null

    // seek cached divless reference file in opened tabs
    let openedDivlessFileTab = fileTab.find(item => item.divlessConvertFileTargetFid == file.fid);

    if (openedDivlessFileTab) {

      content = openedDivlessFileTab.editor.env.editor.getValue();
      return content;

    } else {

      // seek divless reference file in opened tabs and set cache reference if found
      
      for (let tabObj of fileTab) {

        // skip untitled (new, unsaved) file
        if (!tabObj.file) continue;

        // skip other files than html
        if (!helperUtils.getMimeType(tabObj.file.name).match(/text\/html|text\/xml/)) continue;

        // skip files with different name
        if (tabObj.file.name != file.name) continue;

        let divlessTargetFile = await fileManager.TaskGetDivlessTargetFile(tabObj.file);
        
        if (divlessTargetFile && divlessTargetFile.fid == file.fid) {
          tabObj.divlessConvertFileTargetFid = file.fid;
          content = tabObj.editor.env.editor.getValue();
          return content;
        }

      }

    }

    return content;
  }

  function getFrameName() {
    let file = activeFile;
    let name = 'preview';
    if (file !== null)
      name = 'preview-'+file.fid;
    return name;
  }

  async function getDirectory(source, parentId, path) {
    source = decodeURI(source);
    while (source.match('//')) {
      source = source.replace('//','/');
    }
    
    let dir = source.split('/').reverse();
    let folder;
    
    while (dir.length > 1) {
      
  	  let dirName = dir.pop();

      if (dirName === '') {
      	parentId = -1;
      } else if (dirName === '..' || dirName === '.') {
        
        folder = await fileManager.TaskGetFile({fid: parentId, type: 'folders'});
        if (folder === undefined) {
          break;
        }
        path.pop();
        parentId = folder.parentId;
      } else {
        
        let folders = await fileManager.TaskListFolders(parentId);
        for (let f of folders) {
          if (f.name.toLowerCase() == dirName.toLowerCase() && !f.trashed) {
            folder = f;
            break;
          }
        }
        if (folder) {
          if (!folder.isLoaded) {
            compoDrive.syncFromDrivePartial([folder.id]);
            break;
          }
          parentId = folder.fid;
          path.push(folder.name);
        } else {
          parentId = -2;
          break;
        }
      }
    }
    
    return parentId;
  };

  async function getPath() {

    let file;

    if (activeFile != null) {
      file = activeFile;
    }

  	if (typeof(file) == 'undefined') {
  		return 'untitled.html';
  	}
    
    let divlessTargetFile = await fileManager.TaskGetDivlessTargetFile(file);
    if (divlessTargetFile) {
      file = divlessTargetFile;
    }
    
    let filePath = await fileManager.TaskResolveFilePath(file);;
    return filePath;
  }

  function setToken(token) {
    local.driveAccessToken = token;
  }

  async function replaceFile(match, body, preParent, path) {
    let src = match[0].substring(11, match[0].length-9);
    let relativeParent = preParent;
    let parentId = await getDirectory(src, relativeParent, path);
    let files = await fileManager.TaskListFiles(parentId);
    let name = src.replace(/.*?\//g,'');
    let file = null;
    for (let i=0; i<files.length; i++) {
      if (files[i].trashed) {
        continue;
      } else if (files[i].name == name) {
        file = files[i];
      }
    }
    if (file === null) {
      body = body.replace(match[0], '');
      aww.pop('Required file not found : '+src);
    } else {
      let content = '';
      if (!file.loaded) {
        fileManager.downloadMedia(file);
      } else {

        let tabIdx = fileTab.findIndex(item => item.fid == file.fid);
        
        if (tabIdx >= 0) {
          content = (activeFile && activeFile.fid === file.fid) ? fileTab[activeTab].editor.env.editor.getValue() : fileTab[tabIdx].editor.env.editor.getValue();
        } else {
          content = file.content;

          if (helperUtils.hasFileReference(file.fileRef) && file.content === null) {
        
            if (file.fileRef.entry) {
              let fileResult = await file.fileRef.entry.getFile();
              content = await new Promise(resolve => {
                let reader = new FileReader();
                reader.onload = async function(evt) {
                  resolve(reader.result)
                }
                reader.readAsText(fileResult);
              })
            }
    
          }
        }
      }
      let swap = await replaceTemplate(content, parentId, path);
      body = body.replace(new RegExp(match[0]), swap);
    }
    return body;
  }

  async function replaceTemplate(body, preParent = -1, path = ['root']) {
    let match = getMatchTemplate(body);
    while (match !== null) {
      let searchPath = JSON.parse(JSON.stringify(path));
      body = await replaceFile(match, body, preParent, searchPath);
      match = getMatchTemplate(body);
    }
    return body;
  }

  function getMatchTemplate(content) {
    return content.match(/<file src=.*?><\/file>/);
  }

  function getPreviewFrame(channelName) {
    return (channelName == 'pwa') ? local.previewFrame2 : local.previewFrame1;
  }

  function getMessageChannel(channelName) {
    return (channelName == 'pwa') ? local.messageChannel2 : local.messageChannel1;
  }

  function getMessageChannelName() {
    return local.targetPreviewDomain;
  }

  function setTestConnectionResolver(channelName, resolver) {
    if (channelName == 'pwa') {
      testConnectionResolver2 = resolver;
    } else if (channelName == 'preview') {
      testConnectionResolver1 = resolver;
    }
  }

  function getTestConnectionResolver(channelName) {
    if (channelName == 'pwa') {
      return testConnectionResolver2;
    } else if (channelName == 'preview') {
      return testConnectionResolver1;
    }
  }

  function removeParam(url) {
    var oldURL = url;
    var index = 0;
    var newURL = oldURL;
    index = oldURL.indexOf('?');
    if(index == -1){
        index = oldURL.indexOf('#');
    }
    if(index != -1){
        newURL = oldURL.substring(0, index);
    }
    return newURL;
  }

  function Init() {
    attachPortListeners();
  }

  function attachPortListeners() {
    window.addEventListener('message', function(e) {

      if (e.data.message) {
        let channel;
        switch (e.data.message) {
          case 'port-missing':
            channel = createMessageChannel(e.data.channelName);
            getPreviewFrame(e.data.channelName).postMessage({ message: 'reinit-message-port' }, '*', [channel.port2]);
            break;
          case 'preview-frame-isReady':
            channel = createMessageChannel(e.data.channelName);
            getPreviewFrame(e.data.channelName).postMessage({ message: 'init-message-port' }, '*', [channel.port2]);
            break;
        }
      }
  
    }, false);
  }

  return SELF;

})();