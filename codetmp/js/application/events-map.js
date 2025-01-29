let eventsMap = {
    onclick: {
        'authorize': () => compoGsi.RequestToken(),
        'revoke-access': () => ui.RevokeAccess(),
        'handle-sidebar-btn-click': (evt) => ui.HandleSidebarBtnClick(evt.target), 
        'btn-menu-preview': () => compoPreview.previewPath(),
        'create-session': () => ui.CreateSession(),
        'handle-file-list-click': (evt) => uiFileExplorer.HandleClickList(evt.target),

        'upload-file': (evt) => ui.uploadFile(evt),
        'file-rename': () => uiFileExplorer.RenameFile(),
        'file-delete': (evt) => uiFileExplorer.deleteSelected(evt),
        'file-unload': (evt) => uiFileExplorer.UnloadSelected(evt.target),
        'file-download': (evt) => ui.toggleFileDownload(evt),
        'copy': () => compoClipboard.copy(),
        'move': () => compoClipboard.cut(),
        'paste': () => compoClipboard.paste(),

        'sync-from-drive': () => compoDrive.syncFromDrive(),

        'clear-data': () => ui.confirmClearData(),
        'set-git-token': () => ui.setGitToken(),
        'clone-repo': () => ui.cloneRepo(),
        'toggle-homepage': () => ui.ToggleHomepage(),
        'toggle-settings': () => ui.ToggleModal('settings'),
        'toggle-account': () => ui.ToggleModal('account'),
        'new-folder': () => uiFileExplorer.newFolder(),
        'new-file': () => uiFileExplorer.newFile(),
        'sign-out': () => app.SignOut(),
        'grant-firebase-access': () => compoGsi.Grant('https://www.googleapis.com/auth/firebase'),

        'change-workspace': (evt) => ui.changeWorkspace(evt.target.closest('[data-kind="item"]')),
        'change-file-list-view': () => ui.changeFileListView(),

        'btn-menu-template': function () { ui.toggleInsertSnippet(); },
        'btn-menu-save': () => fileManager.save(),
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
        'reload-file-tree': () => ui.reloadFileTree(),
        'generate-single-file': () => ui.fileGenerator.generate(),
        'copy-generated-file': () => ui.fileGenerator.copy(),
        'create-workspace': () => uiTreeExplorer.CreateWorkspace(),
    },
};