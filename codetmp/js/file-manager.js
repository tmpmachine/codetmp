let fileManager = new FileManager();
let activeFile;
let activeFolder = -1;

let lastClickEl;
let selectedFile = [];
let clipBoard = [];
let doubleClick = false;

let fileTab = [];
let activeTab = 0;

let breadcrumbs = [{folderId:'-1',title:'My Files'}];

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
    if (settings.data.editor.divlessHTMLEnabled) {
      content = divless.replace(content);
    }
    await writable.write(content);
    await writable.close();
    $('.icon-rename')[activeTab].textContent = 'close';
  }

  function displayListFolders() {
    let folders = fileManager.listFolders(activeFolder);
    folders.sort(function(a, b) {
      return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
    });
    for (let f of folders) {
      if (f.trashed) continue;
      let el = o.cel('div',{innerHTML:o.creps('tmp-folder-list',f)});
      $('#file-list').appendChild(el);
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
    $('#file-list').appendChild(o.cel('div', { style: 'flex: 0 0 100%', class: 'w3-padding-small' }));
    let files = fileManager.listFiles(activeFolder);
    files.sort(function(a, b) {
      return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
    });
    for (let {fid, isTemp, name, trashed, fileRef} of files) {
      if (trashed) continue;
      
      let clsLock = '';
      let defaultBg = '#777';
      
      defaultBg = getFileColor(name);
        
      if (fid === locked)
        clsLock = 'w3-text-purple';
      
      let el = o.cel('div',{ innerHTML: o.creps('tmp-file-list', {
        fid,
        name,
        defaultBg,
        clsLock
      }) });

      if (isTemp) {
        if (fileRef.name === undefined) {
          $('.Label', el)[0].textContent = 'missing link (!)';
          $('.Icon', el)[0].textContent = 'broken_image';
        } else {
          if (fileRef.entry !== undefined) {
            $('.Label', el)[0].textContent = 'local';
            $('.Icon', el)[0].textContent = 'attach_file';
          }
        }
      }
      
      $('#file-list').appendChild(el);
    }
  }

  this.downloadDependencies = function(file, source) {
    return new Promise(resolve => {
      if (source.origin == 'git')
        git.downloadFile(source.downloadUrl).then(resolve);
      else
        drive.downloadDependencies(file).then(resolve);
    });
  }

  this.downloadMedia = function(file) {
    return new Promise(resolve => {
      aww.pop('Downloading required file : '+file.name);
      let source = {};
      if (helper.isHasSource(file.content)) {
        source = helper.getRemoteDataContent(file.content);
      }
      fileManager.downloadDependencies(file, source).then(content => {
        file.content = content;
        file.loaded = true;

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
          fileManager.downloadMedia(file).then(resolve)
        } else {
          aww.pop('Successfully download required file: '+file.name);
          resolve();
        }
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
  
  function saveUntitled() {
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

  this.save = function() {
    
    let modifiedTime = new Date().toISOString();
    if (activeFile === undefined) {
      if (fileTab[activeTab].fileHandle !== null) {
        writeToDisk()
      } else {
      	saveUntitled();
      }
    } else {
      
      if (fileTab[activeTab].fileHandle !== null) {
        writeToDisk()
      } else {
        activeFile.content = fileTab[activeTab].editor.env.editor.getValue();
        activeFile.modifiedTime = modifiedTime;
        activeFile.description = ui.fileManager.getDescription();
        handleSync({
          fid: activeFile.fid,
          action: 'update',
          metadata: ['media', 'description'],
          type: 'files'
        });
        drive.syncToDrive();
        fileStorage.save();
        $('.icon-rename')[activeTab].textContent = 'close';
      }

    }
  };
  
  this.list = function() {
    
    $('#file-list').innerHTML = '';
    
    displayListFolders();
    displayListFiles();
    loadBreadCrumbs();
    
    selectedFile.splice(0, 1);
    ui.setFileActionButton();
  };

  function getFileContent(file) {
    return new Promise(resolve => {
      if (file.content.length == 0 && file.fileRef.name !== undefined) {
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
    if (file.fileRef.name !== undefined) {
      if (file.fileRef.entry !== undefined)
        return file.fileRef.entry;
    }
    return null;
  }

  this.open = function(fid) {
    
    let f = fileManager.get({fid, type: 'files'});
    let isMediaTypeText = helper.isMediaTypeText(f.name);

    new Promise(function(resolve, reject) {
            
  	  if (f.loaded || !isMediaTypeText) {
  	    resolve();
  	  } else {
  	    fileManager.downloadMedia(f).then(resolve);
  	  }
  	  
  	}).then(() => {
      
      if (isMediaTypeText) {
        
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

      } else {
        
        previewMedia(fileManager.getFullPath(f));

      }
    	
    }).catch(function(error) {
      L(error);
      aww.pop('Could not download file');
    });
  };

  function insertTreeToBundle(container, folder) {
    let folders = fileManager.listFolders(container.fid);
    let files = fileManager.listFiles(container.fid);
    for (let f of folders) {
        let subFolder = folder.folder(f.name);
        insertTreeToBundle(f, subFolder)
    }
    for (let f of files) {
      if (f.fileRef.name !== undefined) {
        folder.file(f.name, f.fileRef, {binary: true});
      } else {
        folder.file(f.name, f.content);
      }
    }
  }

  this.createBundle = function(selectedFile, zip) {
      return new Promise((resolve, reject) => {
        for (let file of selectedFile) {
          if (file.dataset.type == 'folder') {
            let f = fileManager.get({fid: Number(file.getAttribute('data')), type: 'folders'})
            let folder = zip.folder(f.name);
            insertTreeToBundle(f, folder);
          } else if (file.dataset.type == 'file') {
            let f = fileManager.get({fid: Number(file.getAttribute('data')), type: 'files'})
            if (f.fileRef.name !== undefined) {
              zip.file(f.name, f.fileRef, {binary: true});
            } else {
              zip.file(f.name, f.content);
            }
          }
        }
        resolve();
      });
  }

  this.getDuplicate = function(name, parentId, type = 'file') {
    let haystack;
    if (type == 'file')
      haystack = fileManager.listFiles(parentId);
    else
      haystack = fileManager.listFolders(parentId);

    for (var i=0; i<haystack.length; i++) {
      if (haystack[i].name === name && !haystack[i].trashed) {
        return haystack[i];
      }
    }
    return null;
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

function fileClose(fid) {
  
  let idx;
  
  if (fid)
    idx = odin.idxOf(String(fid), fileTab, 'fid')
  else
    idx = activeTab
  
  if (activeTab == idx) {
    
    activeTab = idx
    confirmCloseTab()
  } else {
    
    let tmp = activeTab;
    activeTab = idx;
    
    if (idx < tmp)
      confirmCloseTab(true, tmp-1)
    else
      confirmCloseTab(true, tmp)
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
  
  function wrapInPre(HTML) {
    HTML = HTML.replace(/<\/pre>/g,'</xpre>');
    let match = HTML.match(/<pre.*?>/g);
    if (match) {
      for (let pre of match)
        HTML = HTML.replace(pre, pre.replace('<pre', '<xpre'));
    }
    return '<pre>' + HTML + '</pre>';
  }

  function deploy() {
    
    let data = (locked >= 0) ? fileManager.get({fid: locked, type: 'files'}) : activeFile;
    let {blogName, blogId, entryId, summary = '', isBreak, isWrap, isSummaryFix} = helper.parseDescription(data.description);

    if (blogName && entryId) {
      
      if (!blogId) {
        getBlogId(data, blogName);
        return;
      }
      
      aww.pop('Deploying update...');
      
      let more = isBreak ? '<!--more--> ' : '';
      let summaryFix = isSummaryFix ? 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' : '';
      let content = uploadBody;
      
      if (isWrap)
        content = wrapInPre(content);

      content = summary + more + summaryFix + content;
      
      if (entryId.startsWith('p')) {
        
        oblog.config({ blog: blogName });
        oblog.pages.patch(entryId.substring(1), {
          content
        }, e => {
          
          if (e == 404)
            aww.pop('404')
          else {
            aww.pop('Update Deployed!')
          }
        })
      } else {
        
        oblog.config({ blog: blogName });
        oblog.posts.patch(entryId, {
          content
        }, e => {
          
          if (e == 404)
            aww.pop('404')
          else if (e == 400)
            aww.pop('400')
          else
            aww.pop('Update Deployed!')
        })
      }
    } else
      alert('Deploy failed. Blog name or entry ID has not been set.');
  }
  
  window.deploy = deploy;
  
})();


function openFolder(folderId) {
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


(function() {
  
  function getBranch(parents) {
    let files = []
    let folders = []
    
    for (let p of parents) {
      let f = fileManager.listFiles(p.fid);
      let f2 = fileManager.listFolders(p.fid);
      
      for (let i of f)
        files.push(i)
      for (let i of f2)
        folders.push(i)
        
      let data = getBranch(f2);
      
      for (let i of data.files)
        files.push(i)
      for (let i of data.folders)
        folders.push(i)
    }
    
    return {files: files, folders: folders};
  }
  
  function getAllBranch(fid) {
    let files = [];
    let folders = fileManager.listFolders(fid, 'fid');
    
    let data = getBranch(folders);
    
    for (let f of data.files)
      files.push(f)
    for (let f of data.folders)
      folders.push(f)
      
    let fileIds = [];
    let folderIds = [];
    for (let f of files)
      fileIds.push(f.fid)
    for (let f of folders)
      folderIds.push(f.fid)
      
    return {fileIds: fileIds, folderIds: folderIds}
  }
  
  window.getAllBranch = getAllBranch;
  
})();


(function() {
  
  let copyParentFolderId = -2;
  
  function copyFile(cut) {
    clipBoard.length = 0;
    for (let f of selectedFile) {
      if (clipBoard.indexOf(f) < 0) {
        clipBoard.push(f);
      }
    }
    
    copyParentFolderId = activeFolder;
    pasteFile.mode = cut ? 'cut' : 'copy';
  }
  window.copyFile = copyFile;
  
  function getDuplicateName(name, type = 'file', originalName = '', duplicateCount = 1) {
  	if (originalName == '')
  		originalName = name;
  	let existing = fileManager.getDuplicate(name, copyParentFolderId, type);
	if (existing !== null) {
	  	let ext = '';
	  	var arr = originalName.split('.');
	  	if (arr.length > 1) {
		  	ext = '.'+arr.pop();
	  	}
	  	return getDuplicateName(arr.join('.')+' ('+duplicateCount+')'+ext, type, originalName, duplicateCount+1);
	}
  	return name;
  }

  function copySingleFile({ id, fid, description, name, content, loaded }, modifiedTime) {
    let action = (loaded) ? 'create' : 'copy';
    let file = new File({
      id,
      name: getDuplicateName(name),
      modifiedTime,
      content,
      description,
      loaded,
      parentId: activeFolder,
    }, action, false, false);
    fileManager.sync({
      fid: file.fid, 
      action, 
      type: 'files',
    });
  }
  
  function copyBranchFile(fileIds, road, modifiedTime) {
    
    if (fileIds.length === 0) return;
    
    ({ id, fid, name, description, parentId, content, loaded, trashed } = fileManager.get({fid: fileIds[0], type: 'files'}));
    
    if (!trashed) {
      let idx = odin.idxOf(parentId, road, 0);
      let action = (loaded) ? 'create' : 'copy';
      let file = new File({
        id,
        name: getDuplicateName(name),
        description,
        modifiedTime,
        trashed,
        content,
        loaded,
        parentId: road[idx][1],
      }, action, false, false);
      fileManager.sync({
        fid: file.fid, 
        action, 
        type: 'files',
      });
    }
    fileIds.splice(0, 1);
    copyBranchFile(fileIds, road, modifiedTime);
  }
  
  function copyBranchFolder(folderIds, modifiedTime, road = []) {
  
    if (folderIds.length === 0) return road;
    
    let folderId = folderIds[0];
    
    ({ name, modifiedTime, parentId, trashed } = fileManager.get({fid: folderId, type: 'folders'}));
    
    if (!trashed) {
      road.push([folderId, fileStorage.data.counter.folders]);
      
      let idx = odin.idxOf(parentId, road, 0);
      let folder = new Folder({
        name: getDuplicateName(name, 'folder'),
        modifiedTime,
        parentId: (idx < 0) ? activeFolder : road[idx][1],
      })
      fileManager.sync({
        fid: folder.fid, 
        action: 'create', 
        type: 'folders',
      });
    }
    
    folderIds.splice(0, 1);
  
    return copyBranchFolder(folderIds, modifiedTime, road);
    
  }
  
  function fileMove(data, fileType) {
  
    handleSync({
      fid: data.fid,
      action: 'update',
      metadata: ['parents'],
      type: fileType,
      source: data.parentId
    });
    
    data.parentId = activeFolder;
  }
  
  function isBreadcrumb(folderId) {
    for (let path of breadcrumbs.slice(1)) {
      if (path.folderId == folderId) {
        return true;
      }
    }
    return false;
  }

  function pasteFile() {
    
    if (clipBoard.length === 0) return;

    while (clipBoard.length > 0) {
      let data;
      let fid = clipBoard[0].getAttribute('data');
      let type = clipBoard[0].getAttribute('data-type');
      let modifiedTime = new Date().toISOString();
      
      if (type === 'file') {
        data = fileManager.get({fid, type:'files'});
        if (pasteFile.mode === 'copy')
          copySingleFile(data, modifiedTime);
        else {
          if (data.parentId !== activeFolder)
            fileMove(data, 'files');
        }
      } else {
        if (pasteFile.mode === 'copy') {
          let branch = getAllBranch(fid);
          let road = copyBranchFolder(branch.folderIds, modifiedTime);
          copyBranchFile(branch.fileIds, road, modifiedTime);
        } else {
          data = fileManager.get({fid, type: 'folders'});
          if (isBreadcrumb(fid)) {
            aww.pop("Cannot move folder within it's own directory.");
          } else {
            fileMove(data, 'folders');
          }
        }
      }
      
      clipBoard.splice(0, 1);
      selectedFile.splice(0, 1);
    }
    
    drive.syncToDrive();
    fileStorage.save();
    fileManager.list();
    
    copyParentFolderId = -2;
  }
  pasteFile.mode = 'copy';
  
  window.pasteFile = pasteFile;
  
})();



function trashList() {
  
  var el;
  $('#list-trash').innerHTML = '';
  
  let folders = odin.filterData(true, fileStorage.data.folders, 'trashed');
  
  folders.sort(function(a, b) {
    return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
  });

  for (let f of folders) {
    el = o.cel('div',{innerHTML:o.creps('tmp-list-folder-trash', f)});
    $('#list-trash').appendChild(el);
  }
  
  $('#list-trash').appendChild(o.cel('div', {style:'flex:0 0 100%;height:16px;'}));
  
  let files = odin.filterData(true, fileStorage.data.files, 'trashed');
  
  files.sort(function(a, b) {
    return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
  });
  
  for (let {fid, name, trashed} of files) {
    let clsLock = '';
    let defaultBg = '#777';
    
    defaultBg = getFileColor(name);
      
    if (fid === locked)
      clsLock = 'w3-text-purple';
    
    el = o.cel('div',{ innerHTML: o.creps('tmp-list-file-trash', {
      fid,
      name,
      defaultBg,
      clsLock
    }) });
    
    $('#list-trash').appendChild(el);
  }
}
