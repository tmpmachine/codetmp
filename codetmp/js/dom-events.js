let DOMEvents = {
	/* ----- */
	/*
		DOM event handler is structured as below :

		eventClass {
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
		'toggle-file-info': () => toggleModal('file-info'),
		'toggle-settings': () => toggleModal('settings'),
		'toggle-account': () => toggleModal('account'),
		'new-folder' : ui.fileManager.newFolder,
		'new-file' : ui.fileManager.newFile,
		'sign-out' : signOut,
		'grant-firebase-access': () => auth2.grant('https://www.googleapis.com/auth/firebase'),

		'change-workspace': changeWorkspace,
		'change-file-list-view': ui.changeFileListView,

		'btn-create-entry': createBlogEntry,
	    'btn-menu-template': function() { toggleInsertSnippet() },
	    'btn-menu-save': fileManager.save,
	    'btn-menu-preview': function() { openPreviewWindow(); previewHTML(); },
	    'btn-undo': () => { fileTab[activeTab].editor.env.editor.undo(); fileTab[activeTab].editor.env.editor.focus() },
	    'btn-redo': () => { fileTab[activeTab].editor.env.editor.redo(); fileTab[activeTab].editor.env.editor.focus() },
	    'more-tab': function() { ui.switchTab(1) },
	},

	submittable: {
		'confirm-download': ui.fileManager.fileDownload,
		'publish-blog': publishToBlog,
		'deploy-hosting': () => fire.deploy(),
	},

	inputable: {
		'select-project': () => fire.selectProject(),
		'select-site': () => fire.selectSite(),
	},


	/* ----- */
	/*
		clickableMenu is similiar to clickable event except it handles menu UI after the event is triggered i.e closing selected sub menu parent
		
		className : menu-link
	*/
	clickableMenu: {
		'open-in-explorer': keyboardCallbacks.openFileDirectory,
		'new-file': ui.newFile,
		'new-file-on-disk': ui.newDiskFile,
		'new-folder': ui.fileManager.newFolder,
		'save': fileManager.save,
		'preview': () => previewHTML(),
		'my-files': ui.myFiles,
		'trash': ui.trash,
		'toggle-editor-theme': ui.toggleTheme,
		'toggle-word-wrap': preferences.toggleWordWrap,
		'toggle-in-frame': ui.toggleInFrame,
		'set-font-size': ui.setFontSize,
		'about': toggleHomepage,
		'sign-out': signOut,
		'modal': toggleModalByClick,
	},


	/* ----- */
	keyboardShortcuts: {
		'Alt+Shift+N': ui.fileManager.newFolder,
		'Alt+<': () => ui.switchTab(-1),
		'Alt+>': () => ui.switchTab(1),
		'Alt+L': keyboardCallbacks.lockFile,
		'Alt+B': keyboardCallbacks.copyUploadBody,
		'Alt+M': () => {
			if (!$('#in-home').classList.contains('active'))
		    	ui.toggleMyFiles();
		},
		'Alt+R': keyboardCallbacks.toggleWrapMode,
		'Alt+I': keyboardCallbacks.toggleFileInfo,
		'Alt+N': () => { 
			if (!$('#in-home').classList.contains('active')) {
		    	if ($('#btn-menu-my-files').classList.contains('active'))
		    		ui.toggleMyFiles();
				ui.openNewTab();
			}
		},
		'Alt+W': confirmCloseTab,
		'Alt+O': keyboardCallbacks.openFileDirectory,
		'Ctrl+S': () => { event.preventDefault(); fileManager.save() },
		'Ctrl+D': () => { event.preventDefault(); ui.fileManager.deleteSelected() },
		'Ctrl+A': selectAllFiles,
		'Ctrl+V': keyboardCallbacks.handlePasteRow,
		'Ctrl+O': () => { fileManager.openLocal(event) },
		'Alt+D': keyboardCallbacks.toggleTemplate,
		'Ctrl+Enter': function() {
		  if ($('#btn-menu-my-files').classList.contains('active')) {
		  	if (selectedFile.length > 0) 
		        renameFile();
		  } else {
		    previewHTML();
		  }
		},
	},
};