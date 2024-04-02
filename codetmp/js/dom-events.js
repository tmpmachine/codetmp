let DOMEvents = (function() {

	let $$ = document.querySelectorAll.bind(document);
	
	let SELF = {
		Init,
	};

	Object.defineProperty(SELF, 'eventsMap', {
		get: () => eventsMap,
	});

	let eventsMap = {
		/* ----- */
		/*
			DOM event handlers are structured as below :

			className {
				data-callback-attribute: callbackFunction
			}
		*/
		onclick: {
			'btn-menu-preview': () => previewHandler.previewPath(),
			'create-session': () => ui.CreateSession(),
		},
		contextmenu: {
			'handle-ctxmenu-file-tab': (evt) => uiFileTab.HandleContextMenu(evt),
		},
		mousedown: {
			'handle-click-file-tab': (evt) => uiFileTab.HandleClick(evt),
		},
		clickable: {
			'upload-file': ui.uploadFile,
			'file-rename': () => uiFileExplorer.RenameFile(),
			'file-delete': uiFileExplorer.deleteSelected,
			'file-unload': (evt) => uiFileExplorer.UnloadSelected(evt.target),
			'file-download': ui.toggleFileDownload,
			'copy': () => compoClipboard.copy(),
			'move': () => compoClipboard.cut(),
			'paste': () => compoClipboard.paste(),

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
			'deploy-hosting': (e) => compoFirebaseHosting.deploy(e),
		},

		inputable: {
			'select-project': function () { compoFirebaseHosting.selectProject(this.value) },
			'select-site': function () { compoFirebaseHosting.selectSite(this.value) },
		},


		/*
			Similiar to clickable group with addition of handling menu UI i.e closing selected sub menu parent
			
			actual className : menu-link
			to do : determine a fitting className
		*/
		clickableMenu: {
			'command-palette': () => ui.toggleTemplate(),
			'open-in-explorer': () => uiFileExplorer.OpenFileDirectoryAsync(),
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

		onkeydown: {
			'cmd-select-command': () => compoSnippet.selectHints(),
		},

		oninput: {
			'cmd-search-command': (evt) => compoSnippet.find(evt.target.value),
		},

		keyboardShortcuts: {
			'Alt+Shift+N': uiFileExplorer.newFolder,
			'Alt+<': () => ui.switchTab(-1),
			'Alt+>': () => ui.switchTab(1),
			'Alt+P': ui.toggleGenerateSingleFile,
			'Alt+M': () => {
				if (!document.querySelector('#in-home').classList.contains('active'))
					ui.toggleMyFiles();
			},
			'Alt+R': () => compoEditor.ToggleWrapMode(),
			'Alt+N': uiFileExplorer.newFile,
			'Alt+Q': () => {
				document.body.classList.toggle('--tree-explorer');
				settings.data.explorer.tree = document.body.classList.contains('--tree-explorer');
				settings.save();
				ui.resizeEditor();
			},
			'Alt+W': () => compoFileTab.ConfirmCloseTab(),
			'Alt+O': () => uiFileExplorer.OpenFileDirectoryAsync(),
			'Ctrl+Shift+S': () => { event.preventDefault(); fileManager.TaskSaveAll(); },
			'Ctrl+S': () => { event.preventDefault(); fileManager.save(); },
			'Ctrl+D': () => { event.preventDefault(); uiFileExplorer.deleteSelected(); },
			'Ctrl+A': () => uiFileExplorer.SelectAllFiles(),
			'Ctrl+V': () => compoEditor.HandlePasteRow(),
			'Ctrl+O': () => { fileManager.TaskOpenLocal(event); },
			'Alt+D': () => {
				event.preventDefault();
				ui.toggleTemplate();
			},
			'Ctrl+Enter': function () {
				if (document.querySelector('#btn-menu-my-files').classList.contains('active')) {
					if (selectedFile.length > 0) {
						uiFileExplorer.RenameFile();
					}
				} else {
					previewHandler.previewPath();
				}
			},
			'Ctrl+Shift+Enter': function () {
				if (!document.querySelector('#btn-menu-my-files').classList.contains('active')) {
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

	function listening(selector, dataKey, eventType, callbacks) {
		let elements = $$(selector);
		for (let el of elements) {
			let callbackFunc = callbacks[el.dataset[dataKey]];
			el.addEventListener(eventType, callbackFunc);
		}
	};

	function attachSubmitable(selector, callback) {
		for (let node of $$(selector)) {
			if (node.classList.contains('preventDefault'))
			node.addEventListener('submit', preventDefault);
			node.addEventListener('submit', callback[node.dataset.callback]);
		}
	}

	function attachClickable(selector, callback) {
		for (let element of $$(selector)) {
			element.addEventListener('click', callback[element.dataset.callback]);
			element.addEventListener('click', blur);
		}
	}

	function attachInputable(selector, callback) {
		for (let element of $$(selector)) {
			element.addEventListener('input', callback[element.dataset.callback]);
		}
	}

	function preventDefault(event) {
		event.preventDefault();
	}
	
	function blur() {
		document.activeElement.blur();
	}

	function Init() {
		attachSubmitable('.submittable', eventsMap.submittable);
		attachClickable('.clickable', eventsMap.clickable);
		attachInputable('.inputable', eventsMap.inputable);

		listening('[data-onclick]', 'onclick', 'click', eventsMap.onclick);
		listening('[data-onkeydown]', 'onkeydown', 'keydown', eventsMap.onkeydown);
		listening('[data-oninput]', 'oninput', 'input', eventsMap.oninput);
		listening('[data-mousedown]', 'mousedown', 'mousedown', eventsMap.mousedown);
		listening('[data-ctxmenu]', 'ctxmenu', 'contextmenu', eventsMap.contextmenu);
	}

	return SELF;

})();