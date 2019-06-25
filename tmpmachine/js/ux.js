var cantLock = false;
var activeMenu = '';

const keyPress = {
  '16': false,  // shift
  '17': false,  // ctrl
  '18': false,  // alt
  wait: function(){}
};

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



window.onblur = function() {
  keyPress[16] = false;
  keyPress[17] = false;
  keyPress[18] = false;
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


window.addEventListener('keydown',function(e) {
  // L(e.keyCode);
  // aww.pop(e.keyCode)
  
  switch (e.keyCode)
  {
    case 76:
      if ($('#btn-menu-project').classList.contains('active') && keyPress[18])
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
    break;
    case 77:
      if (keyPress[18])
      {
        $('#btn-menu-project').click()
        if ($('#btn-menu-project').classList.contains('active'))
          $('#editor').env.editor.blur()
        else
          $('#editor').env.editor.focus()
      }
    break;
    case 27:
      
      if (selectedFile.length > 0)
      {
        lastClickEl.classList.toggle('w3-light-blue', false);
        lastClickEl.classList.toggle('w3-hover-light-blue', false);
        doubleClick = false;
        selectedFile.length = 0;
      }
      
    break;
    case 37:
      if ($('#btn-menu-project').classList.contains('active'))
      {
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
    break;
    case 38:
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
    break;
    case 39:
      if ($('#btn-menu-project').classList.contains('active'))
      {
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
    break;
    case 40:
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
    break;
    case 46:
      if (selectedFile.length > 0)
      {
        if (selectedFile[0].getAttribute('data-type') === 'folder')
          ui.fm.deleteFolder();
        else if (selectedFile[0].getAttribute('data-type') === 'file')
          ui.fm.deleteFile();
      }
    break;
    case 16:
    case 17:
    case 18:
      keyPress[e.keyCode] = true;
      break;
    case 13:
      if ($('#btn-menu-project').classList.contains('active') && selectedFile.length > 0)
      {
        e.preventDefault();
        selectedFile[0].click();
        if (selectedFile[0])
          selectedFile[0].click();
      }
      else
      {
          if (keyPress[17] && !cantLock)
          {
            cantLock = true;
            
            if (previewWindow === null || previewWindow.window === null || previewWindow.parent === null)
            {
              if ($('#in-blossem').value.trim().length > 0)
                previewWindow = window.open($('#in-blossem').value.trim(), 'blossem');
              else
              {
                if (debugAttempUrl.length > 0)
                  previewWindow = window.open(debugAttempUrl+currentPage, 'preview');
                else
                  previewWindow = window.open('https://attemp.web.app/'+currentPage, 'preview');
              }
            }
            else
              renderBlog();
          }
      }
    break;
    case 68: // letter d
      if (keyPress[18])
      {
        e.preventDefault();
        $('#btn-menu-template').click();
      }
      break;
    case 78: // letter n
      if (keyPress[18])
      {
        e.preventDefault();
        
        fileTab[activeTab].scrollTop = $('#editor').env.editor.getSession().getScrollTop();
        fileTab[activeTab].row = $('#editor').env.editor.getCursorPosition().row;
        fileTab[activeTab].col = $('#editor').env.editor.getCursorPosition().column;
        fileTab[activeTab].content = $('#editor').env.editor.getSession().getValue();
        fileTab[activeTab].fiber = $('.icon-rename')[activeTab].textContent;
        
        newTab();
      }
    break;
    case 83: // letter s
      if (keyPress[17])
      {
        e.preventDefault();
        fileSave();
      }
    break;
    case 87: // letter w
      if (keyPress[18])
      {
        e.preventDefault();
        closeTab()
      }
    break;
    case 188: // letter least
      if (keyPress[18])
      {
        e.preventDefault();
        if (fileTab.length == 1) return;
        
        switchTab(-1);
      }
    break;
    case 190: // letter larger
      if (keyPress[18])
      {
        e.preventDefault();
        if (fileTab.length == 1) return;
        
        switchTab(1);
      }
    break;
    case 76: // letter l
      if (keyPress[18])
      {
        e.preventDefault();
        if (fileTab.length === 0) return;
        
        $('#editor').env.editor.blur();
        let fid;
        if (activeTab+1 === fileTab.length)
          fid = fileTab[0].fid
        else
          fid = fileTab[activeTab+1].fid
          
        focusTab(fid);
      }
    break;
    case 78: // letter n
      if (keyPress[18])
      {
        e.preventDefault();
        
        // new tab
      }
    break;
  }
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
  
  if (notSaved)
    return 'Changes you made may not be saved';
}

window.addEventListener('keyup', function(e) {
  switch (e.keyCode)
  {
    case 8:
      
      if ($('#btn-menu-project').classList.contains('active'))
      {
        if ($('.breadcrumbs').length > 1)
        {
          $('.breadcrumbs')[$('.breadcrumbs').length-2].firstElementChild.click()
        }
      }
      
    break;
    case 13:
    case 82:
      cantLock = false;
      break;
    case 17:
      keyPress[e.keyCode] = false;
      break;
    case 18:
      keyPress[e.keyCode] = false;
      break;
    case 16:
      keyPress[e.keyCode] = false;
      break;
  }
})



function toggleFullScreen() {
  
  var doc = window.document;
  var docEl = doc.documentElement;

  var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

  if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
    requestFullScreen.call(docEl);
  }
  else {
    cancelFullScreen.call(doc);
  }
}

function saveListener(event, bypass = false) {
  
  if (!bypass)
  {
    let exclude = [16, 17, 18, 20, 27, 91, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 122, 123];
    if (exclude.indexOf(event.keyCode) >= 0 ||
    keyPress[17] && event.keyCode === 67 ||
    keyPress[18] && event.keyCode === 188 ||
    keyPress[18] && event.keyCode === 190 ||
    keyPress[17] && event.keyCode === 82 ||
    keyPress[18] && event.keyCode === 13 ||
    event.ctrlKey && event.key === 'k' ||
    event.altKey && event.key === 'd' ||
    event.altKey && event.key === 'w' ||
    event.altKey && event.key === 'n' ||
    event.altKey && event.key === 'l' ||
    event.altKey && event.key === 'j' ||
    keyPress[17] && event.keyCode === 13) return;
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
  
  $('#my-osk').style.width = 'calc(100% - '+$('#sidebar').offsetWidth+'px)';
  $('#my-osk-wrapper').style.width = 11*50+'px';
  $('#my-osk').style.left = $('#sidebar').offsetWidth+'px';
  
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


function focusTab(fid, isClose) {
  
  for (let tab of $('.file-tab'))
    tab.lastElementChild.style.background = '#202020';
  
  let idx = odin.idxOf(String(fid), fileTab, 'fid');
  $('.file-tab')[idx].lastElementChild.style.background = '#154358';
  
  if (!isClose && activeTab !== idx)
  {
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
  else
  {
    if (fileTab[activeTab].name.endsWith('.blogger'))
    {
      $('#menu-basic').classList.toggle('w3-hide')
      $('#menu-blogger').classList.toggle('w3-hide')
    }
    else if (fileTab[activeTab].name.endsWith('.css'))
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
  // if (activeFile.name.endsWith('.blogger'))
  // {
  // 	$('#in-blog-title').value = x.blogTitle || '';
  // 	$('#in-blog-id').value = x.blogId || '';
  // 	$('#in-max-posts').value = x.maxPosts || 20;
  	
  // 	init(x);
  // }
  // else
  // {
  	$('#in-blog-name').value = x.blog || '';
  	$('#in-eid').value = x.eid || '';
  	$('#in-summary').value = x.summary || '';
  	$('#in-summary').value = $('#in-summary').value.substring(1, $('#in-summary').value.length-1);
  	$('#chk-more-tag').checked = x.more || false;
  	$('#chk-bibibi').checked = x.bibibi || false;
  	$('#chk-in-pre').checked = x.pre || false;
  // }
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

function closeTab(focus = true) {
  
  if (focus)
  {
    if ($('.file-tab')[activeTab].firstElementChild.firstElementChild.textContent.trim() != 'close')
    {
      if (!window.confirm('Changes you made may not be saved')) return
    }
  }
  
  $('#file-title').removeChild($('.file-tab')[activeTab]);
  fileTab.splice(activeTab, 1);
  
  if (focus)
  {
    if (fileTab.length == 0)
    {
      $('#editor').env.editor.setValue('');
      newTab()
      activeFile = undefined;
    }
    else
    {
      if (activeTab == 0)
        focusTab(fileTab[0].fid, true);
      else
        focusTab(fileTab[activeTab-1].fid, true);
    }
  }
}


function switchTab(dir) {
  // $('#editor').env.editor.blur();
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