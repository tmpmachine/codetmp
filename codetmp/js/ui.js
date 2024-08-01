let ui = (function() {

  let $ = document.querySelector.bind(document);
  let $$ = document.querySelectorAll.bind(document);

  let SELF = {
    SetActiveWorkspace,
    GetActiveWorkspace,
    TaskChangeWorkspaceByIndex,
    states: {
      storage: constant.STORAGE_STATE.Default,
    },
    OpenDiskFile,
    highlightTree,
    reloadFileTree,
    myFiles,
    toggleTemplate,
    trash,
    toggleTheme,
    setFontSize,
    changeFileListView,
    reloadOpenTab,
    toggleFileDownload,
    toggleGenerateSingleFile,
    enableJSZip,
    toggleMyFiles,
    toggleFileActionButton,
    setGitToken,
    Init,
    hidePalette,
    toggleBreakPoint,
    newFile,
    newDiskFile,
    resizeEditor,
    fileDownload,
    alert,
    cloneRepo,
    confirmClearData,
    switchTab,
    openNewTab,
    toggleAutoSync,
    toggleSaveToken,
    ToggleHomepageSetting,
    ToggleHomepage,
    toggleActionMenu,
    toggleInsertSnippet,
    changeWorkspace,
    uploadFile,
    RevokeAccess,
    ToggleModalByClick,
    ToggleModal,
    InitFileHandler,
    
    fileGenerator: {
      generate: function() {
        let form = this.form;
        singleFileGenerator.generate(form);
      },
      copy: function() {
        let form = this.form;
        singleFileGenerator.copy(form);
      },
    },
    CreateSession,
    HandleSidebarBtnClick,
  };

  // init workspace data
  {

    let navStructure = {
      root: {
        activeFile: null,
        fileTab: [],
        selectedFile: [],
        activeTab: 0,
        activeFolder: -1,
        breadcrumbs: [{folderId:-1,title:'My Files'}],
      },
    };
    
    let navMain = new Lsdb('nav-main', navStructure);
    let navTemp = new Lsdb('nav-temp', navStructure);
    let navLocal = new Lsdb('nav-local', navStructure);
    let navs = [navMain, navTemp, navLocal];
    
    for (let key in navStructure.root) {
      Object.defineProperty(window, key, { 
        get: () => navs[activeWorkspace].data[key],
        set: value => navs[activeWorkspace].data[key] = value,
      })
    }

  }

  function RevokeAccess() {
    let isConfirm = window.confirm('This will log you out and you will need to grant app permission again. Continue?');
    if (!isConfirm) return;

    compoGsi.RevokeToken();
    app.SignOut();
  }

  function HandleSidebarBtnClick(evtTarget) {
    let btnEl = evtTarget.closest('._btnSidebar');

    if (!btnEl) return;

    let useCallback = true;
    let targetId = null;
    ui.toggleActionMenu(targetId, useCallback, btnEl);
  }

  function toggleTemplate() {
    $('#btn-menu-template').click();
  }

  function SetActiveWorkspace(index) {
    activeWorkspace = index;
  }

  function GetActiveWorkspace() {
    return activeWorkspace;
  }

  function CreateSession() {
    let userVal = window.prompt('Session name');
    if (!userVal) return;

    let sessionId = userVal;
    compoSessionManager.CreateSession(sessionId);
    alert('Session created. Save this URL for later.')
  }

  function ToggleModalByClick() {
    ToggleModal(this.dataset.target);
  }

  function ToggleModal(name) {
    let modal = $(`.modal-component[data-name="${name}"]`);
    modal.addEventListener('onclose', onclosemodal);
    modal.toggle();
    compoStateManager.pushState([0]);
  }
    
  function onclosemodal(event) {
    let modal = event.target;
    modal.removeEventListener('onclose', onclosemodal);
    // delay to handle global key listener
    window.setTimeout(() => {
      compoStateManager.popState([0]);
    }, 50)
  }

  function highlightTree(fid, isRevealFileTree = true) {
    app.getComponent('fileTree').then(ft => {
      ft.highlightTree(fid, isRevealFileTree);
    });
  }

  function reloadFileTree() {
    app.getComponent('fileTree').then(ft => {
      ft.reload();
    });
  }

  async function changeWorkspace(targetEl) {

    let dataTarget = targetEl.dataset.target;
    let dataIndex = targetEl.dataset.index;

    if (dataTarget == $('#workspace-title').textContent) return;

    let index = parseInt(dataIndex);
    
    SetActiveWorkspace(index);
    await TaskChangeWorkspaceByIndex(index);
  }

  async function TaskChangeWorkspaceByIndex(index) {
    reloadActiveWorkspaceUiStatesByIndex(index);
    await taskReloadActiveWorkspaceEnvStates();
  }

  async function taskReloadActiveWorkspaceEnvStates() {
    await fileManager.list();

    compoFileTab.list();
    if (fileTab.length === 0) {
      ui.openNewTab();
    }
    compoFileTab.focusTab(fileTab[activeTab].fid);
    
    uiFileExplorer.LoadBreadCrumbs();
    
    await app.getComponent('fileTree');
    app.fileTree.reset();
  }

  function reloadActiveWorkspaceUiStatesByIndex(workspaceIndex) {
    
    for (let node of $$('.workspace .Btn')) {
      node.classList.toggle('active', false);
      if (node.dataset.index == workspaceIndex) {
        node.classList.toggle('active', true);
        $('#workspace-title').textContent = node.dataset.target;
      }
    }

    document.body.stateList.toggle('fs-mode', (workspaceIndex == 2));
    
    let dataStorage = 'main';
    if (workspaceIndex == 1) {
      dataStorage = 'playground'
    } else if (workspaceIndex == 2) {
      dataStorage = 'fileSystem'
    }
    ui.states.storage = constant.STORAGE_STATE[dataStorage];

  }

  function myFiles() {
    $('#btn-menu-my-files').click();
  }

  function trash() {
    if (!$('#in-trash').classList.contains('active'))
      $('#btn-menu-trash').click();
  }

  function toggleTheme() {
    let editor = fileTab[activeTab].editor.env.editor;
    if (editor.getTheme().includes('codetmp')) {
      editor.setTheme('ace/theme/github');
    } else {
      editor.setTheme('ace/theme/codetmp');
    }
  }

  function setFontSize() {
    modal.prompt('Editor Font Size', 16).then(size => {
      size = parseInt(size);
      if (size) {
        for (let tab of fileTab) {
          tab.editor.env.editor.setFontSize(size);
        }
      }
    });
  }

  function changeFileListView() {
    changeExplorerView(this.dataset.type);
  }

  async function uploadFile(self) {
    $('#file-upload').click();
  }

  function reloadOpenTab(fid, content) {
    for (let tab of fileTab) {
      if (tab.fid == fid) {
        tab.editor.env.editor.setValue(content);
      }
    }
  }

  function toggleFileDownload() {
    ToggleModal('file-download');
  }

  function toggleGenerateSingleFile() {
    ToggleModal('generate-single-file');
  }

  function enableJSZip() {
    $('.clickable[data-callback="file-download"]').classList.toggle('hide', false);
  }

  function toggleMyFiles() {
    if (compoStateManager.isState(1)) return;
    
    $('#btn-menu-my-files').click()
    if ($('#btn-menu-my-files').classList.contains('active')) {
      fileTab[activeTab].editor.env.editor.blur();
      compoStateManager.pushState([1]);
      setTimeout(() => { document.activeElement.blur() }, 1);
    } else {
      compoStateManager.popState([1]);
      setTimeout(() => { 
        ui.resizeEditor();
        fileTab[activeTab].editor.env.editor.focus(); 
        
      }, 1);
    }
  }

  function toggleFileActionButton() {
    let isHide = (selectedFile.length === 0);
    $('.btn-file-action')?.classList.toggle('w3-hide', isHide);
  }

  function setGitToken() {
    ToggleModal('settings');
    modal.prompt('Personal access token').then(token => {
      if (token !== null) {
        gitRest.setToken(token);
        aww.pop('Personal access token has been set.');
      }
    });
  }
  
  function toggleActionMenu(targetId, useCallback, targetNode) {
    let target;
    if (targetId) {
      target = $('#'+targetId);
    } else {
      target = targetNode;
    }

    target.classList.toggle('active');
    
    
    target.lastElementChild.classList.toggle('active');
    target.firstElementChild.classList.toggle('active');
    let menuId = target.getAttribute('menu');
    let menu = $('#'+menuId);
    let block = $('#'+menuId+'-block');
    
    if (target.classList.contains('active') && (menuId === 'in-my-files' || menuId === 'in-trash')) {
      
      if (useCallback) {
        $('#list-trash').innerHTML = '';
        $('._fileList').innerHTML = '';
        if (menuId === 'in-my-files') {
          fileManager.list();
        } else if (menuId === 'in-trash') {
          trashList();
        }
      }

      toggleInsertSnippet(false);
    }

    if (!menu) {
      setTimeout(function(){
        target.classList.toggle('active',false);
        target.lastElementChild.classList.toggle('active',false);
        target.firstElementChild.classList.toggle('active',false);
      }, 500);
      return;
    }
    
    for (let el of $$('._btnSidebar')) {
      
      if (el !== target) {
        
        if (!el.classList.contains('active')) continue;
        el.classList.toggle('active',false);
        el.lastElementChild.classList.toggle('active',false);
        el.firstElementChild.classList.toggle('active',false);
        let menuId = el.getAttribute('menu');
        if (menuId === null) continue
        let menu = $('#'+menuId);
        let block = $('#'+menuId+'-block');
        menu.classList.toggle('active',false);
        block.classList.toggle('active',false);
      }
    }
     
    menu.classList.toggle('active');
    block?.classList.toggle('active');
    
    if (!menu.classList.contains('active')) {
      selectedFile = [];
    }

    if ($('#in-my-files').classList.contains('active')) {
      $('#btn-menu-save-wrapper').classList.toggle('hide', true);
      $('#btn-menu-preview-wrapper').classList.toggle('hide', true);
      $('#btn-menu-template').classList.toggle('hide', true);

      $('#btn-home-wrapper').classList.toggle('hide', false);
      $('#btn-account-wrapper').classList.toggle('hide', false);
      $('#btn-undo').classList.toggle('hide', true);
      $('#btn-redo').classList.toggle('hide', true);
      compoStateManager.pushState([1]);
    } else {
      $('#btn-menu-save-wrapper').classList.toggle('hide', false);
      $('#btn-menu-preview-wrapper').classList.toggle('hide', false);
      $('#btn-menu-template').classList.toggle('hide', false);
      $('#btn-home-wrapper').classList.toggle('hide', true);
      $('#btn-account-wrapper').classList.toggle('hide', true);
      $('#btn-undo').classList.toggle('hide', false);
      $('#btn-redo').classList.toggle('hide', false);
      compoStateManager.popState([1]);
    }
  }
  
  function toggleInsertSnippet(persistent) {
    if ($('#in-my-files').classList.contains('active')) return
  
    let el = $('.search-box');
    if (typeof(persistent) == 'undefined')
      el.classList.toggle('w3-hide');
    else
      el.classList.toggle('w3-hide', !persistent);
  
    $('#search-input').addEventListener('blur', ui.hidePalette);
  
    if (!el.classList.contains('w3-hide')) {
      $('#search-input').value = '';
      setTimeout(() => { $('#search-input').focus(); }, 1);
    } else {
      setTimeout(() => { document.activeElement.blur() }, 1);
      if (typeof(persistent) === 'undefined')
        fileTab[activeTab].editor.env.editor.focus();
      $('#search-input').value = '';
      $('#search-input').blur();
    }
  }

  function switchTab(direction = 1) {
    if ($('#in-my-files').classList.contains('active') || fileTab.length == 1) 
      return;
    let fid;
    if (activeTab + direction > 0 && activeTab + direction < fileTab.length)
      fid = fileTab[activeTab + direction].fid
    else
      fid = (activeTab + direction == -1) ? fileTab[fileTab.length - 1].fid : fileTab[0].fid;
      compoFileTab.focusTab(fid);
  }
  
  function openNewTab(position, data) {
    compoFileTab.newTab(position, data);
  }
  
  function toggleAutoSync() {
    settings.data.autoSync = !settings.data.autoSync;
    settings.save();
    $('#check-auto-sync').checked = settings.data.autoSync ? true : false;
  }

  function toggleSaveToken() {
    settings.data.saveGitToken = !settings.data.saveGitToken;
    settings.save();
    $('#check-save-token').checked = settings.data.saveGitToken ? true : false;
  }

  function ToggleHomepageSetting() {
    settings.data.showHomepage = !settings.data.showHomepage;
    settings.save();
    $('#check-show-homepage').checked = settings.data.showHomepage ? true : false;
  }

  function ToggleHomepage() {
    $('#sidebar').classList.toggle('HIDE');
    $('#in-home').classList.toggle('active');
    $('#main-editor').classList.toggle('editor-mode');
    if ($('#in-my-files').classList.contains('active')) {
      $('#btn-menu-my-files').click();
    }
  }
  
  function cloneRepo() {
    let message = $('#msg-git-rate-limit').content.cloneNode(true).firstElementChild;
    message.querySelector('.Rate').textContent = gitRest.rateLimit;
    modal.prompt('Repository web URL', 'https://github.com/username/repository', message.innerHTML).then(url => {
      if (!url) 
        return;
      ui.alert({text:'Cloning repository...'});
      gitRest.clone(url);
    });
  }

  function confirmClearData() {
    modal.confirm('This will delete all Codetmp saved files & folders on current browser. Continue?', false).then(async () => {
      await fileManager.TaskClearStorage();
      location.reload();
    });
  }
  
  function alert({text, isPersistent = false, timeout}) {
    aww.pop(text, isPersistent, timeout);
  }
  
  function fileDownload(self) {
    compoFileBundler?.fileDownload(self);
  }

  function resizeEditor() {
    let editor = fileTab[activeTab].editor;
    editor.env.editor.resize()
  }

  function newFile() {
    if (!$('#btn-menu-my-files').classList.contains('active')) {
      ui.openNewTab();
    }
  }
  
  function newDiskFile() {
    if (!$('#btn-menu-my-files').classList.contains('active')) {
      window.showSaveFilePicker({
        types: [
          {
            description: 'HTML (.html)',
            accept: {
              'text/javascript': ['.html'],
            },
          },
        ],
      }).then(fileHandle => {
        let tabData = {
          fileHandle,
          content: '',
          fid: '-' + (new Date).getTime(),
          name: fileHandle.name,
          editor: compoEditor.Init(),
        };
        ui.openNewTab(-1, tabData);
      });
    }
  }
  
  function OpenDiskFile() {
    compoFileReader.OpenDirectory();
  }

  function InitFileHandler() {
  
    if ('launchQueue' in window && 'files' in LaunchParams.prototype) {
      launchQueue.setConsumer((launchParams) => {
        if (!launchParams.files.length) {
          return;
        }
        for (const fileHandle of launchParams.files) {
          fileHandle.getFile().then(openOnEditor.bind(fileHandle));
        }
      });
      
      async function openOnEditor(fileRef) {
        let content = await fileRef.text();
        let tabData = {
          content,
          fileHandle: this,
          fid: '-' + (new Date).getTime(),
          name: fileRef.name,
          editor: compoEditor.Init(content),
        };
        ui.openNewTab(-1, tabData);
      }
      
    }
    
  }

  function changeExplorerView(type) {
    if (!['list', 'grid'].includes(type))
      return;
  
    settings.data.explorer.view = type;
    settings.save();
    $('._fileList').classList.toggle('list-view', (type == 'list'));
    for (let node of $$('.Btn[data-callback="change-file-list-view"]')) {
      node.classList.toggle('active', false);
      if (node.dataset.type == type) {
        node.classList.toggle('active', true);
        $('#view-type-icon').innerHTML = node.querySelector('.material-icons').innerHTML;
      }
    }
  }

  function attachListeners() {
    window.addEventListener('online', () => app.AutoSync());
    window.addEventListener('cut', (evt) => compoClipboard.handler(evt));
    window.addEventListener('copy', (evt) => compoClipboard.handler(evt));
    window.addEventListener('paste', (evt) => compoClipboard.handler(evt));
    window.onbeforeunload = function(evt) {
      return helperUtils.redirectWarning(evt);
    };
  }

  async function hidePalette(event) {
    await delayMs(10);
    let el = $('.search-box');
    el.classList.toggle('w3-hide', true);
    $('#search-input').value = '';
    $('#search-input').removeEventListener('blur', ui.hidePalette);
  }

  function delayMs(timeout) {
    return new Promise(resolve => window.setTimeout(resolve, timeout));
  }


  function toggleBreakPoint(editor) {
    let row = editor.selection.getCursor().row;
    if(editor.session.getBreakpoints()[row] ) {
      editor.session.clearBreakpoint(row);
    } else {
      editor.session.setBreakpoint(row);
    }
  }

  function waitMaterialIconsOverflow() {
    // prevent content shift by material icons
    new Promise(resolve => {
      let interval = setInterval(() => {
        if (document.querySelector('._btnMenuPreview').firstElementChild.scrollWidth > 50) return;
        clearInterval(interval);
        resolve();
      }, 100);
    }).then(() => {
      document.querySelector('#preload-material').parentNode.removeChild(document.querySelector('#preload-material'));
    });
  }

  function Init() {
    
    waitMaterialIconsOverflow();
    attachListeners();

    compoNotif.Init();

    preferences.loadSettings();
    ui.openNewTab();
    compoFileTab.InitTabFocusHandler();
    window.setTimeout(() => { 
      ui.resizeEditor();
    }, 350)
    
    // initMenuBar();
    changeExplorerView(settings.data.explorer.view);

    fileManager.TaskOnStorageReady().then(async () => {
      let sessionData = await compoSessionManager.TaskRestoreSession();
      if (sessionData && sessionData.activeWorkspace == 2) {
        ui.SetActiveWorkspace(sessionData.activeWorkspace);
      }

      let activeWorkspace = GetActiveWorkspace();
      await ui.TaskChangeWorkspaceByIndex(activeWorkspace)

      if (sessionData) {
        await compoSessionManager.TaskRestoreOpenFileHandlers(sessionData);
      }
    });

    for (let modal of $$('.modal-window')) {
      modal.classList.toggle('transition-enabled', true);
      modal.querySelector('.Overlay').addEventListener('click', ui.ToggleModalByClick);
      modal.querySelector('.Btn-close').addEventListener('click', ui.ToggleModalByClick);
    }
    
    DOMEvents.Init();

  }

  return SELF;
  
})();