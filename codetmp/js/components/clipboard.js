const fileClipBoard = (function() {
  
  let clipBoard = [];
  let pasteParentFolderId = -1;
  let pasteMode = 'copy';
  let targetWorkspaceId = activeWorkspace;
  let sourceWorkspaceId = activeWorkspace;

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
  
  function copy(isCut = false) {
    clipBoard.length = 0;
    sourceWorkspaceId = activeWorkspace;
    for (let f of selectedFile) {
      if (clipBoard.indexOf(f) < 0) {
        f.workspaceId = activeWorkspace;
        clipBoard.push(f);
      }
    }
    pasteMode = isCut ? 'cut' : 'copy';
    $('body')[0].classList.toggle('has-clipboard', true);

    $('.clickable[data-callback="paste"] .Label')[0].textContent = isCut ? 'Move here' : 'Copy here';
  }
  
  function copySingleFile({ id, fid, name, content, loaded, isTemp, fileRef }, modifiedTime) {
    let action = (loaded) ? 'create' : 'copy';
    let file = fileManager.newFile({
      id,
      isTemp,
      fileRef,
      name: fileManager.getDuplicateName(pasteParentFolderId, name),
      modifiedTime,
      content,
      loaded,
      parentId: activeFolder,
    });
    fileManager.sync({
      fid: file.fid, 
      action, 
      type: 'files',
    });
    ui.tree.appendFile(file);
  }
  
  function copyBranchFile(fileIds, road, modifiedTime) {
    
    if (fileIds.length === 0) return;
    
    activeWorkspace = sourceWorkspaceId;
    ({ id, fid, name, parentId, content, loaded, trashed, fileRef } = fileManager.get({fid: fileIds[0], type: 'files'}));
    activeWorkspace = targetWorkspaceId;
    
    if (!trashed) {
      let idx = odin.idxOf(parentId, road, 0);
      let action = (loaded) ? 'create' : 'copy';
      let file = fileManager.newFile({
        id,
        fileRef,
        name: fileManager.getDuplicateName(pasteParentFolderId, name),
        modifiedTime,
        trashed,
        content,
        loaded,
        parentId: road[idx][1],
      });
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
    
    activeWorkspace = sourceWorkspaceId;
    ({ name, modifiedTime, parentId, trashed } = fileManager.get({fid: folderId, type: 'folders'}));
    activeWorkspace = targetWorkspaceId;

    if (!trashed) {
      road.push([folderId, fileStorage.data.counter.folders]);
      
      let idx = odin.idxOf(parentId, road, 0);
      let folder = fileManager.newFolder({
        name: fileManager.getDuplicateName(pasteParentFolderId, name, 'folder'),
        modifiedTime,
        parentId: (idx < 0) ? activeFolder : road[idx][1],
      })
      fileManager.sync({
        fid: folder.fid, 
        action: 'create', 
        type: 'folders',
      });
      if (road.length == 1) {
        ui.tree.appendFolder(folder);
      }
    }
    
    folderIds.splice(0, 1);
  
    return copyBranchFolder(folderIds, modifiedTime, road);
    
  }
  
  function fileMove(data, fileType) {
    fileManager.handleSync({
      fid: data.fid,
      action: 'update',
      metadata: ['parents'],
      type: fileType,
      source: data.parentId
    });
    window.app.getComponent('fileTree').then(fileTree => {
      let type = (fileType == 'files') ? 'file' : 'folder';
      fileTree.moveItemFrom(type, data, activeFolder);
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

  function paste() {
    
    if (clipBoard.length === 0) return;

    pasteParentFolderId = activeFolder;
    targetWorkspaceId = activeWorkspace;

    while (clipBoard.length > 0) {
      let data;
      let fid = clipBoard[0].getAttribute('data');
      let type = clipBoard[0].getAttribute('data-type');
      let modifiedTime = new Date().toISOString();
      
      if (type === 'file') {
        activeWorkspace = sourceWorkspaceId;
        data = fileManager.get({fid, type:'files'});
        activeWorkspace = targetWorkspaceId;
        if (pasteMode === 'copy') {
          copySingleFile(data, modifiedTime);
        } else {
          if (targetWorkspaceId !== sourceWorkspaceId) {
            aww.pop('Cannot move files between workspaces. Files copied instead.', false, 5000);
            copySingleFile(data, modifiedTime);
          } else {
            if (data.parentId !== activeFolder)
              fileMove(data, 'files');
          }
        }
      } else {
        if (pasteMode === 'copy') {
          activeWorkspace = sourceWorkspaceId;
          let branch = getAllBranch(fid);
          activeWorkspace = targetWorkspaceId;
          let road = copyBranchFolder(branch.folderIds, modifiedTime);
          copyBranchFile(branch.fileIds, road, modifiedTime);
        } else {
          if (targetWorkspaceId !== sourceWorkspaceId) {
            aww.pop('Cannot move files between workspaces. Files copied instead.', false, 5000);
            activeWorkspace = sourceWorkspaceId;
            let branch = getAllBranch(fid);
            activeWorkspace = targetWorkspaceId;
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
      }
      
      clipBoard.splice(0, 1);
      selectedFile.splice(0, 1);
    }
    
    $('body')[0].classList.toggle('has-clipboard', false);

    drive.syncToDrive();
    fileStorage.save();
    fileManager.list();
  }

  function cut() {
    copy(true);
  }
  
  function handler(e) {
    if (stateManager.isState(0)) {
      switch (e.type) {
        case 'cut': cut(); break;
        case 'copy': copy(); break;
        case 'paste': paste(); break;
      }
    }
  }

  return {
    clipBoard,
    handler,
    cut,
    paste,
    copy: () => copy(),
  };

})();