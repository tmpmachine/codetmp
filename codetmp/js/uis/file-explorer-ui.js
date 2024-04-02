let uiFileExplorer = (function() {

  let $ = document.querySelector.bind(document);
  let $$ = document.querySelectorAll.bind(document);

  let SELF = {
      NavigationHandler,
      NavScrollDown,
      NavScrollUp,
      ToggleFileHighlight,
      ClearFileSelection,
      SelectAllFiles,
      PreviousFolder,
      DoubleClickOnFile,
      SelectFileByName,
      LoadBreadCrumbs,
      RenameFile,
      OpenFileConfirm,
      SetState,
      OpenFileDirectoryAsync,
      renameFolder,
      renameFile,
      newFolder,
      newFile,
      deleteSelected,
      getSelected,
      UnloadSelected,
  };

  let states = {
      lastClickEl: null,
      doubleClick: false,
  }

  function commit(data) {
    fileManager.sync(data);
    drive.syncToDrive();
    fileStorage.save();
    fileManager.list();
  }

  function getSelected(el) {
    return {
      title: el.getAttribute('title'),
      id: Number(el.getAttribute('data')),
    };
  }

  function renameFolder() {

    if (activeWorkspace == 2) {
      alert('Renaming folder in file system mode is not yet supported.');
      return;
    }

    let selection = getSelected(selectedFile[0]);
    modal.prompt('Rename', selection.title, '', helper.getFileNameLength(selection.title)).then(async (name) => {
      if (!name || name === selection.title) return;
    
        let folder = await fileManager.RenameFolder(selection.id, name);
        uiTreeExplorer.RenameFolder(folder);

    });
  }
  
  function renameFile() {
    let selection = getSelected(selectedFile[0]);
    let fid = selection.id;

    modal.prompt('Rename', selection.title, '', helper.getFileNameLength(selection.title)).then(async (name) => {
      if (!name || name == selection.title) 
        return;

      let file = await fileManager.RenameFile(fid, name);
      uiTreeExplorer.RenameFile(file);

      if (activeFile) {
        if (fid === activeFile.fid)
          compoEditor.SetMode(file.name);
        
        let index = 0
        for (let tab of fileTab) {
          if (tab.fid == fid) {
            $$('.file-name')[index].textContent = file.name;
            break;
          }
          index++;
        }
      }
    });
  }

  function newFolder() {
    if (!$('#in-my-files').classList.contains('active'))
      return;
    
    modal.prompt('Folder name', 'New Folder').then(async (name) => {
      if (!name) 
        return;

      let folder = await fileManager.CreateFolder({
          name: await fileManager.getDuplicateName(activeFolder, name, 'folder'),
          modifiedTime: new Date().toISOString(),
          parentId: activeFolder,
      });
      commit({
        fid: folder.fid,
        action: 'create',
        type: 'folders',
      });
      uiFileExplorer.ClearFileSelection();
      uiTreeExplorer.AppendFolder(folder);

    });
  }

  function newFile() {
    if (!$('#in-my-files').classList.contains('active')) {
      ui.openNewTab();
      return;
    }
    
    modal.prompt('File name', 'Untitled').then(async (name) => {
      if (!name) 
        return;
      let file = await fileManager.CreateFile({
          name: await fileManager.getDuplicateName(activeFolder, name),
          modifiedTime: new Date().toISOString(),
          content: '',
      });
      commit({
        fid: file.fid,
        action: 'create',
        type: 'files',
      });
      uiFileExplorer.ClearFileSelection();
      uiTreeExplorer.AppendFile(file);

    });
  }
  
  function confirmDeletion(message) {
    return new Promise(resolve => {
      modal.confirm(message).then(() => {
        resolve();
      })
    })
  }

  async function deleteFolder(selectedFile) {
    let selection = getSelected(selectedFile);
    let fid = selection.id;
    await fileManager.TaskDeleteFolder(fid);
  }

  async function deleteFile(selectedFile) {
    let selection = getSelected(selectedFile);
    let fid = selection.id;
    await fileManager.TaskDeleteFile(fid);

    if (activeFile && parseInt(fid) == parseInt(activeFile.fid)) {
      activeFile = null;
      fileTab[activeTab].fiber = 'fiber_manual_record';
      $$('.icon-rename')[activeTab].textContent = 'fiber_manual_record';
    }
  }

  async function unloadSelection(selectedFile, type) {
    let selection = getSelected(selectedFile);
    let fid = selection.id;
    await fileManager.UnloadItem(fid, type);
  }

  function deleteSelected() {
    if (selectedFile.length === 1) {
      confirmDeletion('Move selected item to trash?').then(async () => {
        if (selectedFile[0].getAttribute('data-type') === 'folder')
          deleteFolder(selectedFile[0]);
        else if (selectedFile[0].getAttribute('data-type') === 'file')
          deleteFile(selectedFile[0]);
        uiFileExplorer.ClearFileSelection();
      })
    } else if (selectedFile.length > 1) {
      confirmDeletion('Move selected items to trash?').then(async () => {
        while (selectedFile.length > 0) {
          let selection = selectedFile[0];
          if (selection.getAttribute('data-type') === 'folder')
            await deleteFolder(selection);
          else if (selection.getAttribute('data-type') === 'file')
            await deleteFile(selection);  
        }
        uiFileExplorer.ClearFileSelection();
      });
    }
  }

  async function OpenFileDirectoryAsync() {
    
    if (!activeFile || $('#btn-menu-my-files').classList.contains('active'))  {
      return;
    }

    let parentId = activeFile.parentId;
    let targetMenuId;
    let useCallback = false;
    
    breadcrumbs.splice(1);
    
    while (parentId != -1) {
      folder = await fileManager.TaskGetFile({fid: parentId, type: 'folders'});
      breadcrumbs.splice(1, 0, {folderId:folder.fid, title: folder.name});
      parentId = folder.parentId;
    }

    LoadBreadCrumbs();
    
    ui.toggleActionMenu(targetMenuId, useCallback, $('#btn-menu-my-files'));
    
    if (breadcrumbs.length > 1) {
      breadcrumbs.pop();
    }

    await fileManager.OpenFolder(activeFile.parentId);
    
    OpenFileConfirm(document.querySelector(`._fileList [data-type="file"][data-fid="${activeFile.fid}"]`))
  }

  function UnloadSelected() {
    if (selectedFile.length === 1) {
      confirmDeletion('Unload selected item?').then(async () => {
        if (selectedFile[0].getAttribute('data-type') === 'folder')
          unloadSelection(selectedFile[0], 'folders');
        else if (selectedFile[0].getAttribute('data-type') === 'file')
          unloadSelection(selectedFile[0], 'files');
        uiFileExplorer.ClearFileSelection();
      })
    } else if (selectedFile.length > 1) {
      alert('Multiple unload currently not suppoerted')
    }
  }

  function SetState(key, value) {
    if (typeof(states[key]) == 'undefined') return;

    states[key] = value;
  }

  function OpenFileConfirm(el) {

    if (!el) return;

      let index = selectedFile.indexOf(el);
    
      if (compoKeyInput.pressedKeys.shiftKey || compoKeyInput.pressedKeys.ctrlKey) {
    
        states.doubleClick = false;
        if (index < 0) {
          if (compoKeyInput.pressedKeys.shiftKey) {
            if (selectedFile.length === 0) {
              selectedFile.push(el);
              ToggleFileHighlight(el, true);  
            } else {
              let last = selectedFile[selectedFile.length-1];
              ClearFileSelection();
              selectedFile.push(last)
    
              let direction = 'previousElementSibling';
              let ele = last.nextElementSibling; 
              while (ele) {
                if (ele === el) {
                  direction = 'nextElementSibling';
                  break
                } else {
                  ele = ele.nextElementSibling;
                }
              }
    
              let next = last[direction];
              while (next) {
                if (next.classList.contains('separator')) {
                  next = next[direction];
                } else {
                  selectedFile.push(next);
                  if (next === el)
                    break;
                  next = next[direction];
                }
              }
    
              for (let sel of selectedFile) {
                  ToggleFileHighlight(sel, true);  
              }
            }
          } else {
            selectedFile.push(el);
            ToggleFileHighlight(el, true);
          }
        } else {
          if (compoKeyInput.pressedKeys.shiftKey) {
    
          } else {
            selectedFile.splice(index, 1);
            ToggleFileHighlight(el, false);
          }
        }
        ui.toggleFileActionButton();
        return
        
      } else {
        
        for (let el of selectedFile) {
            ToggleFileHighlight(el, false);
          }
            
        if (selectedFile.length > 1) {
          selectedFile.length = 0;
          index = -1;
        }
    
        if (index < 0) {
          selectedFile[0] = el;
          states.doubleClick = false;
          ToggleFileHighlight(el, false);
        } 
      }
      
      if (!states.doubleClick) {
        states.lastClickEl = el;
        states.doubleClick = true;
        ToggleFileHighlight(states.lastClickEl, true);
        setTimeout(function(){
          states.doubleClick = false;
        }, 500);
      } else {
        let type = selectedFile[0].dataset.type;
        selectedFile.splice(0, 1);
        states.doubleClick = false;
        if (type == 'file') {
          fileManager.open(el.getAttribute('data'))
        } else {
          let folderId = Number(el.getAttribute('data'))
          fileManager.OpenFolder(folderId);
        }
        ToggleFileHighlight(states.lastClickEl, false);
      }
      
      ui.toggleFileActionButton();
    
  }

  function RenameFile() {
      if (selectedFile[0].dataset.type === 'folder') {
          uiFileExplorer.renameFolder();
      } else {
          uiFileExplorer.renameFile();
      }
  }
  
  function LoadBreadCrumbs() {
      $('#breadcrumbs').innerHTML = '';
      let i = 0;
      for (let b of breadcrumbs) {
          let button = $('#tmp-breadcrumb').content.cloneNode(true).firstElementChild;
          button.textContent = b.title;
          if (i == breadcrumbs.length-1) {
          button.classList.add('isActive');
          } else {
          button.dataset.fid = b.folderId;
          button.addEventListener('click', openBread);
          }
          $('#breadcrumbs').appendChild(button);
          i++;
      }
      let parentNode = $('#breadcrumbs').parentNode;
      parentNode.scrollTo(parentNode.scrollWidth, 0);
  }
  
  async function openBread() {
      let fid = this.dataset.fid;
      activeFolder = parseInt(fid);
      if (this.textContent == '..') {
          await fileManager.reloadBreadcrumb();
      } else {
          let idx = odin.idxOf(fid,breadcrumbs,'folderId');
          breadcrumbs = breadcrumbs.slice(0,idx+1);
      }
      await fileManager.list();
      ClearFileSelection();
  }

  function SelectFileByName(key) {

      let found = false;
      let matchName = [];
      for (let el of $('.folder-list')) {
        if (el.title.toLowerCase().startsWith(key)) {
          matchName.push(el);
        }
      }
    
      for (let el of $('.file-list')) {
        if (el.title.toLowerCase().startsWith(key)) {
          matchName.push(el);
        }
      }
    
      if (matchName.length == 0) {
        if (selectedFile.length > 0) {
          ToggleFileHighlight(states.lastClickEl, false);
          states.doubleClick = false;
          selectedFile.length = 0;
        }
      }
    
      if (typeof(selectedFile[0]) == 'undefined') {
        if (matchName.length > 0) {
          matchName[0].click();
          NavScrollUp();
          NavScrollDown();
        }
      } else {
        let selectedIndex = matchName.indexOf(selectedFile[0]);
        if (selectedIndex < 0) {
          if (matchName.length > 0) {
            matchName[0].click();
            NavScrollUp();
            NavScrollDown();
          }
        } else {
          if (matchName.length > 1) {
            selectedIndex = selectedIndex + 1 == matchName.length ? 0 : selectedIndex + 1;
            matchName[selectedIndex].click();
            NavScrollUp();
            NavScrollDown();
          }
        }
      }
    
  }

  function ToggleFileHighlight(el, isActive) {
    if (el === undefined) return;
    el.classList.toggle('isSelected', isActive);
  }
  
  function ClearFileSelection() {
    for (let el of selectedFile) {
        ToggleFileHighlight(el, false);
    }
    selectedFile.length = 0;
    states.lastClickEl = null;
    ui.toggleFileActionButton();
  }
  
  function SelectAllFiles() {
      if (compoStateManager.isState(0)) {
      event.preventDefault();
          selectedFile = [...$$('.folder-list, .file-list')];
          for (let el of selectedFile)
              ToggleFileHighlight(el, true);
      ui.toggleFileActionButton();
      }
  }
  
  function PreviousFolder() {
      if ($('#btn-menu-my-files').classList.contains('active') && $$('.breadcrumbs').length > 1) {
          event.preventDefault();
          $$('.breadcrumbs')[$$('.breadcrumbs').length-2].click()
      }
  }
  
  function DoubleClickOnFile() {
      selectedFile[0].click();
      if (selectedFile[0]) {
          selectedFile[0].click();
      }
  }

  function NavigationHandler() {
      
      if (compoStateManager.isState(1))
      return
  
      if (!$('#btn-menu-my-files').classList.contains('active')) return;
      event.preventDefault();
      switch (event.keyCode) {
      case 37:
      case 38:
          if (selectedFile.length > 0) {
          if (event.keyCode == 37 || (event.keyCode == 38 && settings.data.explorer.view == 'list'))
              navigateHorizontal('previousElementSibling');
          else
              navigateVertical('previousElementSibling');
          NavScrollUp();
          }
      break;
      case 39:
      case 40:
          if (selectedFile.length == 0) {
          if (selectFirstFile())
              NavScrollUp();
          } else {
          if (event.keyCode == 39 || (event.keyCode == 40 && settings.data.explorer.view == 'list'))
              navigateHorizontal('nextElementSibling');
          else
              navigateVertical('nextElementSibling');
          NavScrollDown();
          }
      break;
      }
  }

  function NavScrollUp() {
      let fileContainerOffsetTop = selectedFile[0].offsetTop;
      let customDefinedGap = 34;
      let scrollTop = (fileContainerOffsetTop - customDefinedGap + $('#status-bar').offsetHeight);
      if (scrollTop < $('._fileList').parentNode.scrollTop) {
        $('._fileList').parentNode.scrollTop = scrollTop;
      }
  }
  
  function NavScrollDown() {
      let fileContainerOffsetTop = selectedFile[0].offsetTop;
      let padding = 16;
      let customDefinedGap = 28;
      let scrollTop = (fileContainerOffsetTop + selectedFile[0].offsetHeight + padding + $('#status-bar').offsetHeight);
      let visibleScreenHeight = $('._fileList').parentNode.scrollTop + customDefinedGap + $('._fileList').parentNode.offsetHeight;
      if (scrollTop > visibleScreenHeight) {
        $('._fileList').parentNode.scrollTop += scrollTop - visibleScreenHeight;
      }
  }

  function navigateHorizontal(target) {
      let last = selectedFile[selectedFile.length-1];
      let next = last[target];
      while (next) {
        if (next.classList.contains('separator')) {
          next = next[target];
        } else {
          if (!compoKeyInput.pressedKeys.shiftKey) {
              ClearFileSelection();
          }
          next.click();
          break;
        }
      }
  }

  function navigateVertical(target) {

      let w = $('._fileList .separator').offsetWidth;
      let padding = 4;
      let f = selectedFile[0].offsetWidth + padding;
      let cols = Math.floor(w/f)
      let folders = $('.folder-list');
      let last = selectedFile[selectedFile.length-1];
      let no = parseInt(last.dataset.number);
      let targetNo = target == 'previousElementSibling' ? no - cols : no + cols;
      let selTarget = last;
      let next = last[target];

      while (next) {
          if (next.classList.contains('separator')) {
          next = next[target];
          if (targetNo < 1) {
              targetNo = Math.ceil(folders.length / cols) * cols + targetNo;
              if (targetNo > folders.length)
              targetNo = Math.max(folders.length % cols, targetNo - cols);
          } else {
              targetNo = targetNo % cols;
              if (targetNo === 0)
              targetNo = cols;
          }
          continue;
          }

          selTarget = next;
          if (parseInt(next.dataset.number) == targetNo)
          break;
          else 
          next = next[target];
      }

      if (!compoKeyInput.pressedKeys.shiftKey) {
          ClearFileSelection();
      }
      selTarget.click();
  }
  
  function selectFirstFile() {
      if ($$('.folder-list').length > 0) {
          $('.folder-list').click();
          return true;
      } else if ($$('.file-list').length > 0) {
          $('.file-list').click();
          return true;
      }
      return false;
  }

  return SELF;

})();