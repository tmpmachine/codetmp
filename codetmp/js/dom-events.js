let DOMEvents = {
	/* ----- */
	/*
		DOM event handlers are structured as below :

		className {
			data-callback-attribute: callbackFunction
		}
	*/
	onclick: {
		'create-session': () => ui.CreateSession(),
	},
	clickable: {
		'upload-file': ui.uploadFile,
		'file-rename': () => uiFileExplorer.RenameFile(),
		'file-delete': uiFileExplorer.deleteSelected,
		'file-unload': (evt) => uiFileExplorer.UnloadSelected(evt.target),
		'file-download': ui.toggleFileDownload,
		'copy': fileClipBoard.copy,
		'move': fileClipBoard.cut,
		'paste': fileClipBoard.paste,

		'sync-from-drive': () => drive.syncFromDrive(),

		'clear-data': ui.confirmClearData,
		'set-git-token': ui.setGitToken,
		'clone-repo': ui.cloneRepo,
		'toggle-homepage': () => ui.ToggleHomepage(),
		'toggle-settings': () => ui.ToggleModal('settings'),
		'toggle-account': () => ui.ToggleModal('account'),
		'new-folder': uiFileExplorer.newFolder,
		'new-file': uiFileExplorer.newFile,
		'sign-out': () => app.SignOut(),
		'grant-firebase-access': () => auth2.grant('https://www.googleapis.com/auth/firebase'),

		'change-workspace': (evt) => ui.changeWorkspace(evt.target.closest('[data-kind="item"]')),
		'change-file-list-view': ui.changeFileListView,

		'btn-menu-template': function () { ui.toggleInsertSnippet(); },
		'btn-menu-save': fileManager.save,
		'btn-menu-preview': async function () {
			previewHandler.previewPath();
		},
		'btn-undo': () => { fileTab[activeTab].editor.env.editor.undo(); fileTab[activeTab].editor.env.editor.focus(); },
		'btn-redo': () => { fileTab[activeTab].editor.env.editor.redo(); fileTab[activeTab].editor.env.editor.focus(); },
		'more-tab': function () { ui.switchTab(1); },

		'expand-tree-explorer': function () {
			settings.data.explorer.tree = true;
			settings.save();
			document.body.classList.toggle('--tree-explorer', true);
		},
		'collapse-tree-explorer': function () {
			settings.data.explorer.tree = false;
			settings.save();
			document.body.classList.toggle('--tree-explorer', false);
		},
		'reload-file-tree': ui.reloadFileTree,
		'generate-single-file': ui.fileGenerator.generate,
		'copy-generated-file': ui.fileGenerator.copy,
		'create-workspace': uiTreeExplorer.CreateWorkspace,
	},

	submittable: {
		'confirm-download': ui.fileDownload,
		'deploy-hosting': (e) => fire.deploy(e),
	},

	inputable: {
		'select-project': function () { fire.selectProject(this.value) },
		'select-site': function () { fire.selectSite(this.value) },
	},


	/* ----- */
	/*
		Similiar to clickable group with addition of handling menu UI i.e closing selected sub menu parent
		
		actual className : menu-link
		to do : determine a fitting className
	*/
	clickableMenu: {
		'command-palette': () => deferFeature1.toggleTemplate(),
		'open-in-explorer': () => deferFeature1.openFileDirectory(),
		'new-file': ui.newFile,
		'new-file-on-disk': ui.newDiskFile,
		'open-disk-folder': () => ui.OpenDiskFile(),
		'new-folder': uiFileExplorer.newFolder,
		'save': () => fileManager.save(),
		'save-all': () => fileManager.TaskSaveAll(),
		'preview': () => previewHandler.previewPath(),
		'preview-at-pwa': () => previewHandler.previewPathAtPWA(),
		'my-files': ui.myFiles,
		'trash': ui.trash,
		'toggle-editor-theme': ui.toggleTheme,
		'toggle-word-wrap': preferences.toggleWordWrap,
		'toggle-in-frame': ui.toggleInFrame,
		'set-font-size': ui.setFontSize,
		'about': () => ui.ToggleHomepage(),
		'sign-out': app.SignOut,
		'modal': ui.ToggleModalByClick,
		'generate-single-file': ui.toggleGenerateSingleFile,
	},


	/* ----- */
	keyboardShortcuts: {
		'Alt+Shift+N': uiFileExplorer.newFolder,
		'Alt+<': () => ui.switchTab(-1),
		'Alt+>': () => ui.switchTab(1),
		'Alt+P': ui.toggleGenerateSingleFile,
		'Alt+M': () => {
			if (!$('#in-home').classList.contains('active'))
				ui.toggleMyFiles();
		},
		'Alt+R': () => deferFeature1.toggleWrapMode(),
		'Alt+N': uiFileExplorer.newFile,
		'Alt+Q': () => {
			document.body.classList.toggle('--tree-explorer');
			settings.data.explorer.tree = document.body.classList.contains('--tree-explorer');
			settings.save();
			ui.resizeEditor();
		},
		'Alt+W': () => tabManager.ConfirmCloseTab(),
		'Alt+O': () => deferFeature1.openFileDirectory(),
		'Ctrl+Shift+S': () => { event.preventDefault(); fileManager.TaskSaveAll(); },
		'Ctrl+S': () => { event.preventDefault(); fileManager.save(); },
		'Ctrl+D': () => { event.preventDefault(); uiFileExplorer.deleteSelected(); },
		'Ctrl+A': () => uiFileExplorer.SelectAllFiles(),
		'Ctrl+V': () => deferFeature1.handlePasteRow(),
		'Ctrl+O': () => { fileManager.TaskOpenLocal(event); },
		'Alt+D': () => {
			event.preventDefault();
			deferFeature1.toggleTemplate();
		},
		'Ctrl+Enter': function () {
			if ($('#btn-menu-my-files').classList.contains('active')) {
				if (selectedFile.length > 0) {
					uiFileExplorer.RenameFile();
				}
			} else {
				previewHandler.previewPath();
			}
		},
		'Ctrl+Shift+Enter': function () {
			if (!$('#btn-menu-my-files').classList.contains('active')) {
				previewHandler.previewPathAtPWA();
			}
		},
		'Ctrl+O': function (evt) {
			evt.preventDefault();
			// check if is file system mode
			if (activeWorkspace == 2) {
				ui.OpenDiskFile();
			} else {
				alert('Feature not implemented. Try dragging and dropping the file into the editor.')
			}
		},
	},

};

; (function () {
	window.listening = function (selector, dataKey, eventType, callbacks) {
		let elements = document.querySelectorAll(selector);
		for (let el of elements) {
			let callbackFunc = callbacks[el.dataset[dataKey]];
			el.addEventListener(eventType, callbackFunc);
		}
	};
})();