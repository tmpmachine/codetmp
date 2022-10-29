let previewHandler = new PreviewHandler();

function PreviewHandler() {

  this.portResolver = null;
  this.previewMode = 'normal';
  let driveAccessToken = '';
  let previewFrameResolver = null;
  let PreviewLoadWindow = null;
  let isPreviewFrameLoaded = false;

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

  new Promise(function(resolve) {
    if (isPreviewFrameLoaded) 
      resolve();
    else {
      previewFrameResolver = resolve;
    }
  })
  .then(() => {
      let messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = previewHandler.fileResponseHandler;

      previewLoadWindow.postMessage({ message: 'init-message-port' }, '*', [messageChannel.port2]);
      new Promise(function(resolve) {
        previewHandler.portResolver = resolve;
      })
  });

  if (!isPreviewFrameLoaded)
    previewLoadWindow = window.open(environment.previewUrl, 'PreviewFrame');

  async function responseAsMedia(event, path, mimeType) {

  	let file = (await getFileAtPath(path)).file;
    if (file === null || file === undefined) {
      previewLoadWindow.postMessage({
        message: 'response-file', 
        mime: '',
        content: '<404></404>',
        resolverUID: event.data.resolverUID,
      }, '*');
    } else {

      if (file.isTemp && helper.hasFileReference(file.fileRef) && file.content === null) {
        
        let content = file.fileRef
        if (file.fileRef.entry) {
          content = await file.fileRef.entry.getFile();
        }
        previewLoadWindow.postMessage({
          message: 'response-file', 
          mime: helper.getMimeType(file.name),
          content: content,
          resolverUID: event.data.resolverUID,
        }, '*');

      } else { 

        if (helper.isMediaTypeMultimedia(mimeType)) {
          let data = {
            contentLink: drive.apiUrl+'files/'+file.id+'?alt=media',
            source: 'drive',
          };
        	
          if (helper.isHasSource(file.content)) {
  	    		data.contentLink = helper.getRemoteDataContent(file.content).downloadUrl;
            data.source = 'git';
	      	} else {
            await auth2.init();
            data.accessToken = driveAccessToken;
          }

          previewLoadWindow.postMessage({
            message: 'response-file-multimedia', 
            mime: mimeType,
            content: data,
            resolverUID: event.data.resolverUID,
          }, '*');
        } else {
          previewLoadWindow.postMessage({
            message: 'response-file', 
            mime: mimeType,
            content: new Blob([file.content]),
            resolverUID: event.data.resolverUID,
          }, '*');         
        }
      }
    }
  }

  async function responseAsText(event, path, mimeType) {
  	let content = await previewHandler.getContent(path, mimeType);
    previewLoadWindow.postMessage({
  		message: 'response-file', 
  		mime: mimeType,
  		content: content,
  		resolverUID: event.data.resolverUID,
  	}, '*');
  }

	this.fileResponseHandler = async function (event) {
	  if (event.data.method && event.data.path == '/codetmp/files') {
      switch (event.data.method) {
        case 'POST':
          if (event.data.referrer) {
            let parentDir = previewHandler.getDirectory(event.data.referrer, null, ['root']);
            let file = fileManager.newFile({
              name: event.data.body.name,
              content: event.data.body.content,
              parentId: previewHandler.getDirectory(event.data.body.path, parentDir, ['root']),
            });
            fileManager.sync(file.fid, 'create', 'files');
            drive.syncToDrive();
            fileStorage.save();
            fileManager.list();
          }

          previewLoadWindow.postMessage({
            message: 'response-file', 
            mime: 'text/html;charset=UTF-8',
            content: 'Done.',
            resolverUID: event.data.resolverUID,
          }, '*');
          break;
        case 'PATCH':
          if (event.data.referrer) {
            let parentDir = previewHandler.getDirectory(event.data.referrer, null, ['root']);
            let parentId = previewHandler.getDirectory(event.data.body.path, parentDir, ['root']);
            let files = fileManager.listFiles(parentId);
            let name = event.data.body.path.replace(/.*?\//g,'');
            let isFileFound = false;
            let file;
            for (let i=0; i<files.length; i++) {
              if (files[i].name == name && !files[i].trashed) {
                isFileFound = true;
                file = files[i];
                break;
              }
            }
            if (isFileFound) {
              file.loaded = false;
              fileManager.downloadMedia(file).then(() => {
  		          previewLoadWindow.postMessage({
  		            message: 'response-file', 
  		            mime: 'text/html;charset=UTF-8',
  		            content: 'Updated.',
  		            resolverUID: event.data.resolverUID,
  		          }, '*');
              }).catch(() => {
  	            file.loaded = true;
  				      previewLoadWindow.postMessage({
  		            message: 'response-file', 
  		            mime: 'text/html;charset=UTF-8',
  		            content: 'Update failed.',
  		            resolverUID: event.data.resolverUID,
  		          }, '*');
              })
            }
          }
          break;
        case 'PUT':
          if (event.data.referrer) {
            let parentDir = previewHandler.getDirectory(event.data.referrer, null, ['root']);
            let parentId = previewHandler.getDirectory(event.data.body.path, parentDir, ['root']);
            let files = fileManager.listFiles(parentId);
            let name = event.data.body.path.replace(/.*?\//g,'');
            let isFileFound = false;
            let file;
            for (let i=0; i<files.length; i++) {
              if (files[i].name == name && !files[i].trashed) {
                isFileFound = true;
                file = files[i];
                break;
              }
            }
            if (isFileFound) {
              file.content = event.data.body.content;
              file.modifiedTime = new Date().toISOString();
              fileManager.handleSync({
                fid: file.fid,
                action: 'update',
                metadata: ['media'],
                type: 'files'
              });

              drive.syncToDrive();
              fileStorage.save();
            }
          }

          previewLoadWindow.postMessage({
            message: 'response-file', 
            mime: 'text/html;charset=UTF-8',
            content: 'Done.',
            resolverUID: event.data.resolverUID,
          }, '*');
          break;
      }
    } else {
      let path = decodeURI(removeParam(event.data.path));
      let mimeType = helper.getMimeType(path);
      if (helper.isMediaTypeText(path)) {
        await responseAsText(event, path, mimeType+'; charset=UTF-8');
      } else {
        await responseAsMedia(event, path, mimeType);
      }
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

  this.getFrameName = function() {
    let file = activeFile;
    let name = (this.previewMode == 'inframe') ? 'inframe-preview' : 'preview';
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
  }

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

  this.previewHTML = async function() {
    let filePath = await previewHandler.getPath();
    previewWeb(filePath);
  };

  function previewWeb(filePath) {
    new Promise(function(resolve) {
      if (isPreviewFrameLoaded) 
        resolve();
      else {
        previewFrameResolver = resolve;
      }
    })
    .then(() => {
        let messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = previewHandler.fileResponseHandler;
        previewLoadWindow.postMessage({ message: 'init-message-port' }, '*', [messageChannel.port2]);
        // delayed to focus
        setTimeout(function() {
          window.open(environment.previewUrl+filePath, previewHandler.getFrameName());
        }, 1);
    });
  }

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

  window.addEventListener('message', function(e) {
    if (e.data.message) {
      switch (e.data.message) {
        case 'port-missing':
          let messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = previewHandler.fileResponseHandler;
          previewLoadWindow.postMessage({ message: 'reinit-message-port' }, '*', [messageChannel.port2]);
        break;
        case 'message-port-opened':
          previewHandler.portResolver();
        break;
        case 'preview-frame-isReady':
          isPreviewFrameLoaded = true;
          previewFrameResolver();
          break;
      }
    }

  }, false);

  return this;
}
