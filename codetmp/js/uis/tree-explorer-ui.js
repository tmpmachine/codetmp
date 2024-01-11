let uiTreeExplorer = (function() {
  
    let SELF = {
        RenameFolder,
        RenameFile,
        AppendFile,
        AppendFolder,
        CreateWorkspace,
    };
    
    function RenameFolder(folder) {
        app.getComponent('fileTree').then(fileTree => {
            fileTree.renameItem(folder, 'folder');
        });
    }

    function RenameFile(file) {
        app.getComponent('fileTree').then(fileTree => {
            fileTree.renameItem(file, 'file');
        });
    }

    function AppendFile(file) {
        app.getComponent('fileTree').then(ft => {
            ft.appendFile(file);
        });
    }

    function AppendFolder(folder) {
        app.getComponent('fileTree').then(ft => {
            ft.appendFolder(folder);
        });
    }

    function CreateWorkspace() {
        app.getComponent('fileTree').then(ft => {
            ft.createWorkspace(activeFolder);
        });
    }
    
    return SELF;
    
})();