let cantLock = false;
let debugAttempUrl = '';
let lastOpenTabIndex = 0;

const ui = {
  
  fm: {
    renameFolder: function() {
      
      let folder = odin.dataOf(selectedFile[0].getAttribute('data'), fs.data.folders, 'fid');
      
      let name = window.prompt('Folder name', folder.name);
      if (name === null || name === folder.name)
        return;
      if (name.trim().length === 0)
        name = folder.name;
      
      let modifiedTime = new Date().toISOString();
      folder.name = name;
      folder.modifiedTime = modifiedTime;
      
      handleSync({
        fid: folder.fid,
        action: 'update',
        metadata: ['name'],
        type: 'folders'
      });
      drive.syncToDrive();
      
      fs.save();
      fileList();
      
      $('#btn-rename-folder').classList.toggle('w3-hide', true);
    },
    newFolder: function() {
      
      let name = window.prompt('Folder name','Untitled');
      if (name === null)
        return;
      if (name.trim().length === 0)
        name = 'Untitled';
      
      let modifiedTime = new Date().toISOString();
      let data = {
        name,
        modifiedTime,
        parentId: activeFolder
      };
      
      fm.INSERT.folder(data);
      
      handleSync({
        fid: fs.data.counter.folders-1,
        action: 'create',
        type: 'folders'
      });
      drive.syncToDrive();
      
      fs.save();
      fileList();
    },
    deleteFolder: function() {
      
      if (!window.confirm('Sub files & folders will also be delete. Delete anyway?')) return;
      
      let data = odin.dataOf(selectedFile[0].getAttribute('data'), fs.data.folders, 'fid');
      data.trashed = true;
      
      handleSync({
        fid: data.fid,
        action: 'update',
        metadata: ['trashed'],
        type: 'folders'
      });
      drive.syncToDrive();
      
      fs.save();
      fileList();
      selectedFile.splice(0, 1);
    },
    newFile: function() {
      
      let name = window.prompt('File name', $('.file-name')[activeTab].textContent);
        
      if (name === null)
        return;
      if (name.trim().length === 0)
        name = 'Untitled File';
      
      let modifiedTime = new Date().toISOString();
      let data = {
        name,
        modifiedTime,
        content: $('#editor').env.editor.getValue(),
        loaded: true,
        parentId: activeFolder,
        description: getDeploySetting()
      };
      
      let file = fm.INSERT.file(data);
      
      handleSync({
        fid: fs.data.counter.files-1,
        action: 'create',
        type: 'files'
      });
      drive.syncToDrive();
      
      fs.save();
      fileList();
      
      
      closeTab(false);
      newTab(activeTab, {
        fid: file.fid,
        scrollTop: 0,
        row: $('#editor').env.editor.getCursorPosition().row,
        col: $('#editor').env.editor.getCursorPosition().column,
        name: file.name,
        content: file.content,
        fiber: 'close',
        file: file,
        undo: new ace.UndoManager()
      });
      
    },
    deleteFile: function(fid) {
      
      if (!window.confirm('Delete this file?')) return;
      
      if (typeof(fid) === 'undefined')
        fid = selectedFile[0].getAttribute('data');
        
      let data = odin.dataOf(fid, fs.data.files, 'fid');
      data.trashed = true;
      
      if (activeFile && data.fid === activeFile.fid)
      {
        activeFile = undefined;
        $('.icon-rename')[activeTab].textContent = 'fiber_manual_record';
        $('#editor').addEventListener('keydown', saveListener);
      }
      
      for (let sync of fs.data.sync)
      {
        if (sync.action === 52 && sync.copyId === fid)
          sync.action = 12;
      }
      
      handleSync({
        fid: data.fid,
        action: 'update',
        metadata: ['trashed'],
        type: 'files'
      });
      drive.syncToDrive();
      
      fs.save();
      fileList();
      selectedFile.splice(0, 1);
      locked = -1;
    }
  },
  toggleMenu: function(callback){
    
    let targetId = this.getAttribute('target');
    let target;
    if (targetId)
      target = $('#'+targetId);
    else
      target = this;

    target.classList.toggle('active');
    
    
    target.lastElementChild.classList.toggle('active');
    target.firstElementChild.classList.toggle('active');
    let menuId = target.getAttribute('menu');
    let menu = $('#'+menuId);
    let block = $('#'+menuId+'-block');
    
    if (target.classList.contains('active') && (menuId === 'in-my-files' || menuId === 'in-trash' || menuId === 'in-settings')) {
      
      $('#list-trash').innerHTML = '';
      $('#file-list').innerHTML = '';
      if (menuId === 'in-my-files')
        fileList();
      else if (menuId === 'in-trash')
        trashList();

      toggleInsertSnippet(false);
    }

    if (!menu) {
      
      setTimeout(function(){
        target.classList.toggle('active',false);
        target.lastElementChild.classList.toggle('active',false);
        target.firstElementChild.classList.toggle('active',false);
      }, 500);
      return
    }
    
    
    for (let el of $('.btn-material')) {
      
      if (el !== target) {
        
        if (!el.classList.contains('active')) continue;
        el.classList.toggle('active',false)
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
    block.classList.toggle('active');
    
    if (!menu.classList.contains('active')) {
      selectedFile = [];
      clipBoard = [];
    }
    
    let isActive = menu.classList.contains('active');
    
    if (callback) callback(isActive);
  },
  
  switchTab: function(direction = 1) {
  
    if (fileTab.length == 1) return;
    
    let fid;
    
    if (activeTab + direction > 0 && activeTab + direction < fileTab.length)
      fid = fileTab[activeTab + direction].fid
    else
      fid = (activeTab + direction == -1) ? fileTab[fileTab.length - 1].fid : fileTab[0].fid;
    
    fileTab[activeTab].scrollTop = $('#editor').env.editor.getSession().getScrollTop();
    fileTab[activeTab].row = $('#editor').env.editor.getCursorPosition().row;
    fileTab[activeTab].col = $('#editor').env.editor.getCursorPosition().column;
    fileTab[activeTab].content = $('#editor').env.editor.getSession().getValue();
    fileTab[activeTab].fiber = $('.icon-rename')[activeTab].textContent;
    focusTab(fid);
  }
  
};


function saveListener(event, bypass = false) {
  
  if (!bypass) {
    
    let exclude = [16, 17, 18, 20, 27, 91, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 122, 123];
    if (exclude.indexOf(event.keyCode) >= 0 ||
    keyHandle.Control && event.keyCode === 67 ||
    keyHandle.Alt && event.keyCode === 188 ||
    keyHandle.Alt && event.keyCode === 190 ||
    keyHandle.Control && event.keyCode === 82 ||
    keyHandle.Alt && event.keyCode === 13 ||
    event.ctrlKey && event.key === 'k' ||
    event.altKey && event.key === 'd' ||
    event.altKey && event.key === 'w' ||
    event.altKey && event.key === 'n' ||
    event.altKey && event.key === 'm' ||
    event.altKey && event.key === 'i' ||
    event.altKey && event.key === 'l' ||
    event.altKey && event.key === 'j' ||
    keyHandle.Control && event.keyCode === 13) return;
  }
  
  if ($('#editor').env.editor.isFocused()) {
    
    $('.icon-rename')[activeTab].textContent = 'fiber_manual_record';
    $('.icon-rename')[activeTab].classList.toggle('w3-hide', false);
    $('#editor').env.editor.removeEventListener('keydown', saveListener);
  }
}
  
function blurNavigation() {
  $('#nav-bar').classList.toggle('hoverable');
  setTimeout(() => {
    $('#nav-bar').classList.toggle('hoverable');
  }, 250);
}

function attachMenuLinkListener() {
  
  for (let link of $('.menu-link')) {
    
    switch (link.dataset.link) {
      case 'save':
      case 'preview':
        link.onclick = () => {
          $('#btn-menu-' + link.dataset.link).click();
          blurNavigation()
        };
      break;
      case 'deploy':
        link.onclick = () => {
          renderAndDeployLocked();
          blurNavigation()
        };
      break;
      case 'download-rendered':
        link.onclick = () => {
          fileDownload(uploadBody);
          blurNavigation()
        };
      break;
      case 'deploy-single':
        link.onclick = () => {
          renderAndDeploySingle();
          blurNavigation()
        };
      break;
      case 'my-files':
        link.onclick = () => {
          $('#btn-menu-my-files').click();
          blurNavigation()
        };
      break;
      case 'file info':
        link.onclick = () => {
          
          setTimeout(function() {
            let isOpened = environment.toggle();
            if (isOpened)
              $('#editor').env.editor.blur()
            else
              $('#editor').env.editor.focus()
          }, 1)
          
          blurNavigation()
        };
      break;
      case 'trash':
        link.onclick = () => {
          if (!$('#in-trash').classList.contains('active'))
            $('#btn-menu-trash').click();
          blurNavigation()
        };
      break;
      case 'toggle-wrap-mode':
        link.onclick = () => {
          let isWrap = editor.env.editor.session.getUseWrapMode();
          editor.env.editor.session.setUseWrapMode(isWrap ? false : true);
        };
      break;
      case 'toggle-editor-theme':
        link.onclick = () => {
          if (editor.env.editor.getTheme().includes('monokai'))
            editor.env.editor.setTheme('ace/theme/github');
          else
            editor.env.editor.setTheme('ace/theme/monokai');
        }
      break;
      case 'set-font-size':
        link.onclick = () => {
          let size = parseInt(window.prompt('Prefered font size', 14));
          if (size)
            editor.env.editor.setFontSize(size);
        }
      break;
      case 'about':
        link.onclick = () => {
          if (!$('#in-home').classList.contains('active'))
            $('#btn-home').click();
          blurNavigation()
        };
      break;
      case 'settings':
        link.onclick = () => {
          if (!$('#in-settings').classList.contains('active'))
            $('#btn-menu-settings').click();
          blurNavigation();
        };
      break;
    }
  }
}

function fixCss(callback, total = 0, epoch = 5) {
  
  let i = 0;
  let totOffset = 0;
  let navBarOffset = $('#nav-bar').offsetHeight;
  
  for (let H of $('.menu-overflow-header')) {
    
    $('.menu-overflow-content')[i].style.height = 'calc(100% - '+(H.offsetHeight+navBarOffset)+'px)';
    i++;
    totOffset += H.offsetHeight+navBarOffset;
  }
  
  if (total === totOffset)
    epoch -= 1;
  
  if (epoch >= 0) {
    setTimeout(function() {
      fixCss(callback, totOffset, epoch);
    }, 50)
  } else {
    callback();
    attachMenuLinkListener();
  }
}

function updateUI() {
  
  fileList();
  if (localStorage.getItem('homepage') == 'false') {
    
    $('#check-show').checked = false;
    $('#btn-home').classList.toggle('active', false)
    $('#btn-home').firstElementChild.classList.toggle('active', false)
    $('#in-home').classList.toggle('active');
  } else {
    
    $('#btn-home').classList.toggle('active', true)
    $('#btn-home').firstElementChild.classList.toggle('active', true)
  }

  document.body.removeChild($('#preload-style'));

  fixCss(function() {
  
    THOR.plugins.loadEditor(false);
    THOR.plugins.dragDrop();
  
    newTab();
    
    window.name = 'parent';
    window.environment = anibar('main-editor');
  
    if ($('#btn-menu-save').offsetWidth > 100) {
      
      document.head.appendChild( o.cel('link', {
        rel: 'stylesheet',
        href: 'fonts/material/material-icons.css'
      }) );
    }
    
    fixEditorScreenHeight();
  
    o.listen({
      'btn-blog-vc'           : openBlossemHTMLWidget,
      'btn-blogsphere-login'  : auth0.login,
      'btn-blogsphere-logout' : btnBlogsphereLogout,
      'btn-create-template'   : createBlogTemplate,
      'btn-create-entry'      : createBlogEntry,
      'btn-create-app'        : createBlogApp,
      'btn-menu-template'     : toggleInsertSnippet,
      'btn-new-folder'        : ui.fm.newFolder,
      'btn-rename-folder'     : ui.fm.renameFolder,
      'btn-backup-revision'   : keepRevision,
      'btn-list-revisions'    : listRevisions,
      'btn-delete-file'       : btnDeleteFile,
      'btn-open-directory'    : btnOpenDirectory,
      'btn-download-file'     : fileDownload,
      'btn-refresh-sync'      : drive.syncFromDrive,
      'btn-menu-save'         : fileSave,
      '.btn-material'         : ui.toggleMenu,
      'btn-menu-preview'      : btnPreview,
      'btn-menu-info'         : btnInfo,
      '.file-settings-button' : showFileSetting,
      'more-tab'              : ui.switchTab,
    });
    
  });
}

function showFileSetting(section = this.dataset.section) {
  
  for (let element of $('.file-settings-button')) {
    if (element.dataset.section == section)
      element.classList.toggle('hide', true);
  }
  
  for (let element of $('.file-settings')) {
    if (element.dataset.section == section)
      element.classList.toggle('hide', false);
  }
}

// end of package

function toggleInsertSnippet(persistent) {
  if ($('#in-my-files').classList.contains('active') || $('#in-settings').classList.contains('active')) return

  let el = $('.search-box')[0];

  if (persistent === undefined)
    el.classList.toggle('w3-hide');
  else
    el.classList.toggle('w3-hide', !persistent);

  if (!el.classList.contains('w3-hide')) {
    $('#search-input').value = '';
    $('#search-input').focus();
  } else {
    setTimeout(() => { document.activeElement.blur() }, 1);
    if (typeof(persistent) === 'undefined')
      editor.env.editor.focus();
    $('#search-input').value = '';
    $('#search-input').blur();
  }
}


function changePersonal(value) {
  
  localStorage.setItem('homepage', value);
}


function isSameTab(valueCheck1, valueCheck2) {
  
  if (valueCheck1 == valueCheck2) {
    $('#editor').env.editor.focus();
    return true;
  }
  
  return false;
}

function compressTab(idx) {
  for (let tab of $('.file-tab'))
    tab.style.display = 'inline-block';

  $('#more-tab').style.display = ($('.file-tab').length > 1 && getTabWidth() >= $('#file-title').offsetWidth - 48) ? 'inline-block' : 'none';
  let maxOpenTab = Math.floor(($('#file-title').offsetWidth - 48) / $('.file-tab')[idx].offsetWidth);

  if ($('.file-tab').length > maxOpenTab) {
    let lastOpenedTabIndex = Math.max(idx, $('.file-tab').length - 1);
    let firstOpenedTabIndex = Math.max(lastOpenedTabIndex - (maxOpenTab - 1), 0);
    
    if (idx >= lastOpenTabIndex && idx <= lastOpenTabIndex + maxOpenTab - 1) {
      firstOpenedTabIndex = lastOpenTabIndex;
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
    
    lastOpenTabIndex = firstOpenedTabIndex;
  }
}

function focusTab(fid, isActiveTab = false, isClose) {
  
  let idx = odin.idxOf(String(fid), fileTab, 'fid');
  if (isActiveTab && isSameTab(activeTab, idx)) return;
  
  for (let tab of $('.file-tab'))
    tab.lastElementChild.style.background = '#202020';
  
  $('.file-tab')[idx].lastElementChild.style.background = '#154358';
  
  compressTab(idx);
  
  if (!isClose && activeTab !== idx) {
    
    fileTab[activeTab].undo = $('#editor').env.editor.getSession().getUndoManager();
    fileTab[activeTab].scrollTop = $('#editor').env.editor.getSession().getScrollTop();
    fileTab[activeTab].row = $('#editor').env.editor.getCursorPosition().row;
    fileTab[activeTab].col = $('#editor').env.editor.getCursorPosition().column;
    fileTab[activeTab].content = $('#editor').env.editor.getSession().getValue();
    fileTab[activeTab].fiber = $('.icon-rename')[activeTab].textContent;
    $('#editor').env.editor.getSession().setUndoManager(new ace.UndoManager())
  }
  
  activeTab = idx;
  
  $('#editor').env.editor.setValue(fileTab[activeTab].content);
  $('#editor').env.editor.clearSelection();
  $('#editor').env.editor.getSession().setScrollTop(fileTab[activeTab].scrollTop);
  $('#editor').env.editor.moveCursorTo(fileTab[activeTab].row, fileTab[activeTab].col);
  $('#editor').env.editor.focus()
  $('#editor').env.editor.getSession().setUndoManager(fileTab[activeTab].undo)

  activeFile = (String(fid)[0] == '-') ? undefined : fileTab[activeTab].file;
  setEditorMode(fileTab[activeTab].name);
  
  let settings = {};
  if (activeFile)
    settings = activeFile.description.startsWith('{') ? JSON.parse(activeFile.description) : parseDescriptionOld(activeFile.description);
    
  openDevelopmentSettings(settings);
  
}

function fixOldSettings(key, desc, settings) {
  if (key == 'blogName' && settings.blog)
    desc.value = settings.blog;
  else if (key == 'entryId' && settings.eid)
    desc.value = settings.eid;
  else if ((key == 'isWrap' && settings.pre) ||
  (key == 'isSummaryFix' && settings.bibibi) ||
  (key == 'isBreak' && settings.more)
  )
    desc.checked = true;
}

function openDevelopmentSettings(settings) {
	for (let desc of $('.description')) {
	  let key = desc.getAttribute('name');
    if (['text','textarea','hidden'].includes(desc.type))
      desc.value = settings[key] || '';
    else if (desc.type == 'checkbox')
      desc.checked = settings[key] || false;
    fixOldSettings(key, desc, settings);
	}
	
  if (settings.blogName || settings.blog)
    showFileSetting('blogger');
  if (settings.hasRevision)
    showFileSetting('revisions');
  if (settings.blossem)
    showFileSetting('blossem');
}

function setEditorMode(fileName = '') {
  if (fileName.endsWith('.txt'))
    $('#editor').env.editor.session.setMode();
  else if (fileName.endsWith('.css'))
    $('#editor').env.editor.session.setMode("ace/mode/css");
  else if (fileName.endsWith('.js'))
    $('#editor').env.editor.session.setMode("ace/mode/javascript");
  else if (fileName.endsWith('.json'))
    $('#editor').env.editor.session.setMode("ace/mode/json");
  else
    $('#editor').env.editor.session.setMode("ace/mode/html");
}

function newTab(position, data) {
  
  for (let tab of $('.file-tab'))
    tab.lastElementChild.style.background = '#202020';
  
  let fid, el
  if (data) {
    fid = data.fid
    el = o.cel('div', {
      innerHTML: o.creps('tmp-file-tab', {
        fid,
        name: data.name,
        fiber: 'close'
      })
    })
  } else {
    fid = '-' + (new Date).getTime()
    el = o.cel('div', {
      innerHTML: o.creps('tmp-file-tab', {
        fid,
        name: 'Untitled File',
        fiber: 'close'
      })
    })
  }
  
  if (position >= 0) {
    $('#file-title').insertBefore(el.firstElementChild, $('.file-tab')[position])
    if ($('#file-title').lastElementChild !== $('#more-tab'))
      $('#file-title').append($('#more-tab'))
  } else
    $('#file-title').insertBefore(el.firstElementChild, $('#more-tab'))
  
  
  if (data) {
    if (position >= 0)
      fileTab.splice(position, 0, data);
    else
      fileTab.push(data)
  } else
    fileTab.push({
      fid,
      scrollTop: 0,
      row: 0,
      col: 0,
      content: '',
      fiber: 'close',
      undo: new ace.UndoManager()
    });
  
  focusTab(fid)
}

function getTabWidth() {
  let width = 0;
  for (let tab of $('.file-tab'))
    width += tab.offsetWidth;
  return width;
}

function closeTab(focus = true, comeback) {
  
  if (focus) {
    
    if ($('.file-tab')[activeTab].firstElementChild.firstElementChild.textContent.trim() != 'close') {
      
      if (!window.confirm('Changes you made may not be saved')) return;
    }
  }
  
  $('#file-title').removeChild($('.file-tab')[activeTab]);
  fileTab.splice(activeTab, 1);
  
  if (focus) {
    
    if (fileTab.length == 0) {
      
      $('#editor').env.editor.setValue('');
      newTab()
      activeFile = undefined;
    } else {
      
      if (comeback === undefined) {
        
        if (activeTab == 0)
          focusTab(fileTab[0].fid, false, true);
        else
          focusTab(fileTab[activeTab-1].fid, false, true);
      }
    }
  }
  
}


function openBlossemHTMLWidget() {
          
  oblog.config({ blog: $('#in-blog-name').value });
  oblog.getBlogId(function(blogId) {
      
    window.open('https://www.blogger.com/rearrange?blogID='+blogId+'&action=editWidget&sectionId=main&widgetType=null&widgetId=HTML1')
  })
}

function btnDeleteFile() {
  ui.fm.deleteFile(activeFile.fid);
}

function btnOpenDirectory() {
  openFolder(activeFile.parentFolderId);
  $('#btn-menu-my-files').click();
}

function btnInfo() {
  
  let isOpened = environment.toggle();
  if (isOpened)
    $('#editor').env.editor.blur()
  else
    $('#editor').env.editor.focus()
}


function checkBlossemURL() {
  let data = (locked >= 0) ? odin.dataOf(locked, fs.data.files, 'fid') : activeFile;
  let hasBlossemURL = false;
  let blossemURL = '';
  
  if (data) {
    let desc = JSON.parse(data.description);
    hasBlossemURL = desc.blossem ? true : false;
    blossemURL = desc.blossem ? desc.blossem : '';
  }
  
  return { hasBlossemURL, blossemURL };
}

function previewRenderedFile() {
  let check = checkBlossemURL();
  if (check.hasBlossemURL) {
    previewWindow = window.open(check.blossemURL, 'blossem');
  } else {
    if (debugAttempUrl.length > 0)
      previewWindow = window.open(debugAttempUrl, 'preview');
    else
      previewWindow = window.open('https://attemp.web.app/', 'preview');
  }
}

function btnPreview() {
  if (previewWindow === null || previewWindow.window === null || previewWindow.parent === null)
    previewRenderedFile();

  renderBlog();
}
      
function createBlogTemplate() {
  
  let templateName = window.prompt('Template name');
  if (!templateName) return;

  oblog.config({
    blog: $('#in-blog-name').value
  });
  
  aww.pop('creating blog template...');
  
  oblog.pages.list(response => {
    
    let notFound = true;
    for (let page of response.items) {
      if (page.title == 'Template :: '+templateName) {
        alert('Template already exists in Blogger. Please delete them manually');
        window.open('https://blogger.com/blogger.g?blogID='+oblog.authModule.auth.data.blogId+'#allpages');
        notFound = false;
        break;
      }
    }
    
    if (notFound) {
      oblog.pages.insert({
        title: 'Template :: '+templateName,
      }, response => {
      
        aww.pop('blog template created successfully...');
        $('#chk-in-pre').checked = true;
        $('#in-eid').value = 'p'+response.id;
        fileSave();
        
      }, 'id')
    }
    
  },'items(id,title)');
  
  
}

function createBlogEntry() {
  
  let templateName = window.prompt('Post title');
  if (!templateName) return;

  oblog.config({
    blog: $('#in-blog-name').value
  });
  
  aww.pop('creating blog entry...');
  
  oblog.posts.insert({
    title: templateName,
  }, response => {
    
    aww.pop('blog entry created successfully');
    $('#in-eid').value = response.id;
    fileSave();
    
  }, 'id')
  
  
}

function createBlogApp() {
  
  let templateName = window.prompt('Post title');
  if (!templateName) return;

  oblog.config({
    blog: $('#in-blog-name').value
  });
  
  aww.pop('creating blog entry...');
  
  oblog.posts.insert({
    title: templateName,
    labels: ['_bloggerApps'],
  }, response => {
    
    aww.pop('blog entry created successfully');
    $('#in-eid').value = response.id;
    $('#in-blog-id').value = response.blog.id;
    fileSave();
    
  }, 'id,blog(id)')
  
}

function getFileColor(fileName) {
  let defaultBg;
  if (fileName.includes('.blogger'))
    defaultBg = '#ffa51e';
  else if (fileName.includes('.css'))
    defaultBg = '#1e44ff';
  else if (fileName.includes('.js'))
    defaultBg = '#ccad1b';
  else if (fileName.includes('.html'))
    defaultBg = '#fb5c10';
  else if (fileName.includes('.tmp'))
    defaultBg = '#4aad4d';
  return defaultBg;
}
      
function btnBlogsphereLogout  () {
  
  $('#btn-blogsphere-login').style.display = 'block';
  $('#btn-blogsphere-logout').style.display = 'none';
  
  auth0.logout();
  auth0.auth.reset();
  fs.reset();
  settings.reset();
  aww.pop("You've been logged out from TMPmachine.");
  
  fileClose();
  activeFolder = -1;
  while (breadcrumbs.length > 1)
    breadcrumbs.splice(1,1);
    
  loadBreadCrumbs();
}

(function() {
  
  function forEachFolder(callback) {
    for (let i = 0; i < $('.folder-list').length; i++) {
      if ($('.folder-list')[i] == selectedFile[0]) {
        callback(i);
        break;
      }
    }
  }
  
  function forEachFile(callback) {
    for (let i = 0; i < $('.file-list').length; i++) {
      if ($('.file-list-clicker')[i] == selectedFile[0]) {
        callback(i);
        break;
      }
    }
  }
  
  function left() {
    
    if (selectedFile[0].classList.contains('folder-list')) {
      
      forEachFolder(i => {
        if (i - 1 >= 0)
          $('.folder-list')[i-1].click();
      });
      
    } else {
      
      forEachFile(i => {
        if (i - 1 >= 0)
          $('.file-list-clicker')[i-1].click();
        else if ($('.folder-list').length > 0)
          $('.folder-list')[$('.folder-list').length - 1].click();
      });
      
    }
  }
  
  function right() {
    
    if (selectedFile[0].classList.contains('folder-list')) {
      
      forEachFolder(i => {
        if (i + 1 < $('.folder-list').length) {
          $('.folder-list')[i + 1].click();
        } else {
          if ($('.file-list').length > 0)
            $('.file-list-clicker')[0].click();
        }
      });
      
    } else {
      
      forEachFile(i => {
        if (i + 1 < $('.file-list').length)
          $('.file-list-clicker')[i + 1].click();
      });
      
    }
  }
  
  function up(fileCount) {
    
    if (selectedFile[0].classList.contains('folder-list')) {
      
      forEachFolder(i => {
        if (i - fileCount >= 0)
          $('.folder-list')[i - fileCount].click();
        else if (i != 0)
          $('.folder-list')[0].click();
      });
      
    } else {
      
      forEachFile(i => {
        if (i - fileCount >= 0) {
          $('.file-list-clicker')[i - fileCount].click();
        } else if ($('.folder-list').length > 0) {
          let index = Math.ceil($('.folder-list').length / fileCount) * fileCount + (i - fileCount);
          if (index >= $('.folder-list').length)
            index -= fileCount;
          index = Math.max(0, index)
  
          $('.folder-list')[index].click();
        }
      });
      
    }
  }
  
  function down(fileCount) {
    
    
    if (selectedFile[0].classList.contains('folder-list')) {
      
      forEachFolder(i => {
        if (i + fileCount < $('.folder-list').length) {
          $('.folder-list')[i + fileCount].click();
        } else {
          let index = (i + fileCount) - Math.ceil($('.folder-list').length / fileCount) * fileCount;
          if (index <= -1)
            index += fileCount;
          index = Math.min($('.file-list').length - 1, index)
              
          if ($('.file-list').length > 0)
            $('.file-list-clicker')[index].click();
        }
      });
      
    } else {
      
      forEachFile(i => {
        if (i + fileCount < $('.file-list').length)
          $('.file-list-clicker')[i + fileCount].click();
        else if (i != $('.file-list').length - 1)
          $('.file-list-clicker')[$('.file-list').length - 1].click();
      });
      
    }
  }
  
  function selectFirstFile() {
    if ($('.folder-list').length > 0)
      $('.folder-list')[0].click();
    else
      $('.file-list-clicker')[0].click();
  }
  
  function navScrollUp() {
    let fileContainerOffsetTop = selectedFile[0].classList.contains('folder-list') ? selectedFile[0].offsetTop : selectedFile[0].parentNode.offsetTop;
    let scrollTop = (fileContainerOffsetTop - 3);
    if (scrollTop < $('#file-list').parentNode.scrollTop)
      $('#file-list').parentNode.scrollTop = scrollTop;
  }
  
  function navScrollDown() {
    let fileContainerOffsetTop = selectedFile[0].classList.contains('folder-list') ? selectedFile[0].offsetTop : selectedFile[0].parentNode.offsetTop;
    let scrollTop = (fileContainerOffsetTop - 108 + selectedFile[0].offsetHeight + 3) - ($('#in-my-files').offsetHeight - 108 - 64 - $('#nav-bar').offsetHeight);
    if (scrollTop > $('#file-list').parentNode.scrollTop)
      $('#file-list').parentNode.scrollTop = scrollTop;
  }
  
  function navigationHandler() {
    
    if (!$('#btn-menu-my-files').classList.contains('active')) return;
    event.preventDefault();
    
    let fileContainerWidth = (screen.width < 450) ? 153.2 : 203.2;
    let fileCount = Math.floor( ($('#file-list').offsetWidth - 16 * 2) / fileContainerWidth);
    
    switch (event.keyCode) {
      case 37:
      case 38:
        if (event.keyCode == 37)
          left();
        else
          up(fileCount);
        navScrollUp();
      break;
      case 39:
      case 40:
        if (selectedFile.length == 0) {
          selectFirstFile();
          navScrollUp();
        } else {
          if (event.keyCode == 39)
            right();
          else
            down(fileCount);
            
          navScrollDown();
        }
      break;
    }
  }

  window.navigationHandler = navigationHandler;
  
})();


function renderAndDeploySingle() {
  let tmpLocked = locked;
  locked = -1;
  
  renderBlog(true);
  deploy();
  
  locked = tmpLocked;
}

function renderAndDeployLocked() {
  renderBlog(true);
  deploy();
}
 
 
(function() {
  
  let keyboardShortcut = [];
  
  function previousFolder() {
    if ($('#btn-menu-my-files').classList.contains('active') && $('.breadcrumbs').length > 1) {
      event.preventDefault();
      $('.breadcrumbs')[$('.breadcrumbs').length-2].firstElementChild.click()
    }
  }
  
  function lockFile() {
    if ($('#btn-menu-my-files').classList.contains('active')) {
      if (selectedFile.length > 0 && selectedFile[0].classList.contains('file-list-clicker')) {
        for (let i=0; i<$('.file-list').length; i++) {
          if ($('.file-list-clicker')[i] == selectedFile[0]) {
            $('.btn-lock')[i].click()
            break;
          }
        }
      }
    }
  }
  
  function toggleMyFiles() {
    if (!keyHandle.Alt) return;
    
    $('#btn-menu-my-files').click()
    if ($('#btn-menu-my-files').classList.contains('active')) {
      $('#editor').env.editor.blur();
      setTimeout(() => { document.activeElement.blur() }, 1);
    }
    else
      $('#editor').env.editor.focus()
  }
  
  function keyEscape() {
    if (selectedFile.length > 0) {
      toggleFileHighlight(false);
      doubleClick = false;
      selectedFile.length = 0;
    } else if ($('#btn-menu-my-files').classList.contains('active')) {
      $('#btn-menu-my-files').click();
      $('#editor').env.editor.focus();
    }
  }
  
  function doubleClickOnFile() {
    selectedFile[0].click();
    if (selectedFile[0])
      selectedFile[0].click();
  }
  
  function renameFile() {
    if (selectedFile[0].dataset.type === 'folder')
      ui.fm.renameFolder();
    else
      fileRename(selectedFile[0].getAttribute('data'));
  }
  
  function deployFile() {
    if (keyHandle.Shift)
      renderAndDeploySingle();
    else
      renderAndDeployLocked();
  }
  
  function renderFile() {
    
    if (!cantLock) {
      cantLock = true;
      if (previewWindow === null || previewWindow.window === null || previewWindow.parent === null)
        previewRenderedFile();
      else
        renderBlog();
    }
  }
  
  function deleteSelected() {
    if (selectedFile.length > 0) {
      if (selectedFile[0].getAttribute('data-type') === 'folder')
        ui.fm.deleteFolder();
      else if (selectedFile[0].getAttribute('data-type') === 'file')
        ui.fm.deleteFile();
    }
  }
  
  function toggleTemplate() {
    $('#btn-menu-template').click();
  }
  
  function toggleFileInfo() {
    let isOpened = environment.toggle();
    if (isOpened)
      $('#editor').env.editor.blur()
    else
      $('#editor').env.editor.focus()
  }
  
  function openNewTab() {
    fileTab[activeTab].scrollTop = $('#editor').env.editor.getSession().getScrollTop();
    fileTab[activeTab].row = $('#editor').env.editor.getCursorPosition().row;
    fileTab[activeTab].col = $('#editor').env.editor.getCursorPosition().column;
    fileTab[activeTab].content = $('#editor').env.editor.getSession().getValue();
    fileTab[activeTab].fiber = $('.icon-rename')[activeTab].textContent;
    newTab();
  }
  
  function keyUpHandler(e) {
  
    switch (e.keyCode) {
      case 13:
      case 82:
        cantLock = false;
      break;
  		case 16:
  		case 17:
  		case 18:
  			keyHandle[e.key] = false;
  		break;
    }
  }
  
  function keyDownHandler(e) {
    
    switch (e.keyCode) {
      case 37:
      case 38:
      case 39:
      case 40:
        navigationHandler();
        return;
      break;
  		case 16:
  		case 17:
  		case 18:
  			keyHandle[e.key] = true;
  		break;
  	}
  	
    for (let shortcut of keyboardShortcut) {
      if (shortcut && shortcut.keyCode == e.keyCode && shortcut.Alt == keyHandle.Alt && shortcut.Control == keyHandle.Control) {
        shortcut.callback();
        break;
      }
    }
  }
  
  function keyCodeOf(key) {
    let keys = ['S','<','>','W','I','L','M','Escape','Delete','N','D','Enter','Backspace'];
    let keyCode = [83,188,190,87,73,76,77,27,46,78,68,13,8];
    return keyCode[keys.indexOf(key)];
  }
  
  function initKeyboardShortcut(data) {
    
    for (let i in data) {
      
      let shortcut = {
        Alt: false,
        Control: false,
        callback: null
      };
      
      if (i.includes('Alt+'))
        shortcut.Alt = true
      else if (i.includes('Control+'))
        shortcut.Control = true
      
      shortcut.keyCode = keyCodeOf(i.replace(/Alt\+|Control\+/g,''));
      shortcut.callback = data[i];
      
      keyboardShortcut.push(shortcut);
    }
    
  }
  
  function keyHandle(event) {
  	if (event.type == 'blur') {
  	  keyHandle.Shift = false;
  	  keyHandle.Control = false;
  	  keyHandle.Alt = false;
  	} else if (event.type == 'keyup') {
  	  keyUpHandler(event);
  	} else if (event.type == 'keydown') {
  	  keyDownHandler(event);
  	}
  }
  keyHandle.Alt = false;
  keyHandle.Control = false;
  keyHandle.Shift = false;
  window.keyHandle = keyHandle;
  
  initKeyboardShortcut({
    'Control+S': function() { event.preventDefault(); fileSave() },
    'Alt+L': lockFile,
    'Alt+M': toggleMyFiles,
    'Alt+I': toggleFileInfo,
    'Alt+D': function() { event.preventDefault(); toggleTemplate() },
    'Alt+N': openNewTab,
    'Alt+W': closeTab,
    'Alt+<': function() { ui.switchTab(-1) },
    'Alt+>': function() { ui.switchTab(1) },
    'Backspace': previousFolder,
    'Escape': keyEscape,
    'Delete': deleteSelected,
    'Enter': function() {
      if ($('#btn-menu-my-files').classList.contains('active') && selectedFile.length > 0) {
        event.preventDefault();
        doubleClickOnFile();
      }
    },
    'Control+Enter': function() {
      if ($('#btn-menu-my-files').classList.contains('active') && selectedFile.length > 0)
        renameFile();
      else
        renderFile();
    },
    'Alt+Enter': deployFile,
  });
  
  window.addEventListener('keydown', keyHandle);
  window.addEventListener('keyup', keyHandle);
  window.addEventListener('blur', keyHandle);
  
})();

window.addEventListener('copy', function(e) { copyFile(false) });
window.addEventListener('cut', function(e) { copyFile(true) });
window.addEventListener('paste', function(e) { pasteFile() });

window.onbeforeunload = function(e) {
  
  let notSaved = false;
  for (let icon of $('.icon-rename')) {
    if (icon.textContent !== 'close') {
      notSaved = true;
      break;
    }
  }
  
  if (fileTab.length > 1) {
    notSaved = true
  } else {
    if (fileTab[0].fid[0] !== '-')
      notSaved = true
  }
  
  if (notSaved)
    return  'Changes you made may not be saved';
}

function fixEditorScreenHeight() {
  let i = 0;
  let navBarOffset = $('#nav-bar').offsetHeight;
  for (let H of $('.menu-overflow-header')) {
    $('.menu-overflow-content')[i].style.height = 'calc(100% - ' + (H.offsetHeight + navBarOffset) + 'px)';
    i++;
  }
  
  if (editor.offsetWidth <= 600)
    editor.env.editor.session.setUseWrapMode(false)
  else
    editor.env.editor.session.setUseWrapMode(true)
}

window.onresize = fixEditorScreenHeight;

function authReady() {
  $('#btn-blogsphere-login').style.display = 'none';
  $('#btn-blogsphere-logout').style.display = 'block';
  
  if (fs.data.rootId === '')
    drive.readAppData();
  else {
    drive.syncFromDrive();
    drive.syncToDrive();
  }
  
  o.classList.toggle($('.auth-required'), ['unauthorized'], false);
  $('#txt-login-status').textContent = 'Account';
  $('#login-info').style.visibility = 'hidden';
}

function authLogin() {
  $('#btn-blogsphere-login').style.display = 'none';
  $('#btn-blogsphere-logout').style.display = 'block';
}

function authLogout() {
  $('#login-info').style.visibility = 'visible';
  
  $('#btn-blogsphere-login').style.display = 'block';
  $('#btn-blogsphere-logout').style.display = 'none';
  
  $('#txt-login-status').textContent = 'Login';
  o.classList.toggle($('.auth-required'), ['unauthorized'], true);
}

function lockRender(self, fid, name) {
  for (let el of $('.btn-lock'))
    el.classList.toggle('w3-text-purple', false)
  
  if (locked !== fid) {
    locked = fid;
    self.classList.toggle('w3-text-purple')
  } else {
    locked = -1;
  }
}

function toggleFileHighlight(isActive) {
  if (lastClickEl.dataset.type == 'file')
    o.classList.toggle(lastClickEl, 'bg3', isActive);
  else
    o.classList.toggle(lastClickEl, ['bg3','bg2'], isActive);
}