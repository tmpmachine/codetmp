TMP.plugins.load('loadEditor', function(compatibilityMode) {
    
  let editor = ace.edit("editor");
  editor.setTheme("ace/theme/monokai", () => {
    $('#blocker-editor').style.display = 'none';
  });
  editor.session.setMode("ace/mode/html");
  editor.session.setUseWrapMode(true);
  editor.session.setTabSize(2);
  editor.setFontSize(14);
  editor.clearSelection();
  editor.focus();
  editor.moveCursorTo(0,0);
  
  editor.commands.addCommand({
    name: "movelinesup",
    bindKey: {win:"Ctrl-Shift-Up"},
    exec: function(editor) {
      editor.moveLinesUp();
      saveListener(null, true);
    }
  });
  editor.commands.addCommand({
    name: "movelinesdown",
    bindKey: {win:"Ctrl-Shift-Down"},
    exec: function(editor) {
      editor.moveLinesDown();
      saveListener(null, true);
    }
  });
  editor.commands.addCommand({
    name: "select-or-more-after",
    bindKey: {win:"Ctrl-D"},
    exec: function(editor) {
      if (editor.selection.isEmpty())
        editor.selection.selectWord();
      else
        editor.execCommand("selectMoreAfter");
    }
  });
  editor.commands.addCommand({
    name: "removeline",
    bindKey: {win: "Ctrl-Shift-K"},
    exec: function(editor) {
      editor.removeLines();
      saveListener(null, true);
    }
  });
  
  let fontSizeScale = [12, 14, 16, 18, 21, 24, 30, 36, 48];
  let defaultFontSize = 1;
  let fontSize = 1;
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
      fontSize = defaultFontSize;
      editor.setFontSize(fontSizeScale[defaultFontSize]);
    }
  });
  
  editor.commands.addCommand({
    name: "toggle-wrap-mode",
    bindKey: {win: "Alt-R"},
    exec: function(editor) {
      event.preventDefault();
      let isWrap = editor.env.editor.session.getUseWrapMode();
      editor.session.setUseWrapMode(isWrap ? false : true);
    }
  });

  editor.clearSelection();
  editor.focus();
  editor.moveCursorTo(0,0);
  $('#editor').env.editor.commands.removeCommand('fold');
  $('#editor').addEventListener('keydown', saveListener);
});