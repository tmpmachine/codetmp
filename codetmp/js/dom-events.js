let DOMEvents = {
	/* ----- */
	/*
		DOM event handlers are structured as below :

		className {
			data-callback-attribute: callbackFunction
		}
	*/
	clickable: {
		'upload-file': ui.uploadFile,
		'file-rename': renameFile,
		'file-delete': ui.fileManager.deleteSelected,
		'file-download': ui.toggleFileDownload,
		'copy': fileClipBoard.copy,
		'move': fileClipBoard.cut,
		'paste': fileClipBoard.paste,

		'sync-from-drive': () => drive.syncFromDrive(),

		'clear-data': ui.confirmClearData,
		'set-git-token': ui.setGitToken,
		'clone-repo': ui.cloneRepo,
		'toggle-homepage': () => toggleHomepage(),
		'toggle-settings': () => toggleModal('settings'),
		'toggle-account': () => toggleModal('account'),
		'new-folder' : ui.fileManager.newFolder,
		'new-file' : ui.fileManager.newFile,
		'sign-out' : signOut,
		'grant-firebase-access': () => auth2.grant('https://www.googleapis.com/auth/firebase'),

		'change-workspace': ui.changeWorkspace,
		'change-file-list-view': ui.changeFileListView,

	    'btn-menu-template': function() { toggleInsertSnippet(); },
	    'btn-menu-save': fileManager.save,
	    'btn-menu-preview': async function() { 
	      previewHandler.previewPath(); 
	    },
	    'btn-undo': () => { fileTab[activeTab].editor.env.editor.undo(); fileTab[activeTab].editor.env.editor.focus(); },
	    'btn-redo': () => { fileTab[activeTab].editor.env.editor.redo(); fileTab[activeTab].editor.env.editor.focus(); },
	    'more-tab': function() { ui.switchTab(1); },
	    
	    'expand-tree-explorer': function() { 
	    	settings.data.explorer.tree = true;
	    	settings.save();
	    	document.body.classList.toggle('--tree-explorer', true) ;
	    },
	    'collapse-tree-explorer': function() {
	    	settings.data.explorer.tree = false;
	    	settings.save();
	     	document.body.classList.toggle('--tree-explorer', false);
	 	},
	    'reload-file-tree': ui.reloadFileTree,
	    'generate-single-file': ui.fileGenerator.generate,
		'copy-generated-file': ui.fileGenerator.copy,
	    'create-workspace': ui.tree.createWorkspace,
	},

	submittable: {
		'confirm-download': ui.fileDownload,
		'deploy-hosting': (e) => fire.deploy(e),
	},

	inputable: {
		'select-project': function() { fire.selectProject(this.value) },
		'select-site': function() { fire.selectSite(this.value) },
	},


	/* ----- */
	/*
		Similiar to clickable group with addition of handling menu UI i.e closing selected sub menu parent
		
		actual className : menu-link
		to do : determine a fitting className
	*/
	clickableMenu: {
		'open-in-explorer': () => deferFeature1.openFileDirectory(),
		'new-file': ui.newFile,
		'new-file-on-disk': ui.newDiskFile,
		'open-disk-folder': () => window.ux.OpenDiskFile(),
		'new-folder': ui.fileManager.newFolder,
		'save': fileManager.save,
		'preview': () => previewHandler.previewPath(),
		'my-files': ui.myFiles,
		'trash': ui.trash,
		'toggle-editor-theme': ui.toggleTheme,
		'toggle-word-wrap': preferences.toggleWordWrap,
		'toggle-in-frame': ui.toggleInFrame,
		'set-font-size': ui.setFontSize,
		'about': toggleHomepage,
		'sign-out': signOut,
		'modal': toggleModalByClick,
		'generate-single-file': ui.toggleGenerateSingleFile,
	},


	/* ----- */
	keyboardShortcuts: {
		'Alt+Shift+N': ui.fileManager.newFolder,
		'Alt+<': () => ui.switchTab(-1),
		'Alt+>': () => ui.switchTab(1),
		'Alt+P': ui.toggleGenerateSingleFile,
		'Alt+M': () => {
			if (!$('#in-home').classList.contains('active'))
		    	ui.toggleMyFiles();
		},
		'Alt+R': () => deferFeature1.toggleWrapMode(),
		'Alt+N': ui.fileManager.newFile,
		'Alt+Q': () => {
			document.body.classList.toggle('--tree-explorer');
			settings.data.explorer.tree = document.body.classList.contains('--tree-explorer');
	    	settings.save();
			window.ui.resizeEditor();
		},
		'Alt+W': () => confirmCloseTab(),
		'Alt+O': () => deferFeature1.openFileDirectory(),
		'Ctrl+S': () => { event.preventDefault(); fileManager.save(); },
		'Ctrl+D': () => { event.preventDefault(); ui.fileManager.deleteSelected(); },
		'Ctrl+A': selectAllFiles,
		'Ctrl+V': () => deferFeature1.handlePasteRow(),
		'Ctrl+O': () => { fileManager.openLocal(event); },
		'Alt+D': () => deferFeature1.toggleTemplate(),
		'Ctrl+Enter': function() {
		  if ($('#btn-menu-my-files').classList.contains('active')) {
		  	if (selectedFile.length > 0) 
		        renameFile();
		  } else {
		    previewHandler.previewPath();
		  }
		},
		'Ctrl+Shift+Enter': function() {
			if (!$('#btn-menu-my-files').classList.contains('active')) {
				previewHandler.previewPathAtPWA();
			}
		},
	},
};