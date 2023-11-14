const STORAGE_STATE = {
  main: 1,
  playground: 2,
  fileSystem: 3,
}

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

let navMain = new lsdb('nav-main', navStructure);
let navTemp = new lsdb('nav-temp', navStructure);
let navLocal = new lsdb('nav-local', navStructure);
let navs = [navMain, navTemp, navLocal];

for (let key in navStructure.root) {
  Object.defineProperty(window, key, { 
    get: () => navs[activeWorkspace].data[key],
    set: value => navs[activeWorkspace].data[key] = value,
  })
}

// dom
let pressedKeys = {};

// global / environment
let notif;

// preview
// window.name = 'parent';

const fileExplorerManager = {
	lastClickEl: null,
	doubleClick: false,
};

const editorManager = {
	fontSizeIndex: 2,
	defaultFontSizeIndex: 2,
	fontSizes: [12, 14, 16, 18, 21, 24, 30, 36, 48],
	isPasteRow: false,
	changeFontIndex: function(value) {
		let temp = this.fontSizeIndex;
		if (value === 0) {
			this.fontSizeIndex = this.defaultFontSizeIndex;
		} else {
			this.fontSizeIndex += value;
			this.fontSizeIndex = Math.min(this.fontSizes.length-1, Math.max(0, this.fontSizeIndex));
		}
		let isChanged = (temp != this.fontSizeIndex);
		if (isChanged) {
			let row = this.firstVisibleRow;
		    fileTab[activeTab].editor.env.editor.setFontSize(this.fontSize);
			fileTab[activeTab].editor.env.editor.scrollToLine(row);
		}
	},
	get fontSize() { return this.fontSizes[this.fontSizeIndex] },
	get firstVisibleRow() { return fileTab[activeTab].editor.env.editor.getFirstVisibleRow() },
};

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
			state = getState(state);
			let index = states.indexOf(state);
			if (index < 0)
				states.push(state);	
		}
	}

	function popState(_states) {
		for (let state of _states) {
			state = getState(state);
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

const modalWindowManager = (function() {

	let activeModal;

	function closeAll() {
		for (let modal of $('.modal-window'))
	      modal.classList.toggle('Hide', true);
      	stateManager.popState([0]);
	}

	function open(name) {
		closeAll();
		for (let modal of $('.modal-window')) {
		    if (modal.dataset.name == name) {
		      modal.classList.toggle('Hide', false);
		      stateManager.pushState([0]);
		      break;
		    }
		  }
	}

	function hasOpenModal() {
		return stateManager.isState(1);
	}	

	return {
		open,
		closeAll,
		hasOpenModal,
	};

})();

let ux = (function() {
  
  let SELF = {
    OpenDiskFile,
  };
  
  function OpenDiskFile() {
    fileReaderModule.OpenDirectory();
  }
  
  return SELF;
  
})();

const ui = {
  states: {
    storage: STORAGE_STATE.default,
  },
	tab: {
		openDirectory: function(self) {
			if (self.dataset.parentId != '' && self.classList.contains('isActive')) {
				let parentId = parseInt(self.dataset.parentId);
				tabManager.openDirectory(parentId);
			}
			event.preventDefault();
		},
	},
	fileGenerator: {
		generate: function() {
			let form = this.form;
			window.app.getComponent('single-file-generator').then(sfg => {
				sfg.generate(form);
			}).catch((e) => {
				aww.pop('Component is not ready yet.')
			});
		},
		copy: function() {
			let form = this.form;
			window.app.getComponent('single-file-generator').then(sfg => {
				sfg.copy(form);
			}).catch((e) => {
				aww.pop('Component is not ready yet.')
			});
		},
	},
	tree: {
		renameFolder: function(folder) {
			window.app.getComponent('fileTree').then(fileTree => {
    		fileTree.renameItem(folder, 'folder');
    	});
		},
		renameFile: function(file) {
			window.app.getComponent('fileTree').then(fileTree => {
    		fileTree.renameItem(file, 'file');
    	});
		},
		appendFile: function(file) {
			window.app.getComponent('fileTree').then(ft => {
	      ft.appendFile(file);
	    });
		},
		appendFolder: function(folder) {
			window.app.getComponent('fileTree').then(ft => {
	      ft.appendFolder(folder);
	    });
		},
		createWorkspace: function() {
			window.app.getComponent('fileTree').then(ft => {
	      ft.createWorkspace(activeFolder);
	    });
		},
	},
	highlightTree: function(fid, isRevealFileTree = true) {
		window.app.getComponent('fileTree').then(ft => {
      ft.highlightTree(fid, isRevealFileTree);
    });
	},
	reloadFileTree: function() {
		window.app.getComponent('fileTree').then(ft => {
			ft.reload();
		});
	},
	changeWorkspace: async function(targetEl) {

    let dataTarget = targetEl.dataset.target;
    let dataStorage = targetEl.dataset.storage;
    let dataIndex = targetEl.dataset.index;

	  if (dataTarget != $('#workspace-title').textContent) {
	    for (let node of $('.workspace .Btn')) {
	      node.classList.toggle('active', false);
	      if (targetEl == node) {
	        node.classList.toggle('active', true);
	      }
	    }
	    $('#workspace-title').textContent = dataTarget;
	    let index = parseInt(dataIndex);
      document.body.stateList.toggle('fs-mode', (index == 2));
      ui.states.storage = STORAGE_STATE[dataStorage];
      activeWorkspace = index;
	    await fileManager.list();
	    tabManager.list();
	    if (fileTab.length === 0) {
	      newTab();
	    }
	    focusTab(fileTab[activeTab].fid);
	    loadBreadCrumbs();
	    window.app.getComponent('fileTree').then(ft => {
				app.fileTree.reset();
			});
	  }

	},
  newFile: function() {
    if (!$('#btn-menu-my-files').classList.contains('active')) {
      ui.openNewTab();
    }
  },
  newDiskFile: function() {
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
  },
  myFiles: function() {
    $('#btn-menu-my-files').click();
  },
  trash: function() {
    if (!$('#in-trash').classList.contains('active'))
      $('#btn-menu-trash').click();
  },
  toggleTheme: function() {
    let editor = fileTab[activeTab].editor.env.editor;
    if (editor.getTheme().includes('codetmp')) {
      editor.setTheme('ace/theme/github');
    } else {
      ace.config.set('basePath', 'assets/ace');
      editor.setTheme('ace/theme/codetmp');
      ace.config.set('basePath', ACE_CDN_BASEPATH);
    }
  },
  toggleInFrame: function() {
    $('#main-layout').classList.toggle('inframe-mode');
    $('#main-layout').classList.toggle('normal-mode');
    previewHandler.previewMode = (previewHandler.previewMode == 'normal') ? 'inframe' : 'normal';
    fileTab[activeTab].editor.env.editor.session.setUseWrapMode(settings.data.editor.wordWrapEnabled);
  },
  setFontSize: function() {
    modal.prompt('Editor Font Size', 16).then(size => {
      size = parseInt(size);
      if (size) {
        for (let tab of fileTab) {
          tab.editor.env.editor.setFontSize(size);
        }
      }
    });
  },
  changeFileListView: function() {
    changeExplorerView(this.dataset.type);
  },

	uploadFile: async function(self) {
    $('#file-upload').click();
	},

  reloadOpenTab: function(fid, content) {
    for (let tab of fileTab) {
      if (tab.fid == fid) {
        tab.editor.env.editor.setValue(content);
      }
    }
  },

  toggleFileDownload: function() {
    toggleModal('file-download');
  },

  toggleGenerateSingleFile: function() {
    toggleModal('generate-single-file');
  },

  previewMedia: function(file, mimeType) {
    toggleModal('media-preview');

    let media;
    if (mimeType.includes('audio')) 
      media = document.createElement('audio');
    else if (mimeType.includes('video'))
      media = document.createElement('video');
    else if (mimeType.includes('image')) {
      media = document.createElement('img');
    }
    media.classList.add('Medial-el');
    media.setAttribute('controls','controls');
    let modal = $('.modal-component[data-name="media-preview"]')[0];
    $('.media', modal)[0].innerHTML = '';
    $('.media', modal)[0].append(media);
    
    return new Promise((resolve, reject) => {
      fileManager.TaskGetPreviewLink(file).then(resolve).catch(reject);
    }).then(src => {
      media.src = src;
      $('.title', modal)[0].textContent = file.name;
      $('.download', modal)[0].onclick = () => {
        let a = document.createElement('a');
        a.href = src;
        a.target = '_blank';
        a.download = file.name;
        $('#limbo').appendChild(a);
        a.click();
        $('#limbo').removeChild(a);
      };
    }).catch(() => {
      aww.pop('Failed to preview media.');
    });
  },

  closeMediaPreview: function() {
    let src = $('.media-preview .Media')[0].src;
    $('.media-preview .Title')[0].textContent = '';
    $('.media-preview .Download')[0].onclick = null;
    $('.media-preview .Medial-el')[0].remove();
    URL.revokeObjectURL(src);
  },

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
      // fileClipBoard.clipBoard.length = 0;
      stateManager.popState([1]);
      setTimeout(() => { 
        window.ui.resizeEditor();
        fileTab[activeTab].editor.env.editor.focus(); 
        
      }, 1);
    }
  },

	toggleFileActionButton: function() {
    let isHide = (selectedFile.length === 0);
    o.classList.toggle($('.btn-file-action'), 'w3-hide', isHide);
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

        if (activeWorkspace == 2) {
          alert('Renaming folder in file system mode is not yet supported.');
          return;
        }

			  let selection = getSelected(selectedFile[0]);
        modal.prompt('Rename', selection.title, '', helper.getFileNameLength(selection.title)).then(async (name) => {
          if (!name || name === selection.title) return;
        
            let folder = await fileManager.RenameFolder(selection.id, name);
            ui.tree.renameFolder(folder);

        });
	    }
	    function renameFile() {
	    	let selection = getSelected(selectedFile[0]);
	    	let fid = selection.id;
	      	modal.prompt('Rename', selection.title, '', helper.getFileNameLength(selection.title)).then(async (name) => {
	        	if (!name || name == selection.title) 
	        		return;

            let file = await fileManager.RenameFile(fid, name);
		        ui.tree.renameFile(file);

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
	        	clearSelection();
	        	ui.tree.appendFolder(folder);

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
            clearSelection();
            ui.tree.appendFile(file);

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
          $('.icon-rename')[activeTab].textContent = 'fiber_manual_record';
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
            clearSelection();
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
            clearSelection();
		    	});
		    }
		  }

      function UnloadSelected() {
		    if (selectedFile.length === 1) {
          confirmDeletion('Unload selected item?').then(async () => {
  		      if (selectedFile[0].getAttribute('data-type') === 'folder')
              unloadSelection(selectedFile[0], 'folders');
  		      else if (selectedFile[0].getAttribute('data-type') === 'file')
              unloadSelection(selectedFile[0], 'files');
            clearSelection();
          })
		    } else if (selectedFile.length > 1) {
          alert('Multiple unload currently not suppoerted')
		    }
		  }

    return {
			renameFolder,
			renameFile,
			newFolder,
      newFile,
			deleteSelected,
			getSelected,
      UnloadSelected,
    };

	})(), // end of ui.fileManager

  toggleMenu: function() {
    let targetId = this.getAttribute('target');
    let useCallback = true;
    let targetNode = this;
    ui.toggleActionMenu(targetId, useCallback, targetNode);
  },
  
  toggleActionMenu: function(targetId, useCallback, targetNode) {
    let target;
    if (targetId)
      target = $('#'+targetId);
    else
      target = targetNode;

    target.classList.toggle('active');
    
    
    target.lastElementChild.classList.toggle('active');
    target.firstElementChild.classList.toggle('active');
    let menuId = target.getAttribute('menu');
    let menu = $('#'+menuId);
    let block = $('#'+menuId+'-block');
    
    if (target.classList.contains('active') && (menuId === 'in-my-files' || menuId === 'in-trash')) {
      
      if (useCallback) {
        $('#list-trash').innerHTML = '';
        $('#file-list').innerHTML = '';
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
    if (typeof(block) != 'undefined')
    	block.classList.toggle('active');
    
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
  		stateManager.pushState([1]);
    } else {
	    $('#btn-menu-save-wrapper').classList.toggle('hide', false);
	  	$('#btn-menu-preview-wrapper').classList.toggle('hide', false);
	  	$('#btn-menu-template').classList.toggle('hide', false);
	  	$('#btn-home-wrapper').classList.toggle('hide', true);
	  	$('#btn-account-wrapper').classList.toggle('hide', true);
	  	$('#btn-undo').classList.toggle('hide', false);
		  $('#btn-redo').classList.toggle('hide', false);
		  stateManager.popState([1]);
    }
  },
  
  switchTab: function(direction = 1) {
    if ($('#in-my-files').classList.contains('active') || fileTab.length == 1) 
      return;
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
    modal.confirm('This will delete all Codetmp saved files & folders on current browser. Continue?', false).then(async () => {
      await fileManager.TaskClearStorage();
      location.reload();
    });
  },

  alert: function({text, isPersistent = false, timeout}) {
    aww.pop(text, isPersistent, timeout);
  },

  fileDownload: function(self) {
  	window.app.getComponent('fileBundler').then(fb => {
  		fb.fileDownload(self);
  	}).catch((e) => {
  		L(e);
  		aww.pop('Component is not ready. Try again later.');
  	});
  },

  resizeEditor: function() {
    let editor = fileTab[activeTab].editor;
    editor.env.editor.resize()
  },

}; // end of ui

window.ui = ui;

// modal

function toggleModalByClick() {
	toggleModal(this.dataset.target);
}

function toggleModal(name) {
	let modal = $(`.modal-component[data-name="${name}"]`)[0];
	modal.addEventListener('onclose', onclosemodal);
	modal.toggle();
  stateManager.pushState([0]);
  
  switch (name) {
    case 'snippet-manager':
      listSnippets();
      break;
    default:
      break;
  }
}

function listSnippets() {
  L(123)
}

function onclosemodal(event) {
	let modal = event.target;
	modal.removeEventListener('onclose', onclosemodal);
	// delay to handle global key listener
  window.setTimeout(() => {
    stateManager.popState([0]);
  }, 50)
}

// init
function initUI() {
  
	notif = Notifier($('#tmp-notif'), $('#notif-list'));
  // initInframeLayout();
  fileManager.TaskOnStorageReady().then(() => {
    fileManager.list();
  });
  preferences.loadSettings();
  newTab();
  initTabFocusHandler();
  window.setTimeout(() => { 
    window.ui.resizeEditor();
  }, 350)
  
  // initMenuBar();
  changeExplorerView(settings.data.explorer.view);

  for (let modal of $('.modal-window')) {
    modal.classList.toggle('transition-enabled', true);
    $('.Overlay',modal)[0].addEventListener('click', toggleModalByClick);
    $('.Btn-close',modal)[0].addEventListener('click', toggleModalByClick);
  }
  
  function preventDefault(event) {
    event.preventDefault();
  }
  
  function blur() {
    document.activeElement.blur();
  }
  
  attachSubmitable('.submittable', DOMEvents.submittable);
  attachClickable('.clickable', DOMEvents.clickable);
  attachInputable('.inputable', DOMEvents.inputable);

  function attachSubmitable(selector, callback) {
    for (let node of document.querySelectorAll(selector)) {
      if (node.classList.contains('preventDefault'))
        node.addEventListener('submit', preventDefault);
      node.addEventListener('submit', callback[node.dataset.callback]);
    }
  }

  function attachClickable(selector, callback) {
    for (let element of document.querySelectorAll(selector)) {
      element.addEventListener('click', callback[element.dataset.callback]);
      element.addEventListener('click', blur);
    }
  }

  function attachInputable(selector, callback) {
    for (let element of document.querySelectorAll(selector))
      element.addEventListener('input', callback[element.dataset.callback]);
  }

	o.listen({
    '.btn-material': ui.toggleMenu,
	});
	// initNavMenus();
	// attachMouseListener();
}

function initFileHandler() {
  
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
  			editor: initEditor(content),
  		};
  		newTab(-1, tabData);
  	}
    
  }
  
}

// DOM events

async function hidePalette(event) {
  await delayMs(10);
  let el = $('.search-box')[0];
  el.classList.toggle('w3-hide', true);
  $('#search-input').value = '';
  $('#search-input').removeEventListener('blur', hidePalette);
}

function delayMs(timeout) {
  return new Promise(resolve => window.setTimeout(resolve, timeout));
}

function toggleInsertSnippet(persistent) {
  if ($('#in-my-files').classList.contains('active')) return

  let el = $('.search-box')[0];
  if (typeof(persistent) == 'undefined')
    el.classList.toggle('w3-hide');
  else
    el.classList.toggle('w3-hide', !persistent);

  $('#search-input').addEventListener('blur', hidePalette);

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

function setEditorMode(fileName = '') {
  let editor = fileTab[activeTab].editor.env.editor;
  let themeMd =  false;

  if (fileName.endsWith('.txt'))
    editor.session.setMode();
  else if (fileName.endsWith('.css'))
    editor.session.setMode("ace/mode/css");
  else if (fileName.endsWith('.js'))
    editor.session.setMode("ace/mode/javascript");
  else if (fileName.endsWith('.md')) {
    editor.session.setMode("ace/mode/markdown");
    themeMd =  true;
  }
  else if (fileName.endsWith('.json'))
    editor.session.setMode("ace/mode/json");
  else
    editor.session.setMode("ace/mode/html");

  if (themeMd) {
    ace.config.set('basePath', 'assets/ace');
    editor.setTheme('ace/theme/codetmp-markdown');
    ace.config.set('basePath', ACE_CDN_BASEPATH);
  } else {
    ace.config.set('basePath', 'assets/ace');
    editor.setTheme('ace/theme/codetmp');
    ace.config.set('basePath', ACE_CDN_BASEPATH);
  }
}

function initEditor(content = '', scrollTop = 0, row = 0, col = 0) {
  let editorElement = document.createElement('div');
  editorElement.classList.add('editor');
  editorElement.style.opacity = '0'
  let editor = ace.edit(editorElement);
  editor.session.on('changeMode', function(e, session){
  	if ('ace/mode/javascript' === session.getMode().$id) {
  		if (!!session.$worker) {
  			session.$worker.send('setOptions', [{
  				'esversion': 9,
  				'esnext': false,
  			}]);
  		}
  	}
  });
  
  ace.config.set('basePath', 'assets/ace');
  editor.setTheme("ace/theme/codetmp", () => {
    editorElement.style.opacity = '1';
  });
  ace.config.set('basePath', ACE_CDN_BASEPATH);
  editor.session.setMode("ace/mode/html");
  editor.session.setUseWrapMode(settings.data.editor.wordWrapEnabled);
  editor.setOption("scrollPastEnd", 1);
  editor.session.setTabSize(2);
  editor.setFontSize(editorManager.fontSize);
  editor.clearSelection();
  editor.focus();
  editor.moveCursorTo(0,0);


  editor.commands.addCommand({
    // name: "movelinesup",
    bindKey: {win:"Ctrl-Shift-P"},
    exec: function() {
      deferFeature1.toggleTemplate();
    }
  });
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
        editorManager.isPasteRow = true;
      } else {
        document.execCommand('copy');
        editorManager.isPasteRow = false;
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
        editorManager.isPasteRow = true;
      } else {
        document.execCommand('cut');
        editorManager.isPasteRow = false;
      }
    }
  });

  editor.commands.addCommand({
    name: "decrease-font-size",
    bindKey: {win: "Ctrl--"},
    exec: function(editor) {
      event.preventDefault();
      editorManager.changeFontIndex(-1);
    }
  });
  editor.commands.addCommand({
    name: "increase-font-size",
    bindKey: {win: "Ctrl-="},
    exec: function(editor) {
      event.preventDefault();
      editorManager.changeFontIndex(+1);
    }
  });
  editor.commands.addCommand({
    name: "reset-font-size",
    bindKey: {win: "Ctrl-0"},
    exec: function(editor) {
      event.preventDefault();
      editorManager.changeFontIndex(0);
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

  initEditorSmartBookmark(editor);

  let undoMgr = new ace.UndoManager();
  editor.setValue(content)
  editor.clearSelection();
  editor.getSession().setUndoManager(undoMgr);
  editor.focus();
  editor.getSession().setScrollTop(scrollTop);
  editor.moveCursorTo(row, col);
  editor.commands.removeCommand('fold');
  editor.session.on("change", function() {
  	if (undoMgr.canUndo()) {
	  	fileTab[activeTab].fiber = 'fiber_manual_record';
	    $('.icon-rename')[activeTab].textContent = 'fiber_manual_record';
	    // $('.icon-rename')[activeTab].classList.toggle('w3-hide', false);
  	} else {
	  	fileTab[activeTab].fiber = 'close';
	    $('.icon-rename')[activeTab].textContent = 'close';
  	}
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

  editor.focus();
  
  return editorElement;
}

function toggleBreakPoint(editor) {
  let row = editor.selection.getCursor().row;
  if(editor.session.getBreakpoints()[row] ) {
    editor.session.clearBreakpoint(row);
  } else {
    editor.session.setBreakpoint(row);
  }
}

function initEditorSmartBookmark(editor) {
    
  editor.commands.addCommand({
    name: "custom-bookmark",
    bindKey: {win: "Alt-K Alt-K"},
    exec: function(editor) {
      toggleBreakPoint(editor);
    }
  });
  
  editor.session.doc.on('change', updateDataOnDocChange.bind(editor.session));
  
  function updateDataOnDocChange(e) {
		let delta = e;
		let range = e;
		let len, firstRow, f1;
            
    if (range.end.row == range.start.row)
      return;
                
    if (delta.action == 'insert') {
    	len = range.end.row - range.start.row;
    	firstRow = range.start.row;
    } else if (delta.action == 'remove') {
      len = range.start.row - range.end.row;
			firstRow = range.start.row;
    }
		if (len > 0) {
			args = Array(len);
			args.unshift(firstRow, 0)
			this.$breakpoints.splice.apply(this.$breakpoints, args);
    } else if (len < 0) {
      let rem = this.$breakpoints.splice(firstRow + 1, -len);
      if(!this.$breakpoints[firstRow]){
			  for (let oldBP in rem) {
				  if (rem[oldBP]) {
					  this.$breakpoints[firstRow] = rem[oldBP]
					  break 
				  }
        }
		  }
		}
	}
  
  editor.commands.addCommand({
    name: "custom-clear-bookmark",
    bindKey: {win: "Alt-K Alt-L"},
    exec: function(editor) {
      if (window.confirm('Clear all bookmark?')) {
    	  editor.session.clearBreakpoints();
      }
    }
  });
  
  editor.commands.addCommand({
    name: "custom-next-bookmark",
    bindKey: {win: "Ctrl-Alt-."},
    exec: function(editor) {
      let row = editor.selection.getCursor().row+1;
      
      let found = false;
      
      for (let i=row; i<editor.session.$breakpoints.length; i++) {
        if (editor.session.$breakpoints[i] !== undefined) {
          editor.gotoLine(i+1)
          found = true;
          break;
        }
      }
      if (!found) {
      for (let i=0; i<row; i++) {
          if (editor.session.$breakpoints[i] !== undefined) {
            editor.gotoLine(i+1)
            break;
          }
        } 
      }
    }

  });
  
  editor.commands.addCommand({
    name: "custom-previous-bookmark",
    bindKey: {win: "Ctrl-Alt-,"},
    exec: function(editor) {
      let row = editor.selection.getCursor().row+1;
      let found = false;
      for (let i=row-2; i>=0; i--) {
        if (editor.session.$breakpoints[i] !== undefined) {
          editor.gotoLine(i+1)
          found = true;
          break;
        }
      }
      if (!found) {
      for (let i=editor.session.$breakpoints.length; i>row; i--) {
          if (editor.session.$breakpoints[i] !== undefined) {
            editor.gotoLine(i+1)
            break;
          }
        } 
      }
    }
  });
}


// tab

// to do: remove after replacing all call to related component
function newTab(position, data) {
  tabManager.newTab(position, data);
}

function focusTab(fid) {
  tabManager.focusTab(fid);
}

function getTabWidth() {
  let width = 0;
  for (let tab of $('.file-tab'))
    width += tab.offsetWidth;
  return width;
}

function fileClose(fid) {
  let idx;
  if (fid)
    idx = odin.idxOf(String(fid), fileTab, 'fid')
  else
    idx = activeTab
  
  if (activeTab == idx) {
    activeTab = idx
    confirmCloseTab()
  } else {
    let tmp = activeTab;
    activeTab = idx;
    if (idx < tmp)
      confirmCloseTab(true, tmp-1)
    else
      confirmCloseTab(true, tmp)
  }
}

function confirmCloseTab(focus = true, comeback) {
  if (focus) {
    if ($('.file-tab')[activeTab].firstElementChild.firstElementChild.textContent.trim() != 'close') {
        modal.confirm('Changes you made will be lost.').then(() => {
          tabManager.changeFocusTab(focus, comeback);
        }).catch(() => fileTab[activeTab].editor.env.editor.focus())
      } else {
        tabManager.changeFocusTab(focus, comeback);
      } 
  } else {
    closeActiveTab()
  }
}

function closeActiveTab() {
	let fid = parseInt(fileTab[activeTab].fid); 
	window.app.getComponent('fileTree').then(fileTree => {
	  fileTree.removeOpenIndicator(fid);
	});
  $('#file-title').removeChild($('.file-tab')[activeTab]);
  fileTab.splice(activeTab, 1);
}

function changeFocusTab(focus, comeback) {
  tabManager.changeFocusTab(focus, comeback);
}

function initTabFocusHandler() {

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

  window.addEventListener('keydown', tabFocusHandler);
}

// explorer, DOM events

(function() {
  
  function navigateHorizontal(target) {
    let last = selectedFile[selectedFile.length-1];
    let next = last[target];
    while (next) {
      if (next.classList.contains('separator')) {
        next = next[target];
      } else {
    	if (!pressedKeys.shiftKey)
        	clearSelection();
        next.click();
        break;
      }
    }
  }

  function navigateVertical(target) {
    let w = $('#file-list .separator').offsetWidth;
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

    if (!pressedKeys.shiftKey)
    	clearSelection();
    selTarget.click();
  }
  
  function selectFirstFile() {
    if ($('.folder-list').length > 0) {
      $('.folder-list')[0].click();
      return true;
    } else if ($('.file-list').length > 0) {
      $('.file-list')[0].click();
      return true;
    }
    return false;
  }
  
  function navigationHandler() {
    
    if (stateManager.isState(1))
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
          navScrollUp();
        }
      break;
      case 39:
      case 40:
        if (selectedFile.length == 0) {
          if (selectFirstFile())
            navScrollUp();
        } else {
          if (event.keyCode == 39 || (event.keyCode == 40 && settings.data.explorer.view == 'list'))
            navigateHorizontal('nextElementSibling');
          else
            navigateVertical('nextElementSibling');
          navScrollDown();
        }
      break;
    }
  }

  window.navigationHandler = navigationHandler;
  
})();


// drive
function autoSync(event) {
  let isOnline = navigator.onLine ? true : false;
  if (isOnline) {
    if (fileStorage.data.rootId !== '') {
      drive.syncFromDrive();
      drive.syncToDrive();
    }
  }
}

// auth
function authReady() {
  $('body')[0].classList.toggle('is-authorized', true);
  if (fileStorage.data.rootId === '') {
    drive.readAppData();
  } else {
    drive.syncFromDrive();
    drive.syncToDrive();
  }
  let uid = gapi.auth2.getAuthInstance().currentUser.get().getId();
  support.check('firebase');
}
async function authLogout() {
  await fileManager.TaskClearStorage();
  settings.reset();
  notif.reset();
  ui.reloadFileTree();

  $('body')[0].classList.toggle('is-authorized', false);
  support.check('firebase');
  
  activeFolder = -1;
  while (breadcrumbs.length > 1)
    breadcrumbs.splice(1,1);    
  loadBreadCrumbs();
  fileManager.list();
}

function signOut() {
  auth2.signOut();
  authLogout();
  gapi.auth2.getAuthInstance().signOut().then(function() {
    console.log('User signed out.');
  });
}

function renderSignInButton() {
  gapi.signin2.render('g-signin2', {
    'scope': 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive'+auth2.additionalScopes,
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

// explorer

function toggleHomepage() {
  $('#sidebar').classList.toggle('HIDE');
  $('#in-home').classList.toggle('active');
  $('#main-editor').classList.toggle('editor-mode');
  if ($('#in-my-files').classList.contains('active'))
    $('#btn-menu-my-files').click();
}

function renameFile() {
  if (selectedFile[0].dataset.type === 'folder')
    ui.fileManager.renameFolder();
  else
    ui.fileManager.renameFile();
}

function changeExplorerView(type) {
  if (!['list', 'grid'].includes(type))
    return;

  settings.data.explorer.view = type;
  settings.save();
  $('#file-list').classList.toggle('list-view', (type == 'list'));
  for (let node of $('.Btn[data-callback="change-file-list-view"]')) {
    node.classList.toggle('active', false);
    if (node.dataset.type == type) {
      node.classList.toggle('active', true);
      $('#view-type-icon').innerHTML = $('.material-icons', node)[0].innerHTML;
    }
  }
}

function loadBreadCrumbs() {
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
  clearSelection();
}

function openFileConfirm(el) {
  let index = selectedFile.indexOf(el);
  if (pressedKeys.shiftKey || pressedKeys.ctrlKey) {
    fileExplorerManager.doubleClick = false;
    if (index < 0) {
      if (pressedKeys.shiftKey) {
        if (selectedFile.length === 0) {
          selectedFile.push(el);
          toggleFileHighlight(el, true);  
        } else {
          let last = selectedFile[selectedFile.length-1];
          clearSelection();
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

          for (let sel of selectedFile)
            toggleFileHighlight(sel, true);  
        }
      } else {
        selectedFile.push(el);
        toggleFileHighlight(el, true);
      }
    } else {
      if (pressedKeys.shiftKey) {

      } else {
        selectedFile.splice(index, 1);
        toggleFileHighlight(el, false);
      }
    }
    ui.toggleFileActionButton();
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
      fileExplorerManager.doubleClick = false;
      toggleFileHighlight(el, false);
    } 
  }
  
  if (!fileExplorerManager.doubleClick) {
    fileExplorerManager.lastClickEl = el;
    fileExplorerManager.doubleClick = true;
    toggleFileHighlight(fileExplorerManager.lastClickEl, true);
    setTimeout(function(){
      fileExplorerManager.doubleClick = false;
    }, 500);
  } else {
    let type = selectedFile[0].dataset.type;
    selectedFile.splice(0, 1);
    fileExplorerManager.doubleClick = false;
    if (type == 'file') {
      fileManager.open(el.getAttribute('data'))
    } else {
      let folderId = Number(el.getAttribute('data'))
      fileManager.OpenFolder(folderId);
    }
    toggleFileHighlight(fileExplorerManager.lastClickEl, false);
  }
  ui.toggleFileActionButton();
}

function navScrollUp() {
  let fileContainerOffsetTop = selectedFile[0].offsetTop;
  let customDefinedGap = 34;
  let scrollTop = (fileContainerOffsetTop - customDefinedGap + $('#status-bar').offsetHeight);
  if (scrollTop < $('#file-list').parentNode.scrollTop) {
    $('#file-list').parentNode.scrollTop = scrollTop;
  }
}

function navScrollDown() {
  let fileContainerOffsetTop = selectedFile[0].offsetTop;
  let padding = 16;
  let customDefinedGap = 28;
  let scrollTop = (fileContainerOffsetTop + selectedFile[0].offsetHeight + padding + $('#status-bar').offsetHeight);
  let visibleScreenHeight = $('#file-list').parentNode.scrollTop + customDefinedGap + $('#file-list').parentNode.offsetHeight;
  if (scrollTop > visibleScreenHeight)
    $('#file-list').parentNode.scrollTop += scrollTop - visibleScreenHeight;
}

function toggleFileHighlight(el, isActive) {
  if (el === undefined) return;
  el.classList.toggle('isSelected', isActive);
}

function clearSelection() {
	for (let el of selectedFile)
		toggleFileHighlight(el, false);
	selectedFile.length = 0;
	fileExplorerManager.lastClickEl = null;
  ui.toggleFileActionButton();
}

function selectAllFiles() {
	if (stateManager.isState(0)) {
    event.preventDefault();
		selectedFile = [...$('.folder-list, .file-list')];
		for (let el of selectedFile)
			toggleFileHighlight(el, true);
    ui.toggleFileActionButton();
	}
}

function previousFolder() {
  if ($('#btn-menu-my-files').classList.contains('active') && $('.breadcrumbs').length > 1) {
    event.preventDefault();
    $('.breadcrumbs')[$('.breadcrumbs').length-2].click()
  }
}

function doubleClickOnFile() {
  selectedFile[0].click();
  if (selectedFile[0])
    selectedFile[0].click();
}

function selectFileByName(key) {
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
      toggleFileHighlight(fileExplorerManager.lastClickEl, false);
      fileExplorerManager.doubleClick = false;
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

window.addEventListener('online', autoSync);
window.addEventListener('cut', fileClipBoard.handler);
window.addEventListener('copy', fileClipBoard.handler);
window.addEventListener('paste', fileClipBoard.handler);
window.onbeforeunload = helper.redirectWarning;