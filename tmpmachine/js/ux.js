let cantLock = false;
let activeMenu = '';

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
    
    if (target.classList.contains('active') && (menuId === 'in-project' || menuId === 'in-trash' || menuId === 'in-settings'))
    {
      if (menuId === 'in-project')
        fileList();
      else if (menuId === 'in-trash')
        trashList();

      toggleInsertSnippet(false);
    }

    if (!menu)
    {
      setTimeout(function(){
        target.classList.toggle('active',false);
        target.lastElementChild.classList.toggle('active',false);
        target.firstElementChild.classList.toggle('active',false);
      }, 500);
      return
    }
    
    
    for (let el of $('.btn-material'))
    {
      if (el !== target)
      {
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
    
    if (!menu.classList.contains('active'))
    {
      selectedFile = [];
      clipBoard = [];
    }
    
    let isActive = menu.classList.contains('active');
    
    if (!block.getAttribute('listener'))
    {
      block.setAttribute('target',this.getAttribute('id'));
      block.setAttribute('listener','true');
      o.listener(block,'click',[function(){
          target.click();
        }]);
    }
    
    if (callback) callback(isActive);
  }
};




window.addEventListener('copy', function(e) {
  copyFile(false);
});

window.addEventListener('cut', function(e) {
  copyFile(true);
});

window.addEventListener('paste', function(e) {
  pasteFile();
});




window.onbeforeunload = function(e) {
  var notSaved = false;
  for (let icon of $('.icon-rename'))
  {
    if (icon.textContent !== 'close')
    {
      notSaved = true;
      break;
    }
  }
  
  if (fileTab.length > 1)
    notSaved = true
  else
  {
    if (fileTab[0].fid[0] !== '-')
      notSaved = true
  }
  
  if (notSaved)
    return  'Changes you made may not be saved';
}

function handleKeyUp(e) {
  
  switch (e.keyCode) {
    
    case 8:
      if ($('#btn-menu-project').classList.contains('active')) {
        
        if ($('.breadcrumbs').length > 1)
          $('.breadcrumbs')[$('.breadcrumbs').length-2].firstElementChild.click()
      }
    break;
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




function saveListener(event, bypass = false) {
  
  if (!bypass)
  {
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
    event.altKey && event.key === 'l' ||
    event.altKey && event.key === 'j' ||
    keyHandle.Control && event.keyCode === 13) return;
  }
  
  $('.icon-rename')[activeTab].textContent = 'fiber_manual_record';
  $('.icon-rename')[activeTab].classList.toggle('w3-hide', false);
  $('#editor').env.editor.removeEventListener('keydown', saveListener);
}
  
function togglePreview() {
  $('#main-editor').classList.toggle('hide');
  setTimeout(() => {
    $('#btn-back-to-editor').classList.toggle('hide');
    $('#my-osk').classList.toggle('hide');
  }, 300);
}

function fixCss(callback, total = 0, epoch = 5) {
  
  let i = 0;
  let totOffset = 0;
  
  for (let H of $('.menu-overflow-header'))
  {
    $('.menu-overflow-content')[i].style.height = 'calc(100% - '+H.offsetHeight+'px)';
    i++;
    totOffset += H.offsetHeight;
  }
  
  if (total === totOffset)
    epoch -= 1;
  
  if (epoch >= 0)
  {
    setTimeout(function() {
      fixCss(callback, totOffset, epoch);
    }, 50)
  }
  else
  {
    callback();
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

function focusTab(fid, isClose) {
  
  let idx = odin.idxOf(String(fid), fileTab, 'fid');
  if (isSameTab(activeTab, idx)) return;
  
  for (let tab of $('.file-tab'))
    tab.lastElementChild.style.background = '#202020';
  
  $('.file-tab')[idx].lastElementChild.style.background = '#154358';
  
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
  $('#editor').env.editor.session.setMode("ace/mode/html");

  if (String(fid)[0] == '-')

    activeFile = undefined;
  else {

    if (fileTab[activeTab].name.endsWith('.css'))
      $('#editor').env.editor.session.setMode("ace/mode/css");
    else if (fileTab[activeTab].name.endsWith('.js'))
      $('#editor').env.editor.session.setMode("ace/mode/javascript");
    else if (fileTab[activeTab].name.endsWith('.json'))
      $('#editor').env.editor.session.setMode("ace/mode/json");
    else if (fileTab[activeTab].name.endsWith('.php'))
      $('#editor').env.editor.session.setMode("ace/mode/php");
      
    activeFile = fileTab[activeTab].file;
  }
  
  let x;
  if (activeFile)
    x = patob(activeFile.description)
  else
    x = {}

	$('#in-blog-name').value = x.blog || '';
	$('#in-eid').value = x.eid || '';
	$('#in-summary').value = x.summary || '';
	$('#in-summary').value = $('#in-summary').value.substring(1, $('#in-summary').value.length-1);
	$('#chk-more-tag').checked = x.more || false;
	$('#chk-bibibi').checked = x.bibibi || false;
	$('#chk-in-pre').checked = x.pre || false;
}

function newTab(position, data) {
  
  for (let tab of $('.file-tab'))
    tab.lastElementChild.style.background = '#202020';
  
  let fid, el
  if (data)
  {
    fid = data.fid
    el = o.cel('div', {
      innerHTML: o.creps('tmp-file-tab', {
        fid,
        name: data.name,
        fiber: 'close'
      })
    })
  }
  else
  {
    fid = '-' + (new Date).getTime()
    el = o.cel('div', {
      innerHTML: o.creps('tmp-file-tab', {
        fid,
        name: 'Untitled File',
        fiber: 'close'
      })
    })
  }
  
  if (position >= 0)
    $('#file-title').insertBefore(el.firstElementChild, $('.file-tab')[position])
  else
    $('#file-title').appendChild(el.firstElementChild)
  
  
  if (data)
  {
    if (position >= 0)
      fileTab.splice(position, 0, data);
    else
      fileTab.push(data)
  }
  else
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
      
      if (comeback != undefined) {
        
        if (isSameTab(activeTab, comeback)) return;
        activeTab = comeback;
        focusTab(fileTab[activeTab].fid, true);
      } else {
        
        if (activeTab == 0)
          focusTab(fileTab[0].fid, true);
        else
          focusTab(fileTab[activeTab-1].fid, true);
      }
    }
  }
}


function switchTab(dir) {

  let fid;
  
  if (activeTab+dir > 0 && activeTab+dir < fileTab.length)
    fid = fileTab[activeTab+dir].fid
  else
  {
    if (activeTab+dir == -1)
      fid = fileTab[fileTab.length-1].fid
    else
      fid = fileTab[0].fid
  }
  
  fileTab[activeTab].scrollTop = $('#editor').env.editor.getSession().getScrollTop();
  fileTab[activeTab].row = $('#editor').env.editor.getCursorPosition().row;
  fileTab[activeTab].col = $('#editor').env.editor.getCursorPosition().column;
  fileTab[activeTab].content = $('#editor').env.editor.getSession().getValue();
  fileTab[activeTab].fiber = $('.icon-rename')[activeTab].textContent;
  
  focusTab(fid);
}


function btnBlogVC() {
          
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
          $('#btn-menu-project').click();
        }
function btnPreview() {
          if (previewWindow === null || previewWindow.window === null || previewWindow.parent === null)
          {
            if ($('#in-blossem').value.trim().length > 0)
              previewWindow = window.open($('#in-blossem').value.trim(), 'blossem');
            else
              previewWindow = window.open('https://attemp.web.app/'+currentPage, 'preview');
          }
        
          renderBlog();
        }
        
        function authReady() {
        
        $('#btn-blogsphere-login').style.display = 'none';
        $('#btn-blogsphere-logout').style.display = 'block';
        
        if (fs.data.rootId === '')
          drive.readAppData();
        else
        {
          drive.syncFromDrive();
          drive.syncToDrive();
        }
        
        $('#txt-login-status').textContent = 'Logout';
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
      }
      
      function updateUI() {
        fileList();
      if (localStorage.getItem('homepage') == 'false')
      {
        $('#btn-home').click();
        $('#check-show').checked = false;
        $('#btn-home').classList.toggle('active', false)
        $('#btn-home').firstElementChild.classList.toggle('active', false)
      }
      else
      {
        $('#btn-home').classList.toggle('active', true)
        $('#btn-home').firstElementChild.classList.toggle('active', true)
      }

      document.body.removeChild($('#preload-style'));
      
      fixCss(function() {
        
        // load plugins here
        THOR.plugins.loadEditor(false);
        THOR.plugins.dragDrop();
        
        
        newTab();
        
        
        if ($('#btn-save').offsetWidth > 100)
        {
          document.head.appendChild( o.cel('link', {
            rel: 'stylesheet',
            href: 'fonts/material/material-icons.css'
          }) );
        }
        
      });
      }
      
      
      function btnBlogsphereLogout  () {
      
      $('#btn-blogsphere-login').style.display = 'block';
      $('#btn-blogsphere-logout').style.display = 'none';
      
      auth0.logout();
      aww.pop("You've been logged out from TMPmachine.");
      THOR.resetApp();
      
      fileClose();
      activeFolder = -1;
      while (breadcrumbs.length > 1)
        breadcrumbs.splice(1,1);
        
      loadBreadCrumbs();
    }
    
    
    
    
    
    
    
    function keyLock() {
      if ($('#btn-menu-project').classList.contains('active') && keyHandle.Alt)
      {
        if (selectedFile.length > 0 && selectedFile[0].classList.contains('file-list-clicker'))
        {
            for (let i=0; i<$('.file-list').length; i++)
            {
              if ($('.file-list-clicker')[i] == selectedFile[0])
              {
                $('.btn-lock')[i].click()
                break;
              }
            }
        }
      }
    }
    
    function keyToggleMyFiles() {
      if (keyHandle.Alt)
      {
        $('#btn-menu-project').click()
        if ($('#btn-menu-project').classList.contains('active'))
          $('#editor').env.editor.blur()
        else
          $('#editor').env.editor.focus()
      }
    }
    
    function keyEscape() {
      if (selectedFile.length > 0)
      {
        lastClickEl.classList.toggle('w3-light-blue', false);
        lastClickEl.classList.toggle('w3-hover-light-blue', false);
        doubleClick = false;
        selectedFile.length = 0;
      }
    }
    
    function keyLeft(e) {
      if ($('#btn-menu-project').classList.contains('active'))
      {
        e.preventDefault();
          if (selectedFile.length > 0)
          {
            let i;
            
            if (selectedFile[0].classList.contains('folder-list'))
            {
                for (i=0; i<$('.folder-list').length; i++)
                {
                  if ($('.folder-list')[i] == selectedFile[0])
                  {
                      if (i-1 >= 0)
                        $('.folder-list')[i-1].click();
                      break;
                  }
                }
            }
            else
            {
                for (i=0; i<$('.file-list').length; i++)
                {
                  if ($('.file-list-clicker')[i] == selectedFile[0])
                  {
                      if (i-1 >= 0)
                        $('.file-list-clicker')[i-1].click();
                      else
                      {
                          if ($('.folder-list').length > 0)
                            $('.folder-list')[$('.folder-list').length-1].click();
                      }
                      break;
                  }
                }
            }
            
          }
      }
    }
    
    function keyRight(e) {
      if ($('#btn-menu-project').classList.contains('active'))
      {
        e.preventDefault();
        if (selectedFile.length > 0)
        {
          let i;
          
          if (selectedFile[0].classList.contains('folder-list'))
          {
              for (i=0; i<$('.folder-list').length; i++)
              {
                if ($('.folder-list')[i] == selectedFile[0])
                {
                    if (i+1 < $('.folder-list').length)
                      $('.folder-list')[i+1].click();
                    else
                    {
                        if ($('.file-list').length > 0)
                          $('.file-list-clicker')[0].click();
                    }
                    break;
                }
              }
          }
          else
          {
              for (i=0; i<$('.file-list').length; i++)
              {
                if ($('.file-list-clicker')[i] == selectedFile[0])
                {
                    if (i+1 < $('.file-list').length)
                      $('.file-list-clicker')[i+1].click();
                    break;
                }
              }
          }
          
        }
        else
        {
          if ($('.folder-list').length > 0)
            $('.folder-list')[0].click();
          else
            $('.file-list-clicker')[0].click();
        }
      }
    }
    
    function keyUp(e) {
      if ($('#btn-menu-project').classList.contains('active'))
      {
          e.preventDefault();
          let div = Math.floor( ($('#file-list').offsetWidth - 16 * 2) / 203.2);
          
          if (selectedFile.length > 0)
            {
              let i;
              
              if (selectedFile[0].classList.contains('folder-list'))
              {
                  for (i=0; i<$('.folder-list').length; i++)
                  {
                    if ($('.folder-list')[i] == selectedFile[0])
                    {
                        if (i-div >= 0)
                          $('.folder-list')[i-div].click();
                        else if (i != 0)
                          $('.folder-list')[0].click();
                        break;
                    }
                  }
              }
              else
              {
                  for (i=0; i<$('.file-list').length; i++)
                  {
                    if ($('.file-list-clicker')[i] == selectedFile[0])
                    {
                        if (i-div >= 0)
                          $('.file-list-clicker')[i-div].click();
                        else
                        {
                            if ($('.folder-list').length > 0)
                            {
                              let targetIdx = Math.max(0, Math.ceil($('.folder-list').length/div)*div + (i-div));
                              if (targetIdx >= $('.folder-list').length)
                                targetIdx -= div;
                                
                              $('.folder-list')[targetIdx].click();
                            }
                        }
                        break;
                    }
                  }
              }
              
            }
      }
    }
    
    function keyDown(e) {
      if ($('#btn-menu-project').classList.contains('active'))
      {
          e.preventDefault();
          let div = Math.floor( ($('#file-list').offsetWidth - 16 * 2) / 203.2);
          
          if (selectedFile.length > 0)
          {
            let i;
            
            if (selectedFile[0].classList.contains('folder-list'))
            {
                for (i=0; i<$('.folder-list').length; i++)
                {
                    if ($('.folder-list')[i] == selectedFile[0])
                    {
                        if (i+div < $('.folder-list').length)
                          $('.folder-list')[i+div].click();
                        else
                        {
                            let targetIdx = Math.min($('.file-list').length-1, (i+div) - Math.ceil($('.folder-list').length/div)*div);
                            if (targetIdx <= -1)
                              targetIdx += div;
                                
                              
                            if ($('.file-list').length > 0)
                              $('.file-list-clicker')[targetIdx].click();
                        }
                        break;
                    }
                }
            }
            else
            {
                for (i=0; i<$('.file-list').length; i++)
                {
                    if ($('.file-list-clicker')[i] == selectedFile[0])
                    {
                        if (i+div < $('.file-list').length)
                          $('.file-list-clicker')[i+div].click();
                        else if (i != $('.file-list').length-1)
                          $('.file-list-clicker')[$('.file-list').length-1].click();
                        break;
                    }
                }
            }
            
          }
          else
          {
              if ($('.folder-list').length > 0)
                $('.folder-list')[0].click();
              else
                $('.file-list-clicker')[0].click();
          }
      }
    }
    
    function keyEnter(e) {
      if ($('#btn-menu-project').classList.contains('active') && selectedFile.length > 0) {
        
        e.preventDefault();
        selectedFile[0].click();
        if (selectedFile[0])
          selectedFile[0].click();
      } else {
        
          if (keyHandle.Control && !cantLock) {
            
            cantLock = true;
            
            if (previewWindow === null || previewWindow.window === null || previewWindow.parent === null) {
              
              if ($('#in-blossem').value.trim().length > 0)
                previewWindow = window.open($('#in-blossem').value.trim(), 'blossem');
              else {
                
                if (debugAttempUrl.length > 0)
                  previewWindow = window.open(debugAttempUrl+currentPage, 'preview');
                else
                  previewWindow = window.open('https://attemp.web.app/'+currentPage, 'preview');
              }
            } else
              renderBlog();
              
          } else if (keyHandle.Alt) {
            
            let tmpLocked = locked;
            locked = -1;
            
            renderBlog(true);
            chooseDeploy();
            
            locked = tmpLocked;
          }
      }
    }
    
    function keyDelete() {
      if (selectedFile.length > 0) {
        
        if (selectedFile[0].getAttribute('data-type') === 'folder')
          ui.fm.deleteFolder();
        else if (selectedFile[0].getAttribute('data-type') === 'file')
          ui.fm.deleteFile();
      }
    }
    
    function keyD(e) {
      if (keyHandle.Alt)
      {
        e.preventDefault();
        $('#btn-menu-template').click();
      }
    }
    
    function keyN(e) {
      if (keyHandle.Alt)
      {
        e.preventDefault();
        
        fileTab[activeTab].scrollTop = $('#editor').env.editor.getSession().getScrollTop();
        fileTab[activeTab].row = $('#editor').env.editor.getCursorPosition().row;
        fileTab[activeTab].col = $('#editor').env.editor.getCursorPosition().column;
        fileTab[activeTab].content = $('#editor').env.editor.getSession().getValue();
        fileTab[activeTab].fiber = $('.icon-rename')[activeTab].textContent;
        
        newTab();
      }
    }
    
    function keyS(e) {
      if (keyHandle.Control)
      {
        e.preventDefault();
        fileSave();
      }
    }
    
    function keyW(e) {
      
      if (keyHandle.Alt)
      {
        e.preventDefault();
        closeTab()
      }
    }
    
    function keyLeast(e) {
      if (keyHandle.Alt)
      {
        e.preventDefault();
        if (fileTab.length == 1) return;
        
        switchTab(-1);
      }
    }
    
    function keyLarger(e) {
      if (keyHandle.Alt)
      {
        e.preventDefault();
        if (fileTab.length == 1) return;
        
        switchTab(1);
      }
    }
    
function handleKeyDown(e) {
  
  switch (event.keyCode) {
		  
	  case 76:
      keyLock();
    break;
    case 77:
      keyToggleMyFiles();
    break;
    case 27:
      keyEscape();
    break;
    case 37:
      keyLeft(e);
    break;
    case 38:
      keyUp(e);
    break;
    case 39:
      keyRight(e);
    break;
    case 40:
      keyDown(e);
    break;
    case 46:
      keyDelete();
    break;
    case 13:
      keyEnter(e);
    break;
    case 68:
      keyD(e);
    break;
    case 78:
      keyN(e);
    break;
    case 83:
      keyS(e);
    break;
    case 87:
      keyW(e);
    break;
    case 188:
      keyLeast(e);
    break;
    case 190:
      keyLarger(e);
    break;
		case 16:
		case 17:
		case 18:
			keyHandle[e.key] = true;
		break;
	}
}

function keyHandle(event) {
  
	if (event.type == 'blur') {
	  
	  keyHandle.Shift = false;
	  keyHandle.Control = false;
	  keyHandle.Alt = false;
	}
	  
	else if (event.type == 'keyup')
	  handleKeyUp(event);
	  
	else if (event.type == 'keydown')
	  handleKeyDown(event);
}
    
    
    	   
window.addEventListener('keydown', keyHandle);
window.addEventListener('keyup', keyHandle);
window.addEventListener('blur', keyHandle);