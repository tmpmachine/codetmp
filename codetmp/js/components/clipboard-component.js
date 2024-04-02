const compoClipboard = (function() {
  
  let $ = document.querySelector.bind(document);
  let $$ = document.querySelectorAll.bind(document);

  let clipBoard = [];
  let pasteParentFolderId = -1;
  let pasteMode = 'copy';
  let targetWorkspaceId = activeWorkspace;
  let sourceWorkspaceId = activeWorkspace;

  // share clipboard between opened tabs
  const clipboardChannel = new BroadcastChannel('clipboardChannel');
  clipboardChannel.addEventListener('message', (evt) => {
    if (evt.data && evt.data.message) {
      switch (evt.data.message) {
        case 'copy':
          clipBoard = evt.data.clipBoard;
          pasteMode = evt.data.pasteMode;
          sourceWorkspaceId = evt.data.sourceWorkspaceId;
          $('body').classList.toggle('has-clipboard', true);
          $('.clickable[data-callback="paste"] .Label').textContent = (pasteMode == 'cut') ? 'Move here' : 'Copy here';
          break;
        case 'paste':
          clipBoard.length = 0;
          selectedFile.length = 0;
          break;
      }
    }
  });

  async function getBranch(parents) {
    let files = [];
    let folders = [];
    
    for (let p of parents) {
      let f = await fileManager.TaskListFiles(p.fid);
      let f2 = await fileManager.TaskListFolders(p.fid);
      
      for (let i of f)
        files.push(i);
      for (let i of f2)
        folders.push(i);
        
      let data = await getBranch(f2);
      
      for (let i of data.files)
        files.push(i);
      for (let i of data.folders)
        folders.push(i);
    }
    
    return {files: files, folders: folders};
  }
  
  async function getAllBranch(fid) {
    let files = [];
    let folders = [];
    // let folders = await fileManager.TaskListFolders(fid, 'fid');
    let parentFolder = await fileManager.TaskGetFile({fid, type: 'folders'});
    if (parentFolder !== undefined) {
      folders.push(parentFolder);
    }
    
    let data = await getBranch(folders);
    
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
    for (let el of selectedFile) {
      if (clipBoard.indexOf(el) < 0) {
        el.workspaceId = activeWorkspace;
        clipBoard.push({
          fid: el.getAttribute('data'),
          type: el.getAttribute('data-type'),
        });
      }
    }
    pasteMode = isCut ? 'cut' : 'copy';
    $('body').classList.toggle('has-clipboard', true);
    $('.clickable[data-callback="paste"] .Label').textContent = isCut ? 'Move here' : 'Copy here';

    clipboardChannel.postMessage({
      clipBoard,
      pasteMode,
      sourceWorkspaceId,
      message: 'copy',
    });
  }
  
  async function copySingleFile({ id, fid, name, content, loaded, fileRef }, modifiedTime) {
    let action = (loaded) ? 'create' : 'copy';
    let file = await fileManager.CreateFile({
      id,
      fileRef,
      name: await fileManager.getDuplicateName(pasteParentFolderId, name),
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
    uiTreeExplorer.AppendFile(file);
  }
  
  async function copyBranchFile(fileIds, road, modifiedTime) {
    
    if (fileIds.length === 0) return;
    
    activeWorkspace = sourceWorkspaceId;
    ({ id, fid, name, parentId, content, loaded, trashed, fileRef } = await fileManager.TaskGetFile({fid: fileIds[0], type: 'files'}));
    activeWorkspace = targetWorkspaceId;
    
    if (!trashed) {
      let idx = odin.idxOf(parentId, road, 0);
      let action = (loaded) ? 'create' : 'copy';
      let file = await fileManager.CreateFile({
        id,
        fileRef,
        name: await fileManager.getDuplicateName(pasteParentFolderId, name),
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
    await copyBranchFile(fileIds, road, modifiedTime);
  }
  
  async function copyBranchFolder(folderIds, modifiedTime, road = []) {
  
    if (folderIds.length === 0) return road;
    
    let folderId = folderIds[0];
    
    activeWorkspace = sourceWorkspaceId;
    ({ name, modifiedTime, parentId, trashed } = await fileManager.TaskGetFile({fid: folderId, type: 'folders'}));
    activeWorkspace = targetWorkspaceId;

    if (!trashed) {
      let idx = odin.idxOf(parentId, road, 0);
      let folder = await fileManager.CreateFolder({
        name: await fileManager.getDuplicateName(pasteParentFolderId, name, 'folder'),
        modifiedTime,
        parentId: (idx < 0) ? activeFolder : road[idx][1],
      })
      road.push([folderId, folder.fid]);
      
      fileManager.sync({
        fid: folder.fid, 
        action: 'create', 
        type: 'folders',
      });
      if (road.length == 1) {
        uiTreeExplorer.AppendFolder(folder);
      }
    }
    
    folderIds.splice(0, 1);
  
    return await copyBranchFolder(folderIds, modifiedTime, road);
    
  }
  
  async function fileMove(data, fileType) {
    fileManager.sync({
      fid: data.fid,
      action: 'update',
      metadata: ['parents'],
      type: fileType,
      source: data.parentId
    });
    app.getComponent('fileTree').then(fileTree => {
      let type = (fileType == 'files') ? 'file' : 'folder';
      fileTree.moveItemFrom(type, data, activeFolder);
    });
    await fileManager.TaskMoveFile(data, activeFolder, fileType);
  }
  
  function isBreadcrumb(folderId) {
    for (let path of breadcrumbs.slice(1)) {
      if (path.folderId == folderId) {
        return true;
      }
    }
    return false;
  }

  async function paste() {
    
    if (clipBoard.length === 0) return;

    pasteParentFolderId = activeFolder;
    targetWorkspaceId = activeWorkspace;

    while (clipBoard.length > 0) {

      let data;
      let fid = clipBoard[0].fid;
      let type = clipBoard[0].type;
      let modifiedTime = new Date().toISOString();
      
      if (type === 'file') {

        activeWorkspace = sourceWorkspaceId;
        data = await fileManager.TaskGetFile({fid, type:'files'});
        activeWorkspace = targetWorkspaceId;
        
        if (pasteMode === 'copy') {

          await copySingleFile(data, modifiedTime);

        } else {

          if (targetWorkspaceId !== sourceWorkspaceId) {
            aww.pop('Cannot move files between workspaces. Files copied instead.', false, 5000);
            await copySingleFile(data, modifiedTime);
          } else {
            if (data.parentId !== activeFolder)
              await fileMove(data, 'files');
          }

        }

      } else {

        if (pasteMode === 'copy') {
          
          activeWorkspace = sourceWorkspaceId;
          let branch = await getAllBranch(fid);
          activeWorkspace = targetWorkspaceId;
          let road = await copyBranchFolder(branch.folderIds, modifiedTime);
          await copyBranchFile(branch.fileIds, road, modifiedTime);

        } else {
          if (targetWorkspaceId !== sourceWorkspaceId) {
            aww.pop('Cannot move files between workspaces. Files copied instead.', false, 5000);
            activeWorkspace = sourceWorkspaceId;
            let branch = await getAllBranch(fid);
            activeWorkspace = targetWorkspaceId;
            let road = await copyBranchFolder(branch.folderIds, modifiedTime);
            await copyBranchFile(branch.fileIds, road, modifiedTime);
          } else {
            data = await fileManager.TaskGetFile({fid, type: 'folders'});
            if (isBreadcrumb(fid)) {
              aww.pop("Cannot move folder within it's own directory.");
            } else {
              await fileMove(data, 'folders');
            }
          }
        }

      }
      
      clipBoard.splice(0, 1);
      selectedFile.splice(0, 1);
    }
    
    $('body').classList.toggle('has-clipboard', false);
    
    drive.syncToDrive();
    fileStorage.save();
    fileManager.list();

    clipboardChannel.postMessage({
      message: 'paste',
    });
  }

  function cut() {
    copy(true);
  }
  
  function handler(e) {
    if (compoStateManager.isState(0)) {
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