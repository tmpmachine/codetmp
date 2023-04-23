let previewHandler = new PreviewHandler();

function PreviewHandler() {

  this.portResolver = null;
  this.previewMode = 'normal';
  let driveAccessToken = '';
  let targetPreviewDomain = '';
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

  let messageChannel;
  let resolvePort;
  let SELF = {};
  
  async function delayWindowFocus() {
    return new Promise(resolve => window.setTimeout(resolve, 1));
  }

  this.previewPathAtPWA = function() {
    let targetPreviewDomain = 'PWA';
    SELF.previewPath(null, targetPreviewDomain);
  }

  let isPortOpened = false;
  SELF.previewPath = this.previewPath = async function(requestPath, _targetPreviewDomain = '') {
    targetPreviewDomain = _targetPreviewDomain;
    if (!requestPath) {
      requestPath = await previewHandler.getPath();
    }
    // if (!frameName) {
      // frameName = previewHandler.getFrameName();
    // }
    if (isPortOpened) {
      let url = environment.previewUrl + requestPath;
      if (targetPreviewDomain == 'PWA') {
        url = environment.previewUrlPWA + requestPath;
      }

      await delayWindowFocus();
      window.open(url, '_blank', 'noopener');
      testConnection()
      .catch(() => {
        isPortOpened = false;
        SELF.previewPath(requestPath);
      });
    } else {
      
      new Promise(resolve => {
        resolvePort = resolve;
      }).then(() => {
        SELF.previewPath(requestPath);
      });
      
      messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = previewHandler.fileResponseHandler;
      getPreviewFrame().postMessage({ message: 'reinit-message-port' }, '*', [messageChannel.port2]);
      // await delayWindowFocus();
      // window.open(environment.previewUrl, '_blank', 'noopener');
    }
  };
  
  let testConnectionResolver;
  async function testConnection() {
    return new Promise((resolve, reject) => {
      testConnectionResolver = resolve;
      messageChannel.port1.postMessage({
        message: 'test-connection', 
      });
      window.setTimeout(() => {
        reject();
      }, 120);
    });
  }

  async function responseAsMedia(event, path, mimeType) {

  	let file = (await getFileAtPath(path)).file;
    if (file === null || file === undefined) {
      messageChannel.port1.postMessage({
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
        messageChannel.port1.postMessage({
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

        messageChannel.port1.postMessage({
          message: 'response-file-multimedia', 
          mime: mimeType,
          content: data,
          resolverUID: event.data.resolverUID,
        });
        
      }
    }
  }

  async function responseAsText(event, path, mimeType) {
  	let content = await previewHandler.getContent(path, mimeType);
    if (typeof Terser != 'undefied' && mimeType == "text/javascript; charset=UTF-8" && settings.data.editor.minifyJs) {
      try {
        let result = await Terser.minify(content, { sourceMap: false });
        content = result.code;
      } catch (e) {
        console.log(e)
      }
    }
    messageChannel.port1.postMessage({
  		message: 'response-file', 
  		mime: mimeType,
  		content: content,
  		resolverUID: event.data.resolverUID,
  	});
  }

	this.fileResponseHandler = async function (e) {
	  
	  switch (e.data.message) {
	    case 'request-path':
        let path = decodeURI(removeParam(e.data.path));
        let mimeType = helper.getMimeType(path);
        if (helper.isMediaTypeText(path)) {
          await responseAsText(e, path, mimeType+'; charset=UTF-8');
        } else {
          await responseAsMedia(e, path, mimeType);
        }
	      break;
      case 'test-connection':
        messageChannel.port1.postMessage({
          message: 'resolve-test-connection', 
        });
        break;
	    case 'resolve-test-connection':
        testConnectionResolver();
	      break;
	    case 'message-port-opened':
        isPortOpened = true;
        if (resolvePort) {
          resolvePort();
        }
        break;
	  }
  };

  async function getFileAtPath(src) {
    let preParent = activeFolder;
    let relativeParent = preParent;
    let path = ['root'];
    let parentId = await previewHandler.getDirectory(src, relativeParent, path);
    let files = await fileManager.listFiles(parentId);
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
    let filePath = await getFileAtPath(src);
    let file = filePath.file;
    let parentId = filePath.parentId;

    if (file !== null) {
      if (file.isTemp && helper.hasFileReference(file.fileRef) && file.content === null) {    
        let tabIdx = odin.idxOf(file.fid, fileTab, 'fid');
        if (file.fileRef.entry) {
          if (tabIdx >= 0) {
            content = (activeFile && activeFile.fid === file.fid) ? fileTab[activeTab].editor.env.editor.getValue() : fileTab[tabIdx].editor.env.editor.getValue();
            if (settings.data.editor.divlessHTMLEnabled && mimeType.match(/text\/html|text\/xml/)) {
              content = divless.replace(content);
            }
            return content;
          }
          return await file.fileRef.entry.getFile();
        }
        if (tabIdx >= 0) {
            content = (activeFile && activeFile.fid === file.fid) ? fileTab[activeTab].editor.env.editor.getValue() : fileTab[tabIdx].editor.env.editor.getValue();
            if (settings.data.editor.divlessHTMLEnabled && mimeType.match(/text\/html|text\/xml/)) {
              content = divless.replace(content);
            }
            return content;
        }
        return file.fileRef;
      } else if (!file.loaded) {
        aww.pop('Downloading required file : '+file.name);
        fileManager.downloadMedia(file);
	        content = '';
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
    }
    return content;
  }

  // this.getFrameName = function() {
  //   let file = activeFile;
  //   let name = (this.previewMode == 'inframe') ? 'inframe-preview' : 'preview';
  //   if (file !== null)
  //     name = 'preview-'+file.fid;
  //   return name;
  // }

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
        folder = await fileManager.get({fid: parentId, type: 'folders'});
        if (folder === undefined) {
          break;
        }
        path.pop();
        parentId = folder.parentId;
      } else {
        
        let folders = await fileManager.listFolders(parentId);
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
  		folder = await fileManager.get({fid: parentId, type: 'folders'});
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
    let files = await fileManager.listFiles(parentId);
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
        if (tabIdx >= 0)
          content = (activeFile && activeFile.fid === file.fid) ? fileTab[activeTab].editor.env.editor.getValue() : fileTab[tabIdx].editor.env.editor.getValue();
        else
          content = file.content;
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

  function getPreviewFrame() {
    return (targetPreviewDomain == 'PWA') ? previewFrame2 : previewFrame1;
  }

  window.addEventListener('message', function(e) {
    if (e.data.message) {
      switch (e.data.message) {
        case 'port-missing':
          messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = previewHandler.fileResponseHandler;
          getPreviewFrame().postMessage({ message: 'reinit-message-port' }, '*', [messageChannel.port2]);
          break;
        case 'preview-frame-isReady':
          messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = previewHandler.fileResponseHandler;
          getPreviewFrame().postMessage({ message: 'init-message-port' }, '*', [messageChannel.port2]);
          break;
      }
    }

  }, false);

  return this;
}
