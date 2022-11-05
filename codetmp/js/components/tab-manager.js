"use strict";

const tabManager = new TabManagerComponent();

function TabManagerComponent() {

  let SELF = this;

  this.lastOpenTabIndex = 0;

  this.newTab = function(position, data) {
    let fid, el;
    let name = 'untitled.html';
    if (data) {
      fid = data.fid
      el = o.element('div', {
        innerHTML: o.template('tmp-file-tab', {
          fid,
          name: data.name,
          fiber: 'close'
        })
      });
      if (data.file)
        $('.file-tab', el)[0].dataset.parentId = data.file.parentId;
      if (data.fileHandle === undefined)
        data.fileHandle = null;
    } else {
      fid = '-' + (new Date).getTime();
      el = o.element('div', {
        innerHTML: o.template('tmp-file-tab', {
          fid,
          name,
          fiber: 'close',
        })
      })
    }
    
    if (position >= 0) {
      $('#file-title').insertBefore(el.firstElementChild, $('.file-tab')[position])
    } else {
      $('#file-title').append(el.firstElementChild)
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
        editor: initEditor(),
        fiber: 'close',
        fileHandle: null,
      };
      fileTab.push(tabData);
    }
    
    SELF.focusTab(fid)
  };

  this.list = function() {
    $('#file-title').innerHTML = '';
    let fragment = document.createDocumentFragment();
    for (let tab of fileTab) {
      let el = o.element('div', {
        innerHTML: o.template('tmp-file-tab', {
          fid: tab.fid,
          name: tab.name,
          fiber: tab.fiber,
        })
      })
      fragment.append(el.firstElementChild);
    }
    $('#file-title').append(fragment);
  };

  this.focusTab = function(fid, isRevealFileTree = true) {
    let idx = odin.idxOf(String(fid), fileTab, 'fid');
    
    for (let tab of $('.file-tab')) {
      tab.classList.toggle('isActive', false);
    }
    
    ui.highlightTree(fid, isRevealFileTree);

    $('.file-tab')[idx].classList.toggle('isActive', true);
    
    compressTab(idx);
    activeTab = idx;
    $('#editor-wrapper').innerHTML = '';
    $('#editor-wrapper').append(fileTab[idx].editor)
    
    let editor = fileTab[idx].editor.env.editor;
    editor.session.setUseWrapMode(settings.data.editor.wordWrapEnabled);
    editor.setFontSize(editorManager.fontSize);
    activeFile = (String(fid)[0] == '-') ? null : fileTab[activeTab].file;
    setEditorMode(fileTab[activeTab].name);  
    
    editor.focus();

  };

  function compressTab(idx) {
    for (let tab of $('.file-tab'))
      tab.style.display = 'inline-block';

    $('#more-tab').style.display = ($('.file-tab').length > 1 && getTabWidth() >= $('#file-title').offsetWidth - 48) ? 'inline-block' : 'none';
    let maxOpenTab = Math.floor(($('#file-title').offsetWidth - 48) / $('.file-tab')[idx].offsetWidth);

    if ($('.file-tab').length > maxOpenTab) {
      let lastOpenedTabIndex = Math.max(idx, $('.file-tab').length - 1);
      let firstOpenedTabIndex = Math.max(lastOpenedTabIndex - (maxOpenTab - 1), 0);
      
      if (idx >= tabManager.lastOpenTabIndex && idx <= tabManager.lastOpenTabIndex + maxOpenTab - 1) {
        firstOpenedTabIndex = tabManager.lastOpenTabIndex;
        lastOpenedTabIndex = firstOpenedTabIndex + maxOpenTab - 1;
      }
      
      while (idx < firstOpenedTabIndex) {
        lastOpenedTabIndex--;
        firstOpenedTabIndex--;
      }
      
      for (let i=0; i<$('.file-tab').length; i++) {
        if (i < firstOpenedTabIndex || i > lastOpenedTabIndex)
          $('.file-tab')[i].style.display = 'none';
        else
          $('.file-tab')[i].style.display = 'inline-block';
      }
      
      tabManager.lastOpenTabIndex = firstOpenedTabIndex;
    }
  }

  this.changeFocusTab = function(focus, comeback) {
    closeActiveTab()
    if (fileTab.length == 0) {
      newTab()
      activeFile = null;
    } else {
      if (comeback === undefined) {
        let isRevealFileTree = false;
        if (activeTab == 0)
          tabManager.focusTab(fileTab[0].fid, isRevealFileTree);
        else
          tabManager.focusTab(fileTab[activeTab-1].fid, isRevealFileTree);
      }
    }
  };

  SELF.openDirectory = async function(fid) {
    breadcrumbs.splice(1);
    let stack = [];
    let parentId = fid;
    while (parentId != -1) {
      let folder = await fileManager.get({fid: parentId, type: 'folders'});
      breadcrumbs.splice(1, 0, {folderId:folder.fid, title: folder.name});
      parentId = folder.parentId;
    }
    loadBreadCrumbs();
    $('#btn-menu-my-files').click();
    if (breadcrumbs.length > 1)
      breadcrumbs.pop();
    await fileManager.openFolder(fid);
  }

}