let previewHandler = new PreviewHandler();

function PreviewHandler() {

  this.portResolver = null;
  this.previewMode = 'normal';
  let driveAccessToken = '';
  let targetPreviewDomain = 'preview'; // preview or pwa
  let previewFrame1 = window.open(environment.previewUrl, 'PreviewFrame');
  let previewFrame2 = window.open(environment.previewUrlPWA, 'PreviewFramePWA');

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

  let messageChannel1, messageChannel2;
  let resolvePort;
  let SELF = {};
  
  async function delayWindowFocus() {
    return new Promise(resolve => window.setTimeout(resolve, 1));
  }

  this.previewPathAtPWA = function() {
    let targetPreviewDomain = 'pwa';
    SELF.previewPath(null, targetPreviewDomain);
  }

  let isPortOpened = false;
  SELF.previewPath = this.previewPath = async function(requestPath, _targetPreviewDomain = 'preview') {
    targetPreviewDomain = _targetPreviewDomain;
    if (!requestPath) {
      requestPath = await previewHandler.getPath();
    }
    let frameName = '';
    if (settings.data.editor.linkPreviewWindowProcess) {
      frameName = previewHandler.getFrameName();
    }
    let url = environment.previewUrl + requestPath;
    if (targetPreviewDomain == 'pwa') {
      url = environment.previewUrlPWA + requestPath;
  
    }
    if (isPortOpened) {

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
        isPortOpened = false;
        SELF.previewPath(requestPath, _targetPreviewDomain);
      });

    } else {
      
      new Promise(resolve => {
        resolvePort = resolve;
      }).then(async () => {
        isPortOpened = true;
        resolvePort = null;
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
      messageChannel1 = new MessageChannel();
      messageChannel1.port1.onmessage = previewHandler.fileResponseHandler;
      return messageChannel1;
    } else if (channelName == 'pwa') {
      messageChannel2 = new MessageChannel();
      messageChannel2.port1.onmessage = previewHandler.fileResponseHandler;
      return messageChannel2;
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

      if (file.isTemp && helper.hasFileReference(file.fileRef) && file.content === null) {
        
        let content = file.fileRef;
        if (file.fileRef.entry) {
          content = await file.fileRef.entry.getFile();
        }
        getMessageChannel(channelName).port1.postMessage({
          message: 'response-file', 
          mime: helper.getMimeType(file.name),
          content: content,
          resolverUID: event.data.resolverUID,
        });

      } else { 

        let isHasSource = false;
        if (file.content.length > 0) {
          isHasSource = helper.isHasSource(file.content);
        }

        let data = {
          contentLink: drive.apiUrl+'files/'+file.id+'?alt=media',
          source: 'drive',
        };
        
        if (isHasSource) {
          data.contentLink = helper.getRemoteDataContent(file.content).downloadUrl;
          data.source = 'git';
        } else {
          await auth2.init();
          data.accessToken = driveAccessToken;
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
  	let content = await previewHandler.getContent(path, mimeType);
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

	this.fileResponseHandler = async function (e) {
	  
    let channelName = 'preview'; // default
    if (e.data.channelName) {
      channelName = e.data.channelName;
    }
	  switch (e.data.message) {
	    case 'request-path':
        let path = decodeURI(removeParam(e.data.path));
        if(path.endsWith('/')) 
          path += 'index.html';
        let mimeType = helper.getMimeType(path);
        if (helper.isMediaTypeText(path)) {
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
        if (resolvePort) {
          resolvePort();
        }
        break;
	  }
  };

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
    let parentId = await previewHandler.getDirectory(src, relativeParent, path);
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

	this.getContent = async function(src, mimeType) {

    if (src == '/untitled.html') {
    	let content = await replaceTemplate(fileTab[activeTab].editor.env.editor.getValue());
      if (settings.data.editor.divlessHTMLEnabled)
        return divless.replace(content);
      return content;
    }

    let content = '<404></404>';
    let filePathData = await getFileAtPath(src);
    let file = filePathData.file;
    let parentId = filePathData.parentId;
    
    if (file === null) return content;

    if (!file.loaded) {
      aww.pop('Downloading required file : '+file.name);
      fileManager.downloadMedia(file);
      return '';
    } 

    if (file.isTemp && helper.hasFileReference(file.fileRef) && file.content === null) { 

      let targetTab = fileTab.find(item => item.fid == file.fid);
      if (activeFile && activeFile.fid === file.fid) {
        targetTab = fileTab[activeTab];
      }

      let isConvertDivless = ( settings.data.editor.divlessHTMLEnabled && mimeType.match(/text\/html|text\/xml/) );

      // search .divless/* reference files in opened tabs
      try {
        
        if (isConvertDivless) {

          let targetFid = file.fid;
          
          let findTargetTab = fileTab.find(item => item.divlessConvertFileTargetFid == targetFid);
          if (findTargetTab) {
            // cache divless target tab
            targetTab = findTargetTab;
          } else {

            // loop through opened tab, search for .divless/* reference of requested file
            for (let tabData of fileTab) {
    
              if (!tabData.file) continue;

              // check if tab is HTML
              if (!helper.getMimeType(tabData.file.name).match(/text\/html|text\/xml/)) continue;
    
              let currentFile = tabData.file;
    
              // todo: this block was taken from filemanager, create utility function instead.
              {
                let parent = await fileManager.TaskGetFile({fid: currentFile.parentId, type: 'folders'});
                if (parent && parent.name == '.divless' && parent.trashed == false) {
                  let targetDivlessFile = currentFile.divlessTarget;
                  if (!currentFile.divlessTarget) {
                    let files = await fileManager.TaskListFiles(parent.parentId);
                    targetDivlessFile = files.find(file => file.name == currentFile.name && !file.trashed);
                  }
                  if (targetDivlessFile && targetDivlessFile.fid == targetFid) {
                    // set to read content from opened tab
                    targetTab = tabData;
                    tabData.divlessConvertFileTargetFid = targetFid;
                    break;
                  }
                }
              }
    
            }

          }

        }

      } catch (error) {
        console.error(error);
      }
      // end search

      if (targetTab) {

          content = targetTab.editor.env.editor.getValue();
          if (isConvertDivless) {
            content = divless.replace(content);
          }
          return content;

      } else {

        if (file.fileRef.entry) {

          if (!isConvertDivless) {
            return await file.fileRef.entry.getFile();
          }

          // convert divless
          let blob = await file.fileRef.entry.getFile();
          content = await new Promise(resolve => {
            let r = new FileReader();
            r.onload = async function() {
              content = divless.replace(r.result);
              resolve(content)
            }
            r.readAsText(blob);   
          })
          return content;

        }

      }

      return file.fileRef;

    } else {

      let tabIdx = odin.idxOf(file.fid, fileTab, 'fid');
      if (tabIdx >= 0)
        content = (activeFile && activeFile.fid === file.fid) ? fileTab[activeTab].editor.env.editor.getValue() : fileTab[tabIdx].editor.env.editor.getValue();
      else
        content = file.content;

    }
    
    content = await replaceTemplate(content, parentId)
    if (settings.data.editor.divlessHTMLEnabled && mimeType.match(/text\/html|text\/xml/)) {
      content = divless.replace(content);
    }

    return content;

  }

  this.getFrameName = function() {
    let file = activeFile;
    let name = 'preview';
    if (file !== null)
      name = 'preview-'+file.fid;
    return name;
  }

  this.getDirectory = async function(source, parentId, path) {
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
        
        // folder = odin.dataOf(parentId, fileStorage.data.folders, 'fid');
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
            drive.syncFromDrivePartial([folder.id]);
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

  this.getPath = async function() {

    let file;

    if (activeFile != null) {
      file = activeFile;
    }

  	if (typeof(file) == 'undefined') {
  		return 'untitled.html';
  	}

  	let path = [file.name];
  	let parentId = file.parentId;
  	
    while (parentId >= 0) {
  		// let folder = odin.dataOf(parentId, fileStorage.data.folders, 'fid');
  		folder = await fileManager.TaskGetFile({fid: parentId, type: 'folders'});
  		path.push(folder.name);
  		parentId = parseInt(folder.parentId);
  	}
  	return path.reverse().join('/');

  };

  this.setToken = function(token) {
    driveAccessToken = token;
  };

  async function replaceFile(match, body, preParent, path) {
    let src = match[0].substring(11, match[0].length-9);
    let relativeParent = preParent;
    let parentId = await previewHandler.getDirectory(src, relativeParent, path);
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
        let tabIdx = odin.idxOf(file.fid, fileTab, 'fid');
        if (tabIdx >= 0) {
          content = (activeFile && activeFile.fid === file.fid) ? fileTab[activeTab].editor.env.editor.getValue() : fileTab[tabIdx].editor.env.editor.getValue();
        } else {
          content = file.content;

          if (file.isTemp && helper.hasFileReference(file.fileRef) && file.content === null) {
        
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

  this.replaceFile = replaceFile;

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
    return (channelName == 'pwa') ? previewFrame2 : previewFrame1;
  }

  function getMessageChannel(channelName) {
    return (channelName == 'pwa') ? messageChannel2 : messageChannel1;
  }

  function getMessageChannelName() {
    return targetPreviewDomain;
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

  return this;
}
