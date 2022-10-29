let deferFeature1 = {

  openFileDirectory: async function() {
    if (!activeFile || $('#btn-menu-my-files').classList.contains('active')) 
      return;
    breadcrumbs.splice(1);
    let stack = [];
    let parentId = activeFile.parentId;
    while (parentId != -1) {
      folder = await fileManager.get({fid: parentId, type: 'folders'});
      breadcrumbs.splice(1, 0, {folderId:folder.fid, title: folder.name});
      parentId = folder.parentId;
    }
    loadBreadCrumbs();
    let targetMenuId;
    let useCallback = false;
    ui.toggleActionMenu(targetMenuId, useCallback);
    
    if (breadcrumbs.length > 1)
      breadcrumbs.pop();
    await fileManager.openFolder(activeFile.parentId);
  },

  toggleWrapMode: function() {
    settings.data.wrapMode = !settings.data.wrapMode;
    settings.save();
    focusTab(fileTab[activeTab].fid);
  },

  handlePasteRow: function() {
    if (editorManager.isPasteRow) {
      let editor = fileTab[activeTab].editor.env.editor;
      let selection = editor.getSelectionRange();
      let row = selection.start.row;
      let col = selection.start.column;
      editor.clearSelection();
      editor.moveCursorTo(row, 0);
      setTimeout(function() {
        editor.moveCursorTo(row+1, col);
      }, 1);
    }
  },

  toggleTemplate: function() {
    event.preventDefault();
      $('#btn-menu-template').click();
  }

};