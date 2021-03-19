let debugPWAUrl = '';
let lastOpenTabIndex = 0;
let pressedKeys = {};
let fontSizeScale = [12, 14, 16, 18, 21, 24, 30, 36, 48];
let fontSize = 2;
let lineLock = -1;
let pasteLine = false;

window.name = 'parent';

const stateManager = (function() {

	let states = [];

	function getState(stateNumber) {
		let state = '';
		switch (stateNumber) {
			case 0: state = 'modal-window'; break;
			case 1: state = 'file-manager'; break;
		}
		return state;
	}

	function pushState(_states) {
		for (let state of _states) {
			state = getState(state)
			let index = states.indexOf(state);
			if (index < 0)
				states.push(state);	
		}
	}

	function popState(_states) {
		for (let state of _states) {
			state = getState(state)
			let index = states.indexOf(state);
			if (index >= 0)
				states.splice(index,1);
		}
	}

	function hasState(_states, isOnlyState = false) {
		if (isOnlyState && (_states.length != states.length))
			return false;

		for (let state of _states) {
			state = getState(state);
			let index = states.indexOf(state);
			if (index < 0)
				return false;
		}
		return true;
	}

	function isState(stateId) {
		let result = false;
		switch (stateId) {
			case 0:
				result = hasState([1], true);
			break;
			case 1:
				result = hasState([0]);
			break;
		}
		return result;
	}

  function getStates() {
    return states;
  }

	return {
		pushState,
		popState,
		isState,
    getStates,
	};

})();


const ui = {

  enableJSZip: function() {
    $('.clickable[data-callback="file-download"]')[0].classList.toggle('hide', false);
  },

  toggleMyFiles: function() {
    if (stateManager.isState(1)) return;
    
    $('#btn-menu-my-files').click()
    if ($('#btn-menu-my-files').classList.contains('active')) {
      fileTab[activeTab].editor.env.editor.blur();
      stateManager.pushState([1]);
      setTimeout(() => { document.activeElement.blur() }, 1);
    } else {
      clipBoard.length = 0;
      stateManager.popState([1]);
      fileTab[activeTab].editor.env.editor.focus();
    }
  },

	setFileActionButton: function(isShown) {
    o.classList.toggle($('.btn-file-action'), 'w3-hide', true);
    if (selectedFile.length > 0) {
      for (let btn of $('.btn-file-action')) {
        if (btn.dataset.callback == 'file-rename') {
          if (selectedFile.length === 1)
            btn.classList.toggle('w3-hide', false);
        } else {
          btn.classList.toggle('w3-hide', false);
        }
      }
    }
	},

  setGitToken: function() {
    toggleModal('settings');
    modal.prompt('Personal access token').then(token => {
      if (token !== null) {
        git.setToken(token);
        aww.pop('Personal access token has been set.');
      }
    });
  },

	fileManager: (function() {

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
			let selection = getSelected(selectedFile[0]);
	      	modal.prompt('Rename', selection.title, '', helper.getFileNameLength(selection.title)).then(name => {
	        	if (!name || name === selection.title) 
	        		return;
	        
			      let folder = fileManager.get({fid: selection.id, type: 'folders'});
		        folder.name = name;
		        folder.modifiedTime = new Date().toISOString();
	        
		        commit({
		          fid: folder.fid,
		          action: 'update',
		          metadata: ['name'],
		          type: 'folders'
		        });
	      	});
	    }
	    function renameFile() {
	    	let selection = getSelected(selectedFile[0]);
	    	let fid = selection.id;
	      	modal.prompt('Rename', selection.title, '', helper.getFileNameLength(selection.title)).then(name => {
	        	if (!name || name == selection.title) 
	        		return;

		      	let file = fileManager.get({fid, type:'files'});
		        file.name = name;
		        commit({
		          fid: fid,
		          action: 'update',
		          metadata: ['name'],
		          type: 'files'
		        });

		        if (activeFile) {
		          if (fid === activeFile.fid)
		            setEditorMode(file.name);
		          
		          let index = 0
		          for (let tab of fileTab) {
		            if (tab.fid == fid) {
		              $('.file-name')[index].textContent = file.name;
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
	      	
          modal.prompt('Folder name', 'New Folder').then(name => {
		        if (!name) 
		        	return;

		        let folder = new Folder({
		          	name,
		          	modifiedTime: new Date().toISOString(),
		          	parentId: activeFolder,
		        });
		        commit({
		        	fid: folder.fid,
		        	action: 'create',
		        	type: 'folders',
	        	});
	        	clearSelection();
	      	});
	    }
      function confirmDeletion(message) {
        return new Promise(resolve => {
          modal.confirm(message).then(() => {
            resolve();
          })
        })
      }
	    function deleteFolder(selectedFile) {
	    	let selection = getSelected(selectedFile);
		      	let data = fileManager.get({fid: selection.id, type: 'folders'});
		      	data.trashed = true;
	        	commit({
		        	fid: data.fid,
		        	action: 'update',
		        	metadata: ['trashed'],
		        	type: 'folders'
		      	});
	    }
	    function deleteFile(selectedFile) {
	    	let selection = getSelected(selectedFile);
	    	let fid = selection.id;
		      	let data = fileManager.get({fid, type: 'files'});
		      	data.trashed = true;
		      
		      	if (activeFile && data.fid === activeFile.fid) {
		        	activeFile = undefined;
		        	$('.icon-rename')[activeTab].textContent = 'fiber_manual_record';
		      	}
		      
		      	for (let sync of fileStorage.data.sync) {
		        	if (sync.action === 52 && sync.copyId === fid) {
		          	sync.action = 12;
		        	}
		      	}
		      
		      	locked = -1;
		      
			    commit({
			        fid: data.fid,
			        action: 'update',
			        metadata: ['trashed'],
			        type: 'files'
			    });
	    }

	    function deleteSelected() {
		    if (selectedFile.length === 1) {
          confirmDeletion('Move selected item to trash?').then(() => {
  		      if (selectedFile[0].getAttribute('data-type') === 'folder')
  		        deleteFolder(selectedFile[0]);
  		      else if (selectedFile[0].getAttribute('data-type') === 'file')
  		        deleteFile(selectedFile[0]);
            clearSelection();
          })

		    } else if (selectedFile.length > 1) {
          confirmDeletion('Move selected items to trash?').then(() => {
            while (selectedFile.length > 0) {
              let selection = selectedFile[0];
              if (selection.getAttribute('data-type') === 'folder')
                deleteFolder(selection);
              else if (selection.getAttribute('data-type') === 'file')
                deleteFile(selection);  
            }
            clearSelection();
		    	});
		    }
		  }

    function downloadSelected() {
      if (selectedFile.length === 0)
        return;

      if (JSZip === undefined) {
        aww.pop('JSZip component is not yet loaded. Try again later.');
        return
      }

      let zip = new JSZip();
      let zipName = getSelected(selectedFile[0]).title+'.zip';
      fileManager.createBundle(selectedFile, zip).then(() => {
        zip.generateAsync({type:"blob"})
        .then(function(content) {
          blob = new Blob([content], {type: 'application/zip'});
          a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = zipName;
          $('#limbo').appendChild(a);
          a.click();
          $('#limbo').removeChild(a);
        });
      })
    }

    function getDescription() {
      let data = {};
      for (let desc of $('.description')) {
        if ((['text','hidden','textarea'].includes(desc.type) && desc.value.length === 0) ||
        (desc.type == 'checkbox' && !desc.checked)) continue;
        data[desc.getAttribute('name')] = (desc.type == 'checkbox') ? desc.checked : desc.value;
      }
      return data;
    };

    return {
			renameFolder,
			renameFile,
			newFolder,
			deleteSelected,
      downloadSelected,
      getDescription,
		};

	})(),

  toggleMenu: function() {
    
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
    
    if (target.classList.contains('active') && (menuId === 'in-my-files' || menuId === 'in-trash')) {
      
      $('#list-trash').innerHTML = '';
      $('#file-list').innerHTML = '';
      if (menuId === 'in-my-files') {
        fileManager.list();
      }
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
      return;
    }
    
    for (let el of $('.btn-material')) {
      
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
    block.classList.toggle('active');
    
    if (!menu.classList.contains('active')) {
      selectedFile = [];
    }

    if ($('#in-my-files').classList.contains('active')) {
		$('#btn-menu-save-wrapper').classList.toggle('hide', true);
	  	$('#btn-menu-preview-wrapper').classList.toggle('hide', true);
	  	$('#btn-file-info-wrapper').classList.toggle('hide', true);
	  	$('#btn-menu-template').classList.toggle('hide', true);

	  	$('#btn-home-wrapper').classList.toggle('hide', false);
	  	$('#btn-account-wrapper').classList.toggle('hide', false);
		// $('#btn-menu-settings').classList.toggle('hide', true);
		$('#btn-undo').classList.toggle('hide', true);
		$('#btn-redo').classList.toggle('hide', true);
		stateManager.pushState([1]);
    } else {
	    $('#btn-menu-save-wrapper').classList.toggle('hide', false);
	  	$('#btn-menu-preview-wrapper').classList.toggle('hide', false);
	  	$('#btn-file-info-wrapper').classList.toggle('hide', false);
	  	$('#btn-menu-template').classList.toggle('hide', false);
	  	$('#btn-home-wrapper').classList.toggle('hide', true);
	  	$('#btn-account-wrapper').classList.toggle('hide', true);
	  	// $('#btn-menu-settings').classList.toggle('hide', true);
	  	$('#btn-undo').classList.toggle('hide', false);
		$('#btn-redo').classList.toggle('hide', false);
		stateManager.popState([1]);
    }
  },
  
  switchTab: function(direction = 1) {
    if ($('#in-my-files').classList.contains('active') || fileTab.length == 1) 
      return
    let fid;
    if (activeTab + direction > 0 && activeTab + direction < fileTab.length)
      fid = fileTab[activeTab + direction].fid
    else
      fid = (activeTab + direction == -1) ? fileTab[fileTab.length - 1].fid : fileTab[0].fid;
    focusTab(fid);
  },
  
  openNewTab: function() {
    newTab();
  },
  
  toggleAutoSync: function() {
    settings.data.autoSync = !settings.data.autoSync;
    settings.save();
    $('#check-auto-sync').checked = settings.data.autoSync ? true : false;
  },

  toggleSaveToken: function() {
    settings.data.saveGitToken = !settings.data.saveGitToken;
    settings.save();
    $('#check-save-token').checked = settings.data.saveGitToken ? true : false;
  },

  toggleHomepage: function() {
    settings.data.showHomepage = !settings.data.showHomepage;
    settings.save();
    $('#check-show-homepage').checked = settings.data.showHomepage ? true : false;
  },

  cloneRepo: function() {
    let message = $('#msg-git-rate-limit').content.cloneNode(true).firstElementChild;
    $('.Rate', message)[0].textContent = git.rateLimit;
    modal.prompt('Repository web URL', 'https://github.com/username/repository', message.innerHTML).then(url => {
      if (!url) 
        return;
      ui.alert({text:'Cloning repository...'});
      git.clone(url);
    });
  },

  confirmClearData: function() {
    modal.confirm('This will delete all Codetmp saved files & folders on current browser. Continue?', false).then(() => {
      fileStorage.reset();
      location.reload();
    });
  },

  alert: function({text, isPersistent = false, timeout}) {
    aww.pop(text, isPersistent, timeout);
  }

};

function toggleModal(name) {
  for (let modal of $('.modal-window')) {
    if (modal.dataset.name == name) {
      let isHide = modal.classList.toggle('Hide');
      if (isHide) {
      	stateManager.popState([0]);
      } else {
      	stateManager.pushState([0]);
      }
      break;
    }
  }
}

function toggleModalByClick() {
  toggleModal(this.dataset.target);
}

function hideNavbarSubMenu() {
  $('#nav-bar').classList.toggle('hoverable', false);
  setTimeout(() => {
    $('#nav-bar').classList.toggle('hoverable', true);
  }, 250);
}

function initNavMenus() {

  let callbacks = {
    'new-file': newFile,
    'new-file-on-disk': newDiskFile,
    'new-folder': ui.fileManager.newFolder,
    'save': fileManager.save,
    'preview': () => previewHTML(),
    'deploy': renderAndDeployLocked,
    'deploy-single': renderAndDeploySingle,
    'my-files': myFiles,
    'trash': trash,
    'toggle-editor-theme': toggleTheme,
    'toggle-in-frame': toggleInFrame,
    'set-font-size': setFontSize,
    'about': toggleHomepage,
    'account': toggleModalByClick,
    'settings': toggleModalByClick,
    'file-info': toggleModalByClick,
    'sign-out': signOut,
  };

  for (let menu of $('.menu-link')) {
    
    if (menu.dataset.shortcut) {
      let shortcut = $('#tmp-keyboard-shortcut').content.cloneNode(true);
      $('.shortcuts', shortcut)[0].textContent = menu.dataset.shortcut;
      menu.append(shortcut);
    }

    let key = menu.dataset.callback;
    let isSupported = checkBrowserSupport(key);
    if (isSupported) {
      menu.classList.toggle('hide', false);
      menu.addEventListener('click', callbacks[key]);
      menu.addEventListener('click', hideNavbarSubMenu);
    }
  }

  function checkBrowserSupport(key) {
    let status = true;
    switch (key) {
      case 'new-file-on-disk': status = isSupport.showSaveFilePicker; break;
    }
    return status;
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
          editor: initEditor(),
        };
        newTab(-1, tabData);
      });
    }
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
    if (editor.getTheme().includes('codetmp'))
      editor.setTheme('ace/theme/github');
    else
      editor.setTheme('ace/theme/codetmp');
  }

  function toggleInFrame() {
    $('#main-layout').classList.toggle('inframe-mode');
    $('#main-layout').classList.toggle('normal-mode');
    previewMode = (previewMode == 'normal') ? 'inframe' : 'normal';
    fileTab[activeTab].editor.env.editor.session.setUseWrapMode(settings.data.editor.wordWrapEnabled);
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
}

function logWarningMessage() {
	let cssRule = "color:rgb(249,162,34);font-size:60px;font-weight:bold";
	setTimeout(console.log.bind(console, "%cATTENTION", cssRule), 0); 
	setTimeout(console.log.bind(console, "This window is intended for developers and someone might be tyring to steal your data by asking you to enter malicious code from here."), 0); 
	setTimeout(console.log.bind(console, "Ignore this message if you're well aware of what you're going to do."), 0); 
}

function toggleHomepage() {
  $('#sidebar').classList.toggle('HIDE');
  $('#in-home').classList.toggle('active');
  $('#main-editor').classList.toggle('editor-mode');
  if ($('#in-my-files').classList.contains('active'))
  	$('#btn-menu-my-files').click();
}

function initInframeLayout() {
  let isDragged = false;
  let width = 350;
  $('#inframe-preview').style.width = width+'px';
  function mouseHandler(event) {
    if (event.type == 'mousedown') {
      $('#main-layout').classList.add('blocked');
      oldX = event.pageX;
    } else if (event.type == 'touchstart') {
      $('#main-layout').classList.add('blocked');
      oldX = event.changedTouches[0].pageX;
    } else {
      $('#main-layout').classList.remove('blocked');
    }
    isDragged = (event.type == 'mousedown' || event.type == 'touchstart') ? true : false;
  }
  let oldX, delta, updateEditor;
  function mouseMove(event) {
    if (isDragged) {
      if (event.type == 'touchmove') {
        event = event.changedTouches[0];
      }
      delta = oldX - event.pageX;
      oldX = event.pageX;
      width += delta;
      $('#inframe-preview').style.width = width+'px';
      clearTimeout(updateEditor);
      updateEditor = setTimeout(function() {
        fileTab[activeTab].editor.env.editor.session.setUseWrapMode(settings.data.editor.wordWrapEnabled);
      }, 100);
    }
  }
  $('#gutter').addEventListener('touchstart', mouseHandler);
  $('#gutter').addEventListener('mousedown', mouseHandler);
  window.addEventListener('mouseup', mouseHandler);
  window.addEventListener('touchend', mouseHandler);
  window.addEventListener('mousemove', mouseMove);
  window.addEventListener('touchmove', mouseMove);
}

function initUI() {
  
  initInframeLayout();
  fileManager.list();
  preferences.loadSettings();
  newTab();

  for (let modal of $('.modal-window')) {
    modal.classList.toggle('transition-enabled', true);
    $('.Overlay',modal)[0].addEventListener('click', toggleModalByClick);
    $('.Btn-close',modal)[0].addEventListener('click', toggleModalByClick);
  }
  
  function attachClickable(selector, actions) {
    for (let element of document.querySelectorAll(selector))
      element.addEventListener('click', actions[element.dataset.callback]);
  }
  
  attachClickable('.clickable', {
    'file-rename': renameFile,
    'file-delete': ui.fileManager.deleteSelected,
    'file-download': ui.fileManager.downloadSelected,
    'clear-data': ui.confirmClearData,
    'set-git-token': ui.setGitToken,
    'clone-repo': ui.cloneRepo,
    'toggle-homepage': () => toggleHomepage(),
    'toggle-file-info': () => toggleModal('file-info'),
    'toggle-settings': () => toggleModal('settings'),
    'toggle-account': () => toggleModal('account'),
  });

  o.listen({
    'btn-create-template'   : createBlogTemplate,
    'btn-create-entry'      : createBlogEntry,
    'btn-create-app'        : createBlogApp,
    'btn-menu-template'     : function() { toggleInsertSnippet() },
    'btn-new-folder'        : ui.fileManager.newFolder,
    'btn-new-file'          : function() { $('#btn-menu-my-files').click(); ui.openNewTab(); },
    'btn-menu-save'         : fileManager.save,
    '.btn-material'         : ui.toggleMenu,
    'btn-menu-preview'      : function() { previewHTML() },
    'btn-undo' : () => { fileTab[activeTab].editor.env.editor.undo(); fileTab[activeTab].editor.env.editor.focus() },
    'btn-redo' : () => { fileTab[activeTab].editor.env.editor.redo(); fileTab[activeTab].editor.env.editor.focus() },
    '.file-settings-button' : function() { showFileSetting(this.dataset.section) },
    'more-tab'              : function() { ui.switchTab(1) },
    'btn-refresh-sync'      : function() { drive.syncFromDrive() },
  });
  checkAuth();
  applyKeyboardListener();
  initNavMenus();
  attachMouseListener();
}

function attachMouseListener() {
	window.addEventListener('mousewheel', event => {
	if (fileTab[activeTab].editor.env.editor.isFocused()) {
  		event.preventDefault();
		wheel(event.deltaY / 1000 * -1);
	}
}, {passive:false});



function wheel(delta) {
  if (pressedKeys.ctrlKey) {
     if (delta < 0) {
     	   if (fontSize > 0) {
     	   	fontSize--;
		     fileTab[activeTab].editor.env.editor.setFontSize(fontSizeScale[fontSize]);
		     fileTab[activeTab].editor.env.editor.scrollToLine(lineLock)
		  }
     } else if (delta > 0) {
     	 if (fontSize < fontSizeScale.length - 1) {
     	 	fontSize++;
			 fileTab[activeTab].editor.env.editor.setFontSize(fontSizeScale[fontSize]);
		     fileTab[activeTab].editor.env.editor.scrollToLine(lineLock)
     	 }
     }
  }
}
}

function showFileSetting(section) {
  for (let element of $('.file-settings-button')) {
    if (element.dataset.section == section)
      element.classList.toggle('hide', true);
  }
  
  for (let element of $('.file-settings')) {
    if (element.dataset.section == section)
      element.classList.toggle('hide', false);
  }
}

function toggleInsertSnippet(persistent) {
  if ($('#in-my-files').classList.contains('active')) return

  let el = $('.search-box')[0];
  if (typeof(persistent) == 'undefined')
    el.classList.toggle('w3-hide');
  else
    el.classList.toggle('w3-hide', !persistent);

  if (!el.classList.contains('w3-hide')) {
    $('#search-input').value = '';
    $('#search-input').focus();
  } else {
    setTimeout(() => { document.activeElement.blur() }, 1);
    if (typeof(persistent) === 'undefined')
      fileTab[activeTab].editor.env.editor.focus();
    $('#search-input').value = '';
    $('#search-input').blur();
  }
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

function focusTab(fid) {
  
  let idx = odin.idxOf(String(fid), fileTab, 'fid');
  
  for (let tab of $('.file-tab')) {
    tab.classList.toggle('isActive', false);
  }
  
  $('.file-tab')[idx].classList.toggle('isActive', true);
  // $('.file-tab')[idx].lastElementChild.style.background = '#FFEB3B';
  
  compressTab(idx);
  activeTab = idx;
  $('#editor-wrapper').innerHTML = '';
  $('#editor-wrapper').append(fileTab[idx].editor)
  
  fileTab[idx].editor.env.editor.focus();
  fileTab[idx].editor.env.editor.session.setUseWrapMode(settings.data.editor.wordWrapEnabled);
  fileTab[idx].editor.env.editor.setFontSize(fontSizeScale[fontSize]);
  activeFile = (String(fid)[0] == '-') ? undefined : fileTab[activeTab].file;
  setEditorMode(fileTab[activeTab].name);
  
  let fileSettings = activeFile ? activeFile.description : {};
  openDevelopmentSettings(fileSettings);
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
 
  settings = helper.parseDescription(settings)
	for (let desc of $('.description')) {
	  let key = desc.getAttribute('name');
    if (['text','textarea','hidden'].includes(desc.type))
      desc.value = settings[key] || '';
    else if (desc.type == 'checkbox')
      desc.checked = settings[key] || false;
    fixOldSettings(key, desc, settings);
	}
	
	for (let element of $('.file-settings-button'))
    element.classList.toggle('hide', false);
	
	for (let element of $('.file-settings'))
    element.classList.toggle('hide', true);
	
  if (settings.blogName || settings.blog)
    showFileSetting('blogger');
  if (settings['pwa-name'])
    showFileSetting('pwa');
}

function setEditorMode(fileName = '') {
  let editor = fileTab[activeTab].editor.env.editor;
  if (fileName.endsWith('.txt'))
    editor.session.setMode();
  else if (fileName.endsWith('.css'))
    editor.session.setMode("ace/mode/css");
  else if (fileName.endsWith('.js'))
    editor.session.setMode("ace/mode/javascript");
  else if (fileName.endsWith('.json'))
    editor.session.setMode("ace/mode/json");
  else
    editor.session.setMode("ace/mode/html");
}

function initEditor(content = '', scrollTop = 0, row = 0, col = 0) {
  let editorElement = document.createElement('div');
  editorElement.classList.add('editor');
  editorElement.style.opacity = '0'
  let editor = ace.edit(editorElement);

  editor.setTheme("ace/theme/codetmp", () => {
    editorElement.style.opacity = '1';
  });
  editor.session.setMode("ace/mode/html");
  editor.session.setUseWrapMode(settings.data.editor.wordWrapEnabled);
  editor.session.setTabSize(2);
  editor.setFontSize(fontSizeScale[fontSize]);
  editor.clearSelection();
  editor.focus();
  editor.moveCursorTo(0,0);

  editor.commands.addCommand({
    name: "movelinesup",
    bindKey: {win:"Ctrl-Shift-Up"},
    exec: function(editor) {
      editor.moveLinesUp();
    }
  });
  editor.commands.addCommand({
    name: "movelinesdown",
    bindKey: {win:"Ctrl-Shift-Down"},
    exec: function(editor) {
      editor.moveLinesDown();
    }
  });
  editor.commands.addCommand({
    name: "select-or-more-after",
    bindKey: {win:"Ctrl-D"},
    exec: function(editor) {
      if (editor.selection.isEmpty()) {
        editor.selection.selectWord();
      } else {
        editor.execCommand("selectMoreAfter");
      }
    }
  });
  editor.commands.addCommand({
    name: "removeline",
    bindKey: {win: "Ctrl-Shift-K"},
    exec: function(editor) {
      editor.removeLines();
    }
  });
  
  editor.commands.addCommand({
    name: "custom-copy",
    bindKey: {win: "Ctrl-C"},
    exec: function(editor) {
    	let selection = editor.getSelectionRange();
    	if (selection.start.row == selection.end.row && selection.start.column == selection.end.column) {
  			let row = selection.start.row
  			let col = selection.start.column
  			editor.selection.setSelectionRange({start:{row,column:0},end:{row:row+1,column:0}})
  			document.execCommand('copy');
  			editor.clearSelection();
  			editor.moveCursorTo(row, col);
  			pasteLine = true;
    	} else {
			  document.execCommand('copy');
  			pasteLine = false;
    	}
    }
  });
  
  editor.commands.addCommand({
    name: "custom-cut",
    bindKey: {win: "Ctrl-X"},
    exec: function(editor) {
    	let selection = editor.getSelectionRange();
    	if (selection.start.row == selection.end.row && selection.start.column == selection.end.column) {
  			let row = selection.start.row
  			editor.selection.setSelectionRange({start:{row,column:0},end:{row:row+1,column:0}})
  			document.execCommand('cut');
  			pasteLine = true;
    	} else {
			  document.execCommand('cut');
  			pasteLine = false;
    	}
    }
  });

  editor.commands.addCommand({
    name: "decrease-font-size",
    bindKey: {win: "Ctrl--"},
    exec: function(editor) {
      event.preventDefault();
      if (fontSize > 0) fontSize--;
      editor.setFontSize(fontSizeScale[fontSize]);
    }
  });
  editor.commands.addCommand({
    name: "increase-font-size",
    bindKey: {win: "Ctrl-="},
    exec: function(editor) {
      event.preventDefault();
      if (fontSize < fontSizeScale.length - 1) fontSize++;
      editor.setFontSize(fontSizeScale[fontSize]);
    }
  });
  editor.commands.addCommand({
    name: "reset-font-size",
    bindKey: {win: "Ctrl-0"},
    exec: function(editor) {
      event.preventDefault();
      editor.setFontSize(16);
      fontSize = 2;
    }
  });
  editor.commands.addCommand({
    name: "gotoline",
    bindKey: {win: "Ctrl-G"},
    exec: function(editor, line) {
      if (typeof line === "number" && !isNaN(line))
          editor.gotoLine(line);
      editor.prompt({ $type: "gotoLine" });
    },
  });
  editor.setValue(content)
  editor.clearSelection();
  editor.getSession().setUndoManager(new ace.UndoManager())
  editor.focus();
  editor.getSession().setScrollTop(scrollTop);
  editor.moveCursorTo(row, col);
  editor.commands.removeCommand('fold');
  editor.session.on("change", function(delta) {
    $('.icon-rename')[activeTab].textContent = 'fiber_manual_record';
    $('.icon-rename')[activeTab].classList.toggle('w3-hide', false);
  })
   
  if (settings.data.editor.emmetEnabled) {
    editor.setOption('enableEmmet', true);
  }
  if (settings.data.editor.autoCompleteEnabled) {
    editor.setOptions({
      'enableBasicAutocompletion': true,
      'enableSnippets': true,
      'enableLiveAutocompletion': true,
    });
  }

  return editorElement;
}

function newTab(position, data) {
  
  let fid, el;
  if (data) {
    fid = data.fid
    el = o.cel('div', {
      innerHTML: o.creps('tmp-file-tab', {
        fid,
        name: data.name,
        fiber: 'close'
      })
    });
    if (data.fileHandle === undefined)
      data.fileHandle = null;
  } else {
    fid = '-' + (new Date).getTime();
    el = o.cel('div', {
      innerHTML: o.creps('tmp-file-tab', {
        fid,
        name: 'untitled.html',
        fiber: 'close',
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
  } else {
    fileTab.push({
      editor: initEditor(),
      fid,
      fiber: 'close',
      fileHandle: null,
    });
  }
  
  focusTab(fid)
}

function getTabWidth() {
  let width = 0;
  for (let tab of $('.file-tab'))
    width += tab.offsetWidth;
  return width;
}

function confirmCloseTab(focus = true, comeback) {
	if (focus) {
		if ($('.file-tab')[activeTab].firstElementChild.firstElementChild.textContent.trim() != 'close') {
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
	$('#file-title').removeChild($('.file-tab')[activeTab]);
	fileTab.splice(activeTab, 1);
}

function changeFocusTab(focus, comeback) {
	closeActiveTab()
	if (fileTab.length == 0) {
	  newTab()
	  activeFile = undefined;
	} else {
	  if (comeback === undefined) {
	    if (activeTab == 0)
	      focusTab(fileTab[0].fid);
	    else
	      focusTab(fileTab[activeTab-1].fid);
	  }
	}
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
    if (response.items)
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
        fileManager.save();
        
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
    fileManager.save();
    
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
    fileManager.save();
    
  }, 'id,blog(id)')
}

function getFileColor(fileName) {
  let defaultBg;
  if (fileName.includes('.css'))
    defaultBg = '#1e44ff';
  else if (fileName.includes('.js'))
    defaultBg = '#ccad1b';
  else if (fileName.includes('.html'))
    defaultBg = '#fb5c10';
  return defaultBg;
}

function loadBreadCrumbs() {
  $('#breadcrumbs').innerHTML = '';
  let i = 0;
  for (let b of breadcrumbs) {
    let link;
    if (i == breadcrumbs.length-1)
      link = o.cel('div',{innerHTML:o.creps('tmp-breadcrumb-fake', b)});
    else
      link = o.cel('div',{innerHTML:o.creps('tmp-breadcrumb', b)});
    $('#breadcrumbs').appendChild(link.firstElementChild);
    i++;
  }
}

function openBread(id) {
  activeFolder = id;
  let idx = odin.idxOf(id,breadcrumbs,'folderId');
  breadcrumbs = breadcrumbs.slice(0,idx+1);
  fileManager.list();
  clearSelection();
}

function openFileConfirm(el) {

  let index = selectedFile.indexOf(el);
  if (pressedKeys.shiftKey || pressedKeys.ctrlKey) {
	  doubleClick = false;
    if (index < 0) {
	    selectedFile.push(el);
		  toggleFileHighlight(el, true);
    } else {
    	selectedFile.splice(index, 1);
		  toggleFileHighlight(el, false);
    }
    ui.setFileActionButton();
    return
    
  } else {
	  
	  for (let el of selectedFile)
		  toggleFileHighlight(el, false);
  			
  	if (selectedFile.length > 1) {
  		selectedFile.length = 0;
  		index = -1;
  	}

  	if (index < 0) {
	    selectedFile[0] = el;
		  doubleClick = false;
		  toggleFileHighlight(el, false);
    } 
  }
  
  if (!doubleClick) {
    lastClickEl = el;
    doubleClick = true;
    toggleFileHighlight(lastClickEl, true);
    setTimeout(function(){
      doubleClick = false;
    }, 500);
  } else {
    let type = selectedFile[0].dataset.type;
    selectedFile.splice(0, 1);
    doubleClick = false;
    if (type == 'file') {
      fileManager.open(el.getAttribute('data'))
    } else {
      let folderId = Number(el.getAttribute('data'))
      openFolder(folderId);
    }
    toggleFileHighlight(lastClickEl, false);
  }
  ui.setFileActionButton();
}

function navScrollUp() {
  let fileContainerOffsetTop = selectedFile[0].classList.contains('folder-list') ? selectedFile[0].offsetTop : selectedFile[0].parentNode.offsetTop;
  let scrollTop = (fileContainerOffsetTop - 8 - 64 - $('#nav-bar').offsetHeight);
  if (scrollTop < $('#file-list').parentNode.scrollTop) {
    $('#file-list').parentNode.scrollTop = scrollTop;
  }
}

function navScrollDown() {
  let fileContainerOffsetTop = selectedFile[0].classList.contains('folder-list') ? selectedFile[0].offsetTop : selectedFile[0].parentNode.offsetTop;
  let scrollTop = (fileContainerOffsetTop + selectedFile[0].offsetHeight + 8);
  let visibleScreenHeight = $('#file-list').parentNode.scrollTop + 64 + $('#nav-bar').offsetHeight + $('#file-list').parentNode.offsetHeight;
  if (scrollTop > visibleScreenHeight)
    $('#file-list').parentNode.scrollTop += scrollTop - visibleScreenHeight;
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
    if ($('.folder-list').length > 0) {
      $('.folder-list')[0].click();
      return true;
    } else if ($('.file-list-clicker').length > 0) {
      $('.file-list-clicker')[0].click();
      return true;
    }
    return false;
  }
  
  function navigationHandler() {
    
    if (stateManager.isState(1))
      return

    if (!$('#btn-menu-my-files').classList.contains('active')) return;
    event.preventDefault();
    
    let fileContainerWidth = (screen.width < 450) ? 153.2 : 203.2;
    let fileCount = Math.floor( ($('#file-list').offsetWidth - 16 * 2) / fileContainerWidth);

    switch (event.keyCode) {
      case 37:
      case 38:
        if (selectedFile.length > 0) {
          if (event.keyCode == 37)
            left();
          else
            up(fileCount);
          navScrollUp();
        }
      break;
      case 39:
      case 40:
        if (selectedFile.length == 0) {
          if (selectFirstFile()) {
            navScrollUp();
          }
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

function renameFile() {
  if (selectedFile[0].dataset.type === 'folder')
    ui.fileManager.renameFolder();
  else
    ui.fileManager.renameFile();
}

function renderAndDeploySingle() {
  let tmpLocked = locked;
  locked = -1;
  previewHTML(true);
  deploy();
  locked = tmpLocked;
}

function renderAndDeployLocked() {
  previewHTML(true);
  deploy();
}
 
function applyKeyboardListener() {
  
  function previousFolder() {
    if ($('#btn-menu-my-files').classList.contains('active') && $('.breadcrumbs').length > 1) {
      event.preventDefault();
      $('.breadcrumbs')[$('.breadcrumbs').length-2].click()
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
    } else {
      let fid = fileTab[activeTab].fid;
      let notFile = false;
      if (typeof(fid) == 'string') {
        locked = -1;
        notFile = true;
      } else
        locked = (locked == fid) ? -1 : fid;
      
      if (locked == fid || notFile) {
        aww.pop('File locked');
        $('.file-tab')[activeTab].lastElementChild.style.background = 'orange';
        clearTimeout(lockFile.wait);
        lockFile.wait = setTimeout(() => {
          $('.file-tab')[activeTab].lastElementChild.style.background = '#FFEB3B';
        }, 200)
      } else {
        aww.pop('File unlocked');
        $('.file-tab')[activeTab].lastElementChild.style.background = 'inherit';
        clearTimeout(lockFile.wait);
        lockFile.wait = setTimeout(() => {
          $('.file-tab')[activeTab].lastElementChild.style.background = '#FFEB3B';
        }, 200)
      }
    }
  }
  
  function keyEscape() {
    if ($('#btn-menu-my-files').classList.contains('active')) {
   	  if (selectedFile.length > 0) {
   	    for (let el of selectedFile)
   			  toggleFileHighlight(el, false);
   	    doubleClick = false;
   	    selectedFile.length = 0;
        ui.setFileActionButton();
   	  } else {
         if (!fileReaderModule.isDragging) {
	         $('#btn-menu-my-files').click();
	         fileTab[activeTab].editor.env.editor.focus();
         }
   	  }
    }
  }
  
  function doubleClickOnFile() {
    selectedFile[0].click();
    if (selectedFile[0])
      selectedFile[0].click();
  }
  
  function toggleWrapMode() {
    settings.data.wrapMode = !settings.data.wrapMode;
    settings.save();
    focusTab(fileTab[activeTab].fid);
  }
  
  function toggleTemplate() {
  	event.preventDefault();
      $('#btn-menu-template').click();
  }
  
  function openFileDirectory() {
    if (!activeFile || $('#btn-menu-my-files').classList.contains('active')) return
    breadcrumbs.splice(1);
    let stack = [];
    let parentId = activeFile.parentId;
    while (parentId != -1) {
      folder = fileManager.get({fid: parentId, type: 'folders'});
      breadcrumbs.splice(1, 0, {folderId:folder.fid, title: folder.name})
      parentId = folder.parentId
    }
    loadBreadCrumbs();
    $('#btn-menu-my-files').click();
    
    if (breadcrumbs.length > 1)
      breadcrumbs.pop();
    openFolder(activeFile.parentId);
  }
  
  function copyUploadBody() {
    let textarea = document.createElement('textarea');
    textarea.style.height = '0';
    document.body.append(textarea);
    previewHTML(true);
    textarea.value = uploadBody;
    textarea.select();
    document.execCommand('copy');
    aww.pop('Copied to clipboard');
    document.body.removeChild(textarea)
    fileTab[activeTab].editor.env.editor.focus()
  }

  function selectFileByName(key) {
    let found = false;
    let matchName = [];
    for (let el of $('.folder-list')) {
      if (el.title.toLowerCase().startsWith(key)) {
        matchName.push(el);
      }
    }

    for (let el of $('.file-list-clicker')) {
      if (el.title.toLowerCase().startsWith(key)) {
        matchName.push(el);
      }
    }

    if (matchName.length == 0) {
      if (selectedFile.length > 0) {
        toggleFileHighlight(lastClickEl, false);
        doubleClick = false;
        selectedFile.length = 0;
      }
    }

    if (typeof(selectedFile[0]) == 'undefined') {
      if (matchName.length > 0) {
        matchName[0].click();
        navScrollUp();
        navScrollDown();
      }
    } else {
      let selectedIndex = matchName.indexOf(selectedFile[0]);
      if (selectedIndex < 0) {
        if (matchName.length > 0) {
          matchName[0].click();
          navScrollUp();
          navScrollDown();
        }
      } else {
        if (matchName.length > 1) {
          selectedIndex = selectedIndex + 1 == matchName.length ? 0 : selectedIndex + 1;
          matchName[selectedIndex].click();
          navScrollUp();
          navScrollDown();
        }
      }
    }
  }
  
  function handlePasteLine() {
    if (pasteLine) {
      let editor = fileTab[activeTab].editor.env.editor;
      let selection = editor.getSelectionRange();
			let row = selection.start.row
			let col = selection.start.column
      editor.clearSelection();
      editor.moveCursorTo(row, 0);
      setTimeout(function() {
        editor.moveCursorTo(row+1, col);
      }, 1);
    }
  }

  window.addEventListener('blur', e => { 
  	pressedKeys.shiftKey = false; pressedKeys.ctrlKey = false; 
  	lineLock = -1;
  	pasteLine = false;
  })
  window.addEventListener('keyup', e => { 
  	pressedKeys.shiftKey = e.shiftKey; pressedKeys.ctrlKey = e.ctrlKey;
  	lineLock = -1; 
  })
  window.addEventListener('keydown', e => { 
  	pressedKeys.shiftKey = e.shiftKey; 
  	pressedKeys.ctrlKey = e.ctrlKey; 
  	if (lineLock === -1)
  		lineLock = fileTab[activeTab].editor.env.editor.getFirstVisibleRow();
  })

  window.addEventListener('keydown', function(e) {
    if (stateManager.isState(1))
      return

    if (e.altKey && (fileTab[activeTab].editor.env.editor.isFocused() || document.activeElement.id == 'search-input')) {
      e.preventDefault();
    }

    if (!$('#btn-menu-my-files').classList.contains('active')) {
    	if (event.key === 'Escape') {
    		toggleInsertSnippet(false);
    		fileTab[activeTab].editor.env.editor.focus();
    	}
    }

    if (!e.ctrlKey && !e.altKey && $('#btn-menu-my-files').classList.contains('active')) {
      if (('_-.abcdefghijklmnopqrstuvwxyz1234567890'.includes(e.key))) {
        selectFileByName(e.key);
      } else {
        switch (event.key) {
          case 'Backspace': 
            previousFolder(); 
            break;
          case 'Escape': 
            keyEscape();
            break;
          case 'Delete': 
            ui.fileManager.deleteSelected(); 
            break;
          case 'ArrowLeft': 
          case 'ArrowDown': 
          case 'ArrowRight': 
          case 'ArrowUp': 
            navigationHandler(event);
            break;
          case 'Enter': 
            if ($('#btn-menu-my-files').classList.contains('active') && selectedFile.length > 0) {
              event.preventDefault();
              doubleClickOnFile();
            }
          break;
        }
      }
    }
  });

  function toggleFileInfo() {
    if (!stateManager.isState(0))
      toggleModal('file-info');
  }

  let keyboard = new KeyTrapper();

  keyboard.isBlocked = function() {
  	return stateManager.isState(1);
  }

  keyboard.listen({
    'Alt+Enter': renderAndDeployLocked,
    'Alt+Shift+Enter': renderAndDeploySingle,
    'Alt+Shift+N': ui.fileManager.newFolder,
    'Alt+<': () => ui.switchTab(-1),
    'Alt+>': () => ui.switchTab(1),
    'Alt+L': lockFile,
    'Alt+B': copyUploadBody,
    'Alt+M': () => {
    	if (!$('#in-home').classList.contains('active'))
	    	ui.toggleMyFiles();
    },
    'Alt+R': toggleWrapMode,
    'Alt+I': toggleFileInfo,
    'Alt+N': () => { 
    	if (!$('#in-home').classList.contains('active')) {
	    	if ($('#btn-menu-my-files').classList.contains('active'))
	    		ui.toggleMyFiles();
			ui.openNewTab();
    	}
    },
    'Alt+W': confirmCloseTab,
    'Alt+O': openFileDirectory,
    'Ctrl+S': () => { event.preventDefault(); fileManager.save() },
    'Ctrl+D': () => { event.preventDefault(); ui.fileManager.deleteSelected() },
    'Ctrl+A': selectAllFiles,
    'Ctrl+V': handlePasteLine,
    'Ctrl+O': () => { fileManager.openLocal(event) },
    'Alt+D': toggleTemplate,
    'Ctrl+Enter': function() {
      if ($('#btn-menu-my-files').classList.contains('active')) {
      	if (selectedFile.length > 0) 
	        renameFile();
      } else {
        previewHTML();
      }
    },
  });
};

function autoSync(event) {
  let isOnline = navigator.onLine ? true : false;
  if (isOnline) {
    if (fileStorage.data.rootId !== '') {
      drive.syncFromDrive();
      drive.syncToDrive();
    }
  }
}
window.addEventListener('online', autoSync);

function isOpenFileManager() {
	return $('#in-my-files').classList.contains('active');
}

window.addEventListener('copy', function(e) { 
	if (stateManager.isState(0)) 
		copyFile(false);
});
window.addEventListener('cut', function(e) { 
	if (stateManager.isState(0)) 
		copyFile(true);
});
window.addEventListener('paste', function(e) { 
	if (stateManager.isState(0))
		pasteFile();
});

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


function checkAuth() {
  if (localStorage.getItem('data-token') !== null) {
    $('#label-account').textContent = 'My Account';
    $('#login-info').style.display = 'none';
    o.classList.toggle($('.auth-required'), ['unauthorized'], false);
  }
}

function authReady() {
  if (fileStorage.data.rootId === '')
    drive.readAppData();
  else {
    drive.syncFromDrive();
    drive.syncToDrive();
  }
}

function authLogout() {
  $('#label-account').textContent = 'Sign in';
  $('#login-info').style.display = 'block';  
  o.classList.toggle($('.auth-required'), ['unauthorized'], true);
  fileStorage.reset();
  settings.reset();
  localStorage.removeItem('data-token');
  localStorage.removeItem('data-token-expires');
  activeFolder = -1;
  while (breadcrumbs.length > 1)
    breadcrumbs.splice(1,1);    
  loadBreadCrumbs();
  fileManager.list();
}

function signOut() {
  let auth2 = gapi.auth2.getAuthInstance();
  authLogout();
  auth2.signOut().then(function() {
    console.log('User signed out.');
  });
}

function renderButton() {
  gapi.signin2.render('g-signin2', {
    'scope': 'https://www.googleapis.com/auth/blogger https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive',
    'width': 240,
    'height': 50,
    'longtitle': true,
    'theme': 'dark',
    'onsuccess': (googleUser) => {
      auth2.onSignIn(googleUser);
      authReady();
    },
  });
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

function toggleFileHighlight(el, isActive) {
  if (el === undefined) return;
  if (el.dataset.type == 'file') {
    o.classList.toggle(el.parentNode, 'isSelected', isActive);
  }
  else
    o.classList.toggle(el, 'isSelected', isActive);
}

function clearSelection() {
	for (let el of selectedFile)
		toggleFileHighlight(el, false);
	selectedFile.length = 0;
	lastClickEl = null;
  ui.setFileActionButton();
}

function selectAllFiles() {
	if (stateManager.isState(0)) {
    event.preventDefault();
		selectedFile = [...$('.folder-list'), ...$('.file-list-clicker')];
		for (let el of selectedFile)
			toggleFileHighlight(el, true);
    ui.setFileActionButton();
	}
}
