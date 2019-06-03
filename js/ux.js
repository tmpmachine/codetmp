var cantLock = false;

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
      
      let name;
      if ($('.file-name')[activeTab].textContent === 'Untitled File')
        name = window.prompt('File name', $('.file-name')[activeTab].textContent);
      else
        name = $('.file-name')[activeTab].textContent;
        
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
      
      // $('#editor').addEventListener('keydown', saveListener);
      // $('.file-name')[activeTab].textContent = file.name;
      // $('.icon-rename')[activeTab].textContent = 'close';
      // $('#btn-info').classList.toggle('w3-hide', false);
      
      // if (file.name.endsWith('.js'))
      //   $('#editor').env.editor.session.setMode("ace/mode/javascript");
      // else if (file.name.endsWith('.php'))
      //   $('#editor').env.editor.session.setMode("ace/mode/php");
      // else if (file.name.endsWith('.css'))
      //   $('#editor').env.editor.session.setMode("ace/mode/css");
      // else if (file.name.endsWith('.json'))
      //   $('#editor').env.editor.session.setMode("ace/mode/json");
      // else
      //   $('#editor').env.editor.session.setMode("ace/mode/html");
      
      // activeFile = file;
      
      activeTab = -2;
      openFile(file.fid);
      // fileTab.push({
      //   fid: activeFile.fid,
      //   scrollTop: 0,
      //   content: activeFile.content,
      //   fiber: 'close'
      // });
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
  switch (e.keyCode)
  {
    case 46:
      if (selectedFile.length > 0)
      {
        if (selectedFile[0].getAttribute('data-type') === 'folder')
          ui.fm.deleteFolder();
        else if (selectedFile[0].getAttribute('data-type') === 'file')
          ui.fm.deleteFile();
      }
      break;
    case 82:
      if (keyPress[17] && !keyPress[16])
      {
        cantLock = true;
        
        if (previewWindow === null || previewWindow.window === null || previewWindow.parent === null)
          previewWindow = window.open('https://b-thor.firebaseapp.com/preview.html'+currentPage, 'preview');
        else
          renderBlog();
        
        e.preventDefault();
      }
      break;
    case 16:
    case 17:
    case 18:
      keyPress[e.keyCode] = true;
      break;
    case 13:
      if (keyPress[17] && !cantLock)
      {
        cantLock = true;
        
        if (previewWindow === null || previewWindow.window === null || previewWindow.parent === null)
          previewWindow = window.open('https://b-thor.firebaseapp.com/preview.html'+currentPage, 'preview');
        else
          renderBlog();
      }
      break;
    case 68: // letter d
      if (keyPress[18])
      {
        e.preventDefault();
        $('#btn-menu-template').click();
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
        
        fileClose(String(fileTab[activeTab].fid));
      }
    break;
    case 74: // letter j
      if (keyPress[18])
      {
        e.preventDefault();
        if (fileTab.length === 0) return;
        
        $('#editor').env.editor.blur();
        let fid;
        if (activeTab-1 >= 0)
          fid = fileTab[activeTab-1].fid
        else
          fid = fileTab[fileTab.length-1].fid
        
        focusTab(fid);
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
    keyPress[17] && event.keyCode === 82 ||
    keyPress[18] && event.keyCode === 13 ||
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