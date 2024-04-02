const compoFileTab = (function() {

  "use strict";

  let $ = document.querySelector.bind(document);
  let $$ = document.querySelectorAll.bind(document);

  let SELF = {
    list,
    focusTab,
    changeFocusTab,
    openDirectory,
    GetByFid,
    GetIndexByFid,
    newTab: NewTab,
    ConfirmCloseTab,
    FileClose,
    InitTabFocusHandler,
  };

  let lastOpenTabIndex = 0;

  function GetByFid(fid) {
    let item = fileTab.find(tab => tab.fid == fid);
    if (item) {
      return item;
    }
    return null;
  }

  function GetIndexByFid(fid) {
    return fileTab.findIndex(tab => tab.fid == fid);
  }

  function tabFocusHandler(e) {
    if (e.keyCode === 9) {
      document.body.classList.add('tab-focused');
      window.removeEventListener('keydown', tabFocusHandler);
      window.addEventListener('mousedown', disableTabFocus);
    }
  }

  function disableTabFocus() {
    document.body.classList.remove('tab-focused');
    window.removeEventListener('mousedown', disableTabFocus);
    window.addEventListener('keydown', tabFocusHandler);
  }

  function InitTabFocusHandler() {
    window.addEventListener('keydown', tabFocusHandler);
  }

  function FileClose(fid) {
    let idx;
    if (fid)
      idx = odin.idxOf(String(fid), fileTab, 'fid')
    else
      idx = activeTab
    
    if (activeTab == idx) {
      activeTab = idx
      ConfirmCloseTab()
    } else {
      let tmp = activeTab;
      activeTab = idx;
      if (idx < tmp)
        ConfirmCloseTab(true, tmp-1)
      else
        ConfirmCloseTab(true, tmp)
    }
  }

  function NewTab(position, data) {
    
    let fid, el;
    let name = 'untitled.html';
    if (data) {
      fid = data.fid
      
      el = uiFileTab.CreateElement({
        fid,
        name: data.name,
        fiber: 'close'
      });

      if (data.file) {
        el.querySelector('.file-tab').dataset.parentId = data.file.parentId;
      }
      if (data.fileHandle === undefined) {
        data.fileHandle = null;
      }
    } else {
      fid = '-' + (new Date).getTime();

      el = uiFileTab.CreateElement({
        fid,
        name,
        fiber: 'close',
      });
      
    }
    
    if (position >= 0) {
      $('#file-title')?.insertBefore(el, $$('.file-tab')[position])
    } else {
      $('#file-title')?.append(el)
    }
    
    
    if (data) {
      if (position >= 0)
        fileTab.splice(position, 0, data);
      else
        fileTab.push(data)
    } else {
      let tabData = {
        name,
        fid,
        editor: compoEditor.Init(),
        fiber: 'close',
        fileHandle: null,
      };
      fileTab.push(tabData);
    }
    
    SELF.focusTab(fid)

  }

  function list() {
    $('#file-title')?.replaceChildren();
    let fragment = document.createDocumentFragment();
    for (let tab of fileTab) {
      let el = uiFileTab.CreateElement({
        fid: tab.fid,
        name: tab.name,
        fiber: tab.fiber,
      });
      fragment.append(el);
    }
    $('#file-title')?.replaceChildren(fragment);
  }

  function focusTab(fid, isRevealFileTree = true) {
    let idx = odin.idxOf(String(fid), fileTab, 'fid');
    
    for (let tab of $$('.file-tab')) {
      tab.classList.toggle('isActive', false);
    }
    
    ui.highlightTree(fid, isRevealFileTree);

    $$('.file-tab')[idx].classList.toggle('isActive', true);
    
    compressTab(idx);
    activeTab = idx;
    $('#editor-wrapper')?.replaceChildren(fileTab[idx].editor)
    
    let editor = fileTab[idx].editor.env.editor;
    editor.session.setUseWrapMode(settings.data.editor.wordWrapEnabled);
    editor.setFontSize(compoEditor.editorManager.fontSize);
    activeFile = (String(fid)[0] == '-') ? null : fileTab[activeTab].file;
    compoEditor.SetMode(fileTab[activeTab].name);  
    
    editor.focus();

  }

  function compressTab(idx) {
    for (let tab of $$('.file-tab'))
      tab.style.display = 'inline-block';

    $('#more-tab').style.display = ($$('.file-tab').length > 1 && getTabWidth() >= $('#file-title').offsetWidth - 48) ? 'inline-block' : 'none';
    let maxOpenTab = Math.floor(($('#file-title').offsetWidth - 48) / $$('.file-tab')[idx].offsetWidth);

    if ($$('.file-tab').length > maxOpenTab) {
      let lastOpenedTabIndex = Math.max(idx, $$('.file-tab').length - 1);
      let firstOpenedTabIndex = Math.max(lastOpenedTabIndex - (maxOpenTab - 1), 0);
      
      if (idx >= lastOpenTabIndex && idx <= lastOpenTabIndex + maxOpenTab - 1) {
        firstOpenedTabIndex = lastOpenTabIndex;
        lastOpenedTabIndex = firstOpenedTabIndex + maxOpenTab - 1;
      }
      
      while (idx < firstOpenedTabIndex) {
        lastOpenedTabIndex--;
        firstOpenedTabIndex--;
      }
      
      for (let i=0; i<$$('.file-tab').length; i++) {
        let el = $$('.file-tab')[i];
        if (i < firstOpenedTabIndex || i > lastOpenedTabIndex)
          el.style.display = 'none';
        else
          el.style.display = 'inline-block';
      }
      
      lastOpenTabIndex = firstOpenedTabIndex;
    }
  }

  
  function ConfirmCloseTab(focus = true, comeback) {
    if (focus) {
      if ($$('.file-tab')[activeTab].querySelector('.icon-rename').textContent.trim() != 'close') {
          modal.confirm('Changes you made will be lost.').then(() => {
            changeFocusTab(focus, comeback);
          }).catch(() => fileTab[activeTab].editor.env.editor.focus())
        } else {
          changeFocusTab(focus, comeback);
        } 
    } else {
      closeActiveTab()
    }
  }

  function closeActiveTab() {
    let fid = parseInt(fileTab[activeTab].fid); 
    app.getComponent('fileTree').then(fileTree => {
      fileTree.removeOpenIndicator(fid);
    });
    $('#file-title')?.removeChild($$('.file-tab')[activeTab]);
    fileTab.splice(activeTab, 1);
  }

  function getTabWidth() {
    let width = 0;
    for (let tab of $$('.file-tab'))
      width += tab.offsetWidth;
    return width;
  }

  function changeFocusTab(focus, comeback) {
    closeActiveTab()
    if (fileTab.length == 0) {
      ui.openNewTab()
      activeFile = null;
    } else {
      if (comeback === undefined) {
        let isRevealFileTree = false;
        if (activeTab == 0)
          focusTab(fileTab[0].fid, isRevealFileTree);
        else
          focusTab(fileTab[activeTab-1].fid, isRevealFileTree);
      }
    }
  }

  async function openDirectory(fid) {
    breadcrumbs.splice(1);
    let parentId = fid;
    while (parentId != -1) {
      let folder = await fileManager.TaskGetFile({fid: parentId, type: 'folders'});
      breadcrumbs.splice(1, 0, {folderId:folder.fid, title: folder.name});
      parentId = folder.parentId;
    }
    uiFileExplorer.LoadBreadCrumbs();
    $('#btn-menu-my-files')?.click();
    if (breadcrumbs.length > 1) {
      breadcrumbs.pop();
    }
    await fileManager.OpenFolder(fid);
  }

  return SELF;

})();