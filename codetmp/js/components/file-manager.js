let fileManager = new FileManager();

let navStructure = {
  root: {
    activeFile: null,
    fileTab: [],
    clipBoard: [],
    selectedFile: [],
    activeTab: 0,
    activeFolder: -1,
    breadcrumbs: [{folderId:-1,title:'My Files'}],
  },
};

let navMain = new lsdb('nav-main', navStructure);
let navTemp = new lsdb('nav-temp', navStructure);
let navs = [navMain, navTemp];

for (let key in navStructure.root) {
  Object.defineProperty(window, key, { 
    get: () => navs[activeWorkspace].data[key],
    set: value => navs[activeWorkspace].data[key] = value,
  })
}

function changeWorkspace() {
  if (this.dataset.target != $('#workspace-title').textContent) {
    for (let node of $('.workspace .Btn')) {
      node.classList.toggle('active');
    }
    $('#workspace-title').textContent = this.dataset.target;
    activeWorkspace = parseInt(this.dataset.index);
    fileManager.list();
    listTab();
    if (fileTab.length === 0)
      newTab();
    focusTab(fileTab[activeTab].fid);
    loadBreadCrumbs();
  }
}

function File(data = {}) {
  
  let file = fileStorage.new('files');
  
  let predefinedData = {
    fid: fileStorage.data.counter.files,
    name: 'untitled.html',
    content: fileTab[activeTab].editor.env.editor.getValue(),
    description: ui.fileManager.getDescription(),
    loaded: true,
    parentId: activeFolder,
    modifiedTime: new Date().toISOString(),
  };
  
  for (let key in predefinedData) {
    if (file.hasOwnProperty(key)) {
      file[key] = predefinedData[key];
    }
  }
  
  for (let key in data) {
    if (file.hasOwnProperty(key))
      file[key] = data[key];
  }
  
  fileStorage.data.files.push(file);
  fileStorage.data.counter.files++;
  return file;
}

function Folder(data = {}) {
  
  let file = fileStorage.new('folders');
  
  let predefinedData = {
    fid: fileStorage.data.counter.folders,
    name: 'New Folder',
    parentId: activeFolder,
    modifiedTime: new Date().toISOString(),
  };
  
  for (let key in predefinedData) {
    if (file.hasOwnProperty(key))
      file[key] = predefinedData[key];
  }
  
  for (let key in data) {
    if (file.hasOwnProperty(key))
      file[key] = data[key];
  }
  
  fileStorage.data.counter.folders++;
  fileStorage.data.folders.push(file);
  fileStorage.save();
  return file;
}


function FileManager() {
  
  async function writeToDisk() {
    let writable = await fileTab[activeTab].fileHandle.createWritable();
    let content = fileTab[activeTab].editor.env.editor.getValue();
	if (helper.isMediaTypeHTML(fileTab[activeTab].name) && settings.data.editor.divlessHTMLEnabled) {
      content = divless.replace(content);
    }
    await writable.write(content);
    await writable.close();
    fileTab[activeTab].fiber = 'close';
    $('.icon-rename')[activeTab].textContent = 'close';
  }

  function displayListFolders() {
    let folders = fileManager.listFolders(activeFolder);
    folders.sort(function(a, b) {
      return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
    });
    let counter = 1;
    let downloadQueue = [];
    for (let f of folders) {
      if (f.trashed) continue;
      let el = $('#tmp-folder-list').content.cloneNode(true);
      $('.Name', el)[0].textContent = f.name;
      $('.Clicker', el)[0].setAttribute('title', f.name);
      $('.Clicker', el)[0].setAttribute('data', f.fid);
      $('.Clicker', el)[0].dataset.number = counter;

      $('#file-list').appendChild(el);
      counter++;
      if (!f.isLoaded)
        downloadQueue.push(f.id)
    }
    if (downloadQueue.length > 0) {
      let notifId = notif.add({
        title: 'Loading directory',
      });
      drive.syncFromDrivePartial(downloadQueue).then(() => {
        notif.update(notifId, {content:'Done'}, true);
      });
    }
  }
  
  function traversePath(parentId, path = []) {
    if (parentId === -1)
      return path;
    let folder = odin.dataOf(parentId, fileStorage.data.folders, 'fid');
    path.push(folder.name);
    return traversePath(folder.parentId, path);
  }

  this.getFullPath = function(file) {
    let path = traversePath(file.parentId).reverse();
    path.push(file.name);
    return path.join('/');
  }

  this.listFiles = function(parentId) {
    return odin.filterData(parentId, fileStorage.data.files, 'parentId');
  }

  this.listFolders = function(parentId, column = 'parentId') {
    return odin.filterData(parentId, fileStorage.data.folders, column);
  }

  function displayListFiles() {
    let files = fileManager.listFiles(activeFolder);
    files.sort(function(a, b) {
      return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
    });
    let counter = 1;
    for (let {fid, id, isTemp, name, trashed, fileRef} of files) {
      if (trashed) continue;
      
      let el = $('#tmp-file-list').content.cloneNode(true);
      $('.Name', el)[0].textContent = name;
      $('.Icon', el)[0].style.color = helper.getFileIconColor(name);
      $('.Clicker', el)[0].setAttribute('title', name);
      $('.Clicker', el)[0].setAttribute('data', fid);
      $('.Clicker', el)[0].dataset.fid = fid;
      $('.Clicker', el)[0].dataset.number = counter;

      if (isTemp) {
        if (fileRef.name === undefined && id.length === 0) {
          $('.Label', el)[0].textContent = 'missing link (!)';
          $('.Preview-icon', el)[0].textContent = 'broken_image';
        } else {
          if (fileRef.entry !== undefined) {
            $('.Label', el)[0].textContent = 'local';
            $('.Preview-icon', el)[0].textContent = 'attach_file';
          }
        }
      }
      
      $('#file-list').appendChild(el);
      counter++;
    }
  }

  this.downloadDependencies = function(file, source) {
    return new Promise((resolve, reject) => {
      if (source.origin == 'git')
        git.downloadFile(source.downloadUrl).then(resolve);
      else
        drive.downloadDependencies(file).then(resolve).catch(reject);
    });
  }

  this.downloadMedia = function(file) {
    return new Promise(resolve => {
      
      let notifId = notif.add({
        title: 'Downloading media',
        content: `file: ${file.name}`,
      });
      
      aww.pop('Downloading required file : '+file.name);
      let source = {};
      if (helper.isHasSource(file.content)) {
        source = helper.getRemoteDataContent(file.content);
      }
      fileManager.downloadDependencies(file, source).then(content => {
        file.content = content;
        file.loaded = true;
        file.isTemp = false;

        if (source.origin == 'git') {
          handleSync({
            fid: file.fid,
            action: 'update',
            metadata: ['media', 'description'],
            type: 'files'
          });
          drive.syncToDrive();
        }
        fileStorage.save();

        if (helper.isHasSource(content)) {
          fileManager.downloadMedia(file).then(() => {
            notif.update(notifId,{content:`file: ${file.name} (done)`}, true);
            resolve();
          });
        } else {
          aww.pop('Successfully download required file: '+file.name);
          notif.update(notifId,{content:`file: ${file.name} (done)`}, true);
          resolve();
        }
      }).catch(errMsg => {
        notif.update(notifId, {
          title: 'Downloading failed',
          content: `file: ${file.name}.<br>Error : ${errMsg}`,
        }, true);
      })
    });
  }
  
  this.sync = function(data) {
    handleSync(data);
  };

  this.getDescription = function() {
    let data = {};
    for (let desc of $('.description')) {
      if ((['text','hidden','textarea'].includes(desc.type) && desc.value.length === 0) ||
      (desc.type == 'checkbox' && !desc.checked)) continue;
      data[desc.getAttribute('name')] = (desc.type == 'checkbox') ? desc.checked : desc.value;
    }
    return JSON.stringify(data);
  };
  
  this.openLocal = async function(event) {
    if (typeof(window.showOpenFilePicker) !== 'undefined') {
      event.preventDefault();
      let [entry] = await window.showOpenFilePicker();
  		entry.getFile().then(r => {
  			r.text().then(r => {
  				newTab(-1, {
  					fid: '-' + (new Date).getTime(),
  					name: entry.name,
  					editor: initEditor(r),
  					content: r,
  					fileHandle: entry,
  				});
  			});
  		});
    }
  };
  
  function saveAsNewFile() {
  	let fileName = $('.file-name')[activeTab].textContent;
    modal.prompt('File name', fileName, '', helper.getFileNameLength(fileName)).then(name => {
      if (!name) 
      	return;
      
      let file = new File({
        name,
      });
      fileManager.sync({
        fid: file.fid, 
        action: 'create', 
        type: 'files',
      });
      drive.syncToDrive();
      fileManager.list();
      fileStorage.save();
      
      let scrollTop = fileTab[activeTab].editor.env.editor.getSession().getScrollTop();
      let row = fileTab[activeTab].editor.env.editor.getCursorPosition().row;
      let col = fileTab[activeTab].editor.env.editor.getCursorPosition().column;
      
      confirmCloseTab(false);
      newTab(activeTab, {
        fid: file.fid,
        name: file.name,
        fiber: 'close',
        file: file,
        editor: initEditor(file.content, scrollTop, row, col),
      });

    }).catch(() => {
      fileTab[activeTab].editor.env.editor.focus();
    });
  }

  function saveExistingFile() {
    activeFile.content = fileTab[activeTab].editor.env.editor.getValue();
    activeFile.modifiedTime = (new Date()).toISOString();
    activeFile.description = ui.fileManager.getDescription();
    handleSync({
      fid: activeFile.fid,
      action: 'update',
      metadata: ['media', 'description'],
      type: 'files'
    });
    drive.syncToDrive();
    fileStorage.save();
    fileTab[activeTab].fiber = 'close';
    $('.icon-rename')[activeTab].textContent = 'close';
  }

  this.save = function() {
    if (fileTab[activeTab].fileHandle !== null) {
        writeToDisk();
    } else {
      if (activeFile === null) {
      	saveAsNewFile();
      } else {
        saveExistingFile();
      }
    }
  };
  
  this.list = function() {
    $('#file-list').innerHTML = '';
    displayListFolders();
    $('#file-list').appendChild(o.element('div', { style: 'flex: 0 0 100%', class: 'separator w3-padding-small' }));
    displayListFiles();
    loadBreadCrumbs();
    selectedFile.splice(0, 1);
    ui.toggleFileActionButton();
  };

  function getFileContent(file) {
    return new Promise(resolve => {
      if (typeof(file.fileRef.name) != 'undefined' && file.content === null) {
        file.fileRef.text().then(content => {
          resolve(content);
        })
      } else {
        resolve(file.content);
      }
    })
  }
  
  this.get = function(data) {
    let haystack = (data.type == 'files') ? fileStorage.data.files : fileStorage.data.folders; 
    if (data.id !== undefined)
      return odin.dataOf(data.id, haystack, 'id')
    else if (data.fid !== undefined)
      return odin.dataOf(data.fid, haystack, 'fid')
  }

  function getFileHandle(file) {
    if (typeof(file.fileRef.name) != 'undefined') {
      if (typeof(file.fileRef.entry) != 'undefined') {
        return file.fileRef.entry;
      }
    }
    return null;
  }

  function openOnEditor(f) {
    activeFile = f;
    if (fileTab.length == 1 && fileTab[activeTab].editor.env.editor.getValue().length == 0 && String(fileTab[0].fid)[0] == '-')
      confirmCloseTab(false);

    getFileContent(f).then(content => {
      let idx = odin.idxOf(f.fid, fileTab, 'fid')
      if (idx < 0) {
        newTab(fileTab.length, {
          fid: f.fid,
          editor: initEditor(content),
          name: f.name,
          fiber: 'close',
          file: f,
          fileHandle: getFileHandle(f),
        });
      } else {
        fileTab[activeTab].content = fileTab[activeTab].editor.env.editor.getValue();
        focusTab(f.fid, false);
      }
      
    if ($('#btn-menu-my-files').classList.contains('active'))
        $('#btn-menu-my-files').click();
  
      openDevelopmentSettings(f.description);
    })
  }

  this.open = function(fid) {
    let f = fileManager.get({fid, type: 'files'});
    let mimeType = helper.getMimeType(f.name);

    new Promise(function(resolve, reject) {
      let isMediaTypeMultimedia = helper.isMediaTypeMultimedia(mimeType);
  	  if (f.loaded || isMediaTypeMultimedia) {
  	    resolve();
  	  } else {
  	    if (f.isTemp && f.content === null && f.id === '') {
  	    	reject(404)
  	    } else {
  	    	fileManager.downloadMedia(f).then(resolve);
  	    }
  	  }
  	}).then(() => {
      let isMediaTypeText = helper.isMediaTypeText(f.name);
      let isMediaTypeStream = helper.isMediaTypeStream(f.name);
      if (isMediaTypeText || isMediaTypeStream) {
     	  openOnEditor(f);
      } else {
        ui.previewMedia(f, mimeType);
      }
    }).catch(function(error) {
      if (error === 404) {
	      let notifId = notif.add({title: 'Failed to open file', content: 'Missing file link : '+f.name});
	      setTimeout(() => notif.update(notifId, {}, true), 3000);
      } else {
      	aww.pop('Could not download file');
      }
    });
  };

  this.getPreviewLink = function(f) {
    return new Promise(async (resolve, reject) => {

      let src = f.contentLink;

      if (f.fileRef.name !== undefined) {
        src = URL.createObjectURL(f.fileRef);
      } else {
        if (helper.isHasSource(f.content)) {
          src = helper.getRemoteDataContent(f.content).downloadUrl;
        } else {
          if (f.id.length > 0 && src.length === 0) {
            let contentLink = await drive.getWebContentLink(f.id);
            f.contentLink = contentLink;
            src = contentLink;
            fileStorage.save();
          }
        }
      }

      if (src.length === 0)
        reject();
      else
        resolve(src);
    });
  }

  function folderToZip(container, folder, fileRequests, options) {
    return new Promise(async resolve => {

      let folders = fileManager.listFolders(container.fid);
      let files = fileManager.listFiles(container.fid);
      for (let f of folders) {
        if (f.trashed)
          continue;
        let subFolder = folder.folder(f.name);
        await insertTreeToBundle(f, subFolder, fileRequests, options);
      }
      for (let f of files) {
        if (f.trashed)
          continue;
        if (f.fileRef.name !== undefined) {
          folder.file(f.name, f.fileRef, {binary: true});
        } else {
          fileRequests.push({f, folder, options})
        }
      }
      resolve();

    })
  }

  function insertTreeToBundle(container, folder, fileRequests, options) {
    return new Promise(resolve => {
      
      if (container.id.length > 0) {
        if (container.isLoaded) {
          folderToZip(container, folder, fileRequests, options).then(resolve);
        } else {
          drive.syncFromDrivePartial([container.id]).then(async () => {
            folderToZip(container, folder, fileRequests, options).then(resolve);
          });
        }
      } else {
        folderToZip(container, folder, fileRequests, options).then(resolve);
      }

    })
  }

  function getReqFileContent(f, options) {
	  	return new Promise(resolve => {

            if (f.fileRef.name !== undefined) {
              resolve(f.fileRef);
              return
         	}

		    let mimeType = helper.getMimeType(f.name);
		      
		      if (f.loaded) {
            
            	let content = f.content;
              if (needReplaceFileTag(f, options))
                content = replaceFileTag(content, f.parentId);
	          	if (needConvertDivless(f, options)) 
	              content = divless.replace(content);
              
        		resolve(new Blob([content], {type: mimeType}));

		      } else {

			      if (helper.isHasSource(f.content)) {
		        	let source = helper.getRemoteDataContent(f.content);
		        	if (needConvertDivless(f, options) || needReplaceFileTag(f, options)) {
				      	fetch(source.downloadUrl).then(r => r.text()).then(content => {
                  if (options.replaceFileTag)
                    content = replaceFileTag(content, f.parentId);
					         content = divless.replace(content);
			        		 resolve(new Blob([content], {type: mimeType}));
				      	});
			      	} else { 
				      	fetch(source.downloadUrl).then(r => r.blob()).then(resolve);
              }
			      } else {
			        drive.downloadDependencies(f, 'blob').then(blob => {
				      	let firstBytes = blob.slice(0, 12);
			        	let r = new FileReader();
    						r.onload = function() {
    							if (r.result == '/*RD-start*/')  {
    								let r = new FileReader();
    								r.onload = function() {
    			        		let source = helper.getRemoteDataContent(r.result);
    			        		if (needConvertDivless(f, options) || needReplaceFileTag(f, options)) { 
    						      	fetch(source.downloadUrl).then(r => r.text()).then(content => {
                            if (options.replaceFileTag)
                              content = replaceFileTag(content, f.parentId);
    					          		resolve(new Blob([divless.replace(content)], {type:blob.type}));
    						      	});
    					      	} else {
    					      		fetch(source.downloadUrl).then(r => r.blob()).then(resolve);
                      }
    								}
    								r.readAsText(blob);			
    							} else {
    								if (needConvertDivless(f, options)) {
  							      let r = new FileReader();
    									r.onload = function() {
    							          resolve(new Blob([divless.replace(r.result)], {type:blob.type}));
    						        	}
    									r.readAsText(blob);				      		
				        		} else {
					        		resolve(blob);
				        		}
    							}
    						}
    						r.readAsText(firstBytes);
			        });
			      }
		      }
	  	});
  }
  this.getReqFileContent = getReqFileContent;

  function needConvertDivless(f, options) {
  	if (helper.isMediaTypeHTML(f.name) && options.replaceDivless)
  		return true;
  	return false;
  }

  function needReplaceFileTag(f, options) {
    if (helper.isMediaTypeHTML(f.name) && options.replaceFileTag)
      return true;
    return false;
  }

  this.createBundle = function(selectedFile, zip, options) {
  	return new Promise(async (resolve) => {

      let notifId = notif.add({title: 'Bundling files ...'});
  		let fileRequests = [];

  		 for (let file of selectedFile) {
          if (file.dataset.type == 'folder') {
            let f = fileManager.get({fid: Number(file.getAttribute('data')), type: 'folders'})
            let folder = zip.folder(f.name);
            await insertTreeToBundle(f, folder, fileRequests, options);
          } else if (file.dataset.type == 'file') {
            let f = fileManager.get({fid: Number(file.getAttribute('data')), type: 'files'})
            if (f.trashed)
            	continue;
            if (f.fileRef.name !== undefined) {
              	zip.file(f.name, f.fileRef, {binary: true});
            } else {
    		    	fileRequests.push({f, folder: zip, options})
            }
          }
        }

    	let countError = 0;
     	handleRequestChunks(fileRequests, () => {
        notif.update(notifId, {}, true);        
        notifId = notif.add({title: 'Downloading your files ...'});
        notif.update(notifId, {}, true);        
        resolve();
      }, countError);
  	});
  }

  function replaceFileTag(content, parentId) {
    let preParent = -1
    let match = getMatchTemplate(content);
    while (match !== null) {
      let searchPath = JSON.parse(JSON.stringify(path = ['root']));
      content = replaceFile(match, content, parentId, searchPath);
      match = getMatchTemplate(content);
    }
    return content;
  }
  this.replaceFileTag = replaceFileTag;

  this.downloadSingle = function(file, options) {
    return new Promise(resolve => {

        let f = fileManager.get({fid: Number(file.getAttribute('data')), type: 'files'})
        new Promise(resolveReader => {

            if (f.fileRef.name !== undefined) {
              resolveReader(f.fileRef);
            } else {
              getReqFileContent(f, options).then(blob => {
                resolveReader(blob);
              })
            }

        }).then(blob => {

          let firstBytes = blob.slice(0, 12);
          let r = new FileReader();
          let mimeType = helper.getMimeType(f.name);
          r.onload = function() {
            if (r.result == '/*RD-start*/')  {
              let r = new FileReader();
              r.onload = function() {
                let source = helper.getRemoteDataContent(r.result);
                if (needConvertDivless(f, options) || needReplaceFileTag(f, options)) { 
                  fetch(source.downloadUrl).then(r => r.text()).then(content => {
                      if (options.replaceFileTag)
                        content = replaceFileTag(content, f.parentId);
                      resolve(new Blob([divless.replace(content)], {type:blob.type}));
                  });
                } else {
                  fetch(source.downloadUrl).then(r => r.blob()).then(resolve);
                }
              }
              r.readAsText(blob);     
            } else {
              if (needConvertDivless(f, options) || needReplaceFileTag(f, options)) { 
                let r = new FileReader();
                r.onload = function() {
                  let content = r.result;
                  if (options.replaceFileTag)
                    content = replaceFileTag(content, f.parentId);
                  resolve(new Blob([divless.replace(content)], {type:blob.type}));
                }
                r.readAsText(blob);                 
              } else {
                resolve(blob);
              }
            }
          }
          r.readAsText(firstBytes);
          
        })
    });
  }

  function handleRequestChunks(requests, resolveZip, countError) {
  	if (requests.length > 0) {
  		let request = requests[0];
      let notifId = notif.add({title:'Downloading '+request.f.name, content: 'In progress'});
  		getReqFileContent(request.f, request.options).then(content => {
  			requests.shift();
        notif.update(notifId, {content:'Done'}, true);
  			handleRequestChunks(requests, resolveZip, countError);
  	     request.folder.file(request.f.name, content);
  		}).catch(() => {
  			requests.shift();
        notif.update(notifId, {content:'Failed'}, true);
  			handleRequestChunks(requests, resolveZip, countError+1);
  		})
  	} else {
  		if (countError > 0)
  			alert('There is an error while downloading files. You might want to redownload some files');
  		resolveZip();
  	}
  }

  this.getExistingItem = function(name, parentId, type = 'file') {
    let haystack;
    if (type == 'file')
      haystack = fileManager.listFiles(parentId);
    else
      haystack = fileManager.listFolders(parentId);

    for (var i=0; i<haystack.length; i++) {
      if (haystack[i].trashed)
        continue;
      if (haystack[i].name === name) {
        return haystack[i];
      }
    }
    return null;
  }

  this.getDuplicateName = function(parentId, name, type = 'file', originalName = '', duplicateCount = 1) {
    if (originalName == '')
      originalName = name;
    let existing = this.getExistingItem(name, parentId, type);
    if (existing !== null) {
        let ext = '';
        var arr = originalName.split('.');
        if (arr.length > 1) {
          ext = '.'+arr.pop();
        }
        return this.getDuplicateName(parentId, arr.join('.')+' ('+duplicateCount+')'+ext, type, originalName, duplicateCount+1);
    }
    return name;
  }

  this.openFolder = function(folderId) {
    activeFolder = folderId;
    
    if (activeFolder == -1) {
      breadcrumbs.splice(1);
    } else {
      let folder = fileManager.get({fid: folderId, type: 'folders'});
      title = folder.name;
      breadcrumbs.push({folderId:activeFolder, title: title})
    }
    
    fileManager.list();
  }
}

function handleSync(sync) {
  
  if (sync.action === 'create' || sync.action === 'copy') {
    sync.metadata = [];
    fileStorage.data.sync.push(sync);
  } else if (sync.action === 'update') {
    // Reduce request load by merging, modifying, and swapping sync request.
    // Do not reorder sync with type of files to prevent file being created before parent directory.
    fileStorage.data.sync.push(sync);
    
    for (let i=0; i<fileStorage.data.sync.length-1; i++) {
      let s = fileStorage.data.sync[i];
      
      if (s.fid === sync.fid && s.type == sync.type) {
        switch (s.action) {
          case 'create':
          case 'copy':
            if (!sync.metadata.includes('trashed')) {
              if (sync.type == 'files') {
                fileStorage.data.sync.splice(i, 1);
                sync.action = s.action;
                sync.metadata = [];
              }
            }
            break;
          case 'update':
            for (let meta of s.metadata) {
              if (sync.metadata.indexOf(meta) < 0)
                sync.metadata.push(meta);
                
              if (meta === 'parents')
                sync.source = s.source;
            }
            if (sync.type == 'files') 
              fileStorage.data.sync.splice(i, 1);
            break;
        }
        break;
      }
    }
  } else if (sync.action === 'delete') {
    for (let i=0; i<fileStorage.data.sync.length; i++) {
      if (fileStorage.data.sync[i].fid === sync.fid)
        fileStorage.data.sync.splice(i, 1);
    }
  }
}


function getFileAtPath(path, parentId = -1) {
    
  while (path.match('//'))
    path = path.replace('//','/');
  
  let dir = path.split('/');
  let folder;
  
  while (dir.length > 1) {
    
    if (dir[0] === '..' || dir[0] === '.'  || dir[0] === '') {
      
      folder = fileManager.get({fid: parentId, type: 'folders'});
      if (folder === undefined)
        break;
      dir.splice(0, 1);
      parentId = folder.parentId;
    } else {
      
      let folders = fileManager.listFolders(parentId);
      folder = odin.dataOf(dir[0], folders, 'name');
      if (folder) {
        parentId = folder.fid;
        dir.splice(0, 1);
      } else {
        parentId = -2;
        break;
      }
    }
  }
  
  let fileName = path.replace(/.+\//g,'')
  let files = fileManager.listFiles(parentId);
  let found = files.find(file => file.name == fileName);
  return found;
}



function publishToBlog(self) {
  
  function callback(e) {
    if (e == 404)
      aww.pop('error 404');
    else if (e == 400)
      aww.pop('error: 400');
    else
      aww.pop('Published.');
  }

  function getTabContent() {
    let tabTitle = $('.file-tab-name')[activeTab].textContent;
    let content = fileTab[activeTab].editor.env.editor.getValue();
    content = fileManager.replaceFileTag(content, fileTab[activeTab].file.parentId);
    if (settings.data.editor.divlessHTMLEnabled) {
      if (typeof(divless) != 'undefined') {
        if (helper.getMimeType(tabTitle).match(/^text\/html|text\/xml/)) {
          if (settings.data.editor.divlessHTMLEnabled)
            content = divless.replace(content);
        }
      }
    }
    return content;
  }

  let form = self.target;
  if (form.blogId) {
      aww.pop('Publishing...');
      let content = getTabContent();
      oblog.config({ 
        blogId: form.blogId.value,
      });

      if (form.entryId.value.trim().length === 0) {
        oblog[form.postType.value].insert({
          content,
          title: form.postTitle.value
        }, callback)
      } else {
        let data = {
          content,
        };
        if (form.option.checked)
          data.title = form.postTitle.value
        oblog[form.postType.value].patch(form.entryId.value.trim(), data, callback)
      }
  } else {
    aww.pop('No blog selected');
  }
}

(function() {

  function getBlogId(file, blogName) {
    aww.pop('Retrieving blog id ...');
    oblog.config({ blog: blogName});
    oblog.getBlogId(blogId => {
      let settings = helper.parseDescription(file.description);
      settings.blogId = blogId;
      file.description = JSON.stringify(settings);
      if (locked < 0)
        $('#in-blog-id').value = blogId;
      fileManager.save();
      deploy();
    });
  }
  
  function deploy() {
    
    let data = (locked >= 0) ? fileManager.get({fid: locked, type: 'files'}) : activeFile;
    let {blogName, blogId, entryId} = helper.parseDescription(data.description);

    if (blogName && entryId) {
      
      if (!blogId) {
        getBlogId(data, blogName);
        return;
      }
      
      aww.pop('Publishing...');
      
      let content = uploadBody;
      
      let type = 'posts';
      if (entryId.startsWith('p')) {
        entryId = entryId.substring(1);
        type = 'pages';
      }

      oblog.config({ blog: blogName });
      oblog[type].patch(entryId, {
        content
      }, e => {
        if (e == 404)
          aww.pop('404');
        else if (e == 400)
          aww.pop('400');
        else
          aww.pop('Published.');
      })
    } else {
      alert('Please set blog name and entry ID.');
    }
  }
  
  window.deploy = deploy;
  
})();


function trashList() {
  
  var el;
  $('#list-trash').innerHTML = '';
  
  let folders = odin.filterData(true, fileStorage.data.folders, 'trashed');
  
  folders.sort(function(a, b) {
    return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
  });

  for (let f of folders) {
    el = o.element('div',{innerHTML:o.template('tmp-list-folder-trash', f)});
    $('#list-trash').appendChild(el);
  }
  
  $('#list-trash').appendChild(o.element('div', {style:'flex:0 0 100%;height:16px;'}));
  
  let files = odin.filterData(true, fileStorage.data.files, 'trashed');
  
  files.sort(function(a, b) {
    return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
  });
  
  for (let {fid, name, trashed} of files) {
    let clsLock = '';
    let iconColor = helper.getFileIconColor(name);
      
    if (fid === locked)
      clsLock = 'w3-text-purple';
    
    el = o.element('div',{ innerHTML: o.template('tmp-list-file-trash', {
      fid,
      name,
      iconColor,
      clsLock
    }) });
    
    $('#list-trash').appendChild(el);
  }
}