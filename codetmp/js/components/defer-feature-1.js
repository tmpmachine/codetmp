let deferFeature1 = {
  
  toggleWrapMode: function() {
    settings.data.wrapMode = !settings.data.wrapMode;
    settings.save();
    compoFileTab.focusTab(fileTab[activeTab].fid);
  },

  handlePasteRow: function() {
    if (compoEditor.editorManager.isPasteRow) {
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
    $('#btn-menu-template').click();
  }

};