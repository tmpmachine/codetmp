var liquidOSK = false;

function insertAtCaret(areaId, text) {
  
  if (text === '~')
    $('#editor').env.editor.session.insert($('#editor').env.editor.getCursorPosition(), '\t');
  else if (text.trim() === 'keyboard_arrow_up')
  {
    let pos = $('#editor').env.editor.getCursorPosition();
    $('#editor').env.editor.gotoLine(pos.row, pos.column, true);
  }
  else if (text.trim() === 'keyboard_arrow_down')
  {
    let pos = $('#editor').env.editor.getCursorPosition();
    $('#editor').env.editor.gotoLine(pos.row+2, pos.column, true);
  }
  else if (text.trim() === 'keyboard_arrow_left')
  {
    let pos = $('#editor').env.editor.getCursorPosition();
    $('#editor').env.editor.gotoLine(pos.row+1, pos.column-1, true);
  }
  else if (text.trim() === 'keyboard_arrow_right')
  {
    let pos = $('#editor').env.editor.getCursorPosition();
    $('#editor').env.editor.gotoLine(pos.row+1, pos.column+1, true);
  }
  else if (text.trim() === 'arrow_upward')
    $('#editor').env.editor.moveLinesUp();
  else if (text.trim() === 'arrow_downward')
    $('#editor').env.editor.moveLinesDown();
  else if (text.trim() === 'calendar_view_day')
    $('#editor').env.editor.duplicateSelection()
  else if (text.trim() === 'mode_comment')
    $('#editor').env.editor.toggleCommentLines()
  else if (text.trim() === 'keyboard')
    $('#my-osk').classList.toggle('w3-top');
  else if (text.trim() === 'bug_report')
  {
    o.classList.toggle($('.osk'), 'w3-opacity-max');
    o.classList.toggle($('#btn-osk-opacity'), 'w3-opacity-max', false);
  }
  else
    $('#editor').env.editor.session.insert($('#editor').env.editor.getCursorPosition(), text);
  
  return
  
  
  var txtarea = document.getElementById(areaId);
  if (!txtarea) {
    return;
  }

  if (text === '~')
  {
    let o = txtarea;
    var oS = o.scrollTop;
		if (o.setSelectionRange)
		{
			var sS = o.selectionStart;
			var sE = o.selectionEnd;
			o.value = o.value.substring(0, sS) + "\t" + o.value.substr(sE);
			o.setSelectionRange(sS + 1, sS + 1);
			o.focus();
		}
		else if (o.createTextRange)
			document.selection.createRange().text = "\t";
		o.scrollTop = oS;
  }
  else if (text === '^')
  {
    liquidOSK = liquidOSK ? false : true;
    if (liquidOSK)
      $('#editor-wrapper').style.height = 'calc(100% - '+$('#file-title').offsetHeight+'px - '+$('#my-osk').offsetHeight+'px)';
    else
      $('#editor-wrapper').style.height = 'calc(100% - '+$('#file-title').offsetHeight+'px)';
  }
  else
  {
    var scrollPos = txtarea.scrollTop;
    var strPos = 0;
    var br = ((txtarea.selectionStart || txtarea.selectionStart == '0') ?
      "ff" : (document.selection ? "ie" : false));
    if (br == "ie") {
      txtarea.focus();
      var range = document.selection.createRange();
      range.moveStart('character', -txtarea.value.length);
      strPos = range.text.length;
    } else if (br == "ff") {
      strPos = txtarea.selectionStart;
    }
  
    var front = (txtarea.value).substring(0, strPos);
    var back = (txtarea.value).substring(strPos, txtarea.value.length);
    txtarea.value = front + text + back;
    strPos = strPos + text.length;
    if (br == "ie") {
      txtarea.focus();
      var ieRange = document.selection.createRange();
      ieRange.moveStart('character', -txtarea.value.length);
      ieRange.moveStart('character', strPos);
      ieRange.moveEnd('character', 0);
      ieRange.select();
    } else if (br == "ff") {
      txtarea.selectionStart = strPos;
      txtarea.selectionEnd = strPos;
      txtarea.focus();
    }
  
    txtarea.scrollTop = scrollPos;
  }
}

function classicEnter(e) {
  let o = $('#editor');
	var kC = e.keyCode ? e.keyCode : e.charCode ? e.charCode : e.which;
	if (kC == 9 && !e.shiftKey && !e.ctrlKey && !e.altKey)
	{
		var oS = o.scrollTop;
		if (o.setSelectionRange)
		{
			var sS = o.selectionStart;
			var sE = o.selectionEnd;
			o.value = o.value.substring(0, sS) + "\t" + o.value.substr(sE);
			o.setSelectionRange(sS + 1, sS + 1);
			o.focus();
		}
		else if (o.createTextRange)
		{
			document.selection.createRange().text = "\t";
			e.returnValue = false;
		}
		o.scrollTop = oS;
		if (e.preventDefault)
		{
			e.preventDefault();
		}
		return false;
	}
	else if (kC == 13 && !e.shiftKey && !e.ctrlKey && !e.altKey)
	{
		var oS = o.scrollTop;
		if (o.setSelectionRange)
		{
			var sS = o.selectionStart;
			var sE = o.selectionEnd;
			
			let lines = o.value.substring(Math.max(0,sE-100),sE).split('\n');
			let match = lines[lines.length-1].match(/^\t+/)
			let tab = '';
			let tabLen = 0;
			let anomally = 0;
			if (match !== null)
			{
			  tab = match[0];
			  tabLen = tab.split('\t').length;
			}
			else
			   anomally = 1;
			
			o.value = o.value.substring(0, sS) + "\n" + tab + o.value.substr(sE);
			o.setSelectionRange(sS + 1 + tabLen, sS + tabLen + anomally);
			o.focus();
		}
		else if (o.createTextRange)
		{
		  L(123);
			document.selection.createRange().text = "\t";
			e.returnValue = false;
		}
		o.scrollTop = oS;
		if (e.preventDefault)
		{
			e.preventDefault();
		}
		return false;
	}
	return true;
}


THOR.plugins._add('loadEditor', function(compatibilityMode) {
    
  let editor;
    
  $('#ex-editor').classList.toggle('w3-hide', false);
    
  // switch id
  $('#editor').setAttribute('id', 'tmp-editor');
  $('#ex-editor').setAttribute('id', 'editor');
  $('#tmp-editor').setAttribute('id', 'ex-editor');
  $('#ex-editor').classList.toggle('w3-hide', true);
  
  if (!compatibilityMode)
  {
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/html");
    editor.session.setUseWrapMode(true);
    editor.session.setTabSize(2);
    editor.setFontSize(14);
    editor.setValue($('#ex-editor').value);
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
        editor.removeLines()
        saveListener(null, true);
      }
    });
  
    editor.moveCursorToPosition({row:0,column:0});
    editor.focus();
    
    editor.setValue($('#ex-editor').value);
  }
  else
  {
    
    editor = $('#editor');
    editor.env = {
      editor: $('#editor')
    };
    
    editor.env.editor.getValue = function() {
      return $('#editor').value;
    };
    editor.env.editor.setValue = function(value) {
      $('#editor').value = value;
    };
    editor.env.editor.clearSelection = function() { };
    editor.env.editor.gotoLine = function() {
      $('#editor').focus();
    };
    
    editor.env.editor.getCursorPosition = function() { return {row:0} };
    editor.env.editor.moveCursorToPosition = function() { };
    editor.env.editor.insert = function (text) {
      text = text || '';
      if (document.selection) {
        // IE
        this.focus();
        var sel = document.selection.createRange();
        sel.text = text;
      } else if (this.selectionStart || this.selectionStart === 0) {
        // Others
        var startPos = this.selectionStart;
        var endPos = this.selectionEnd;
        this.value = this.value.substring(0, startPos) +
          text +
          this.value.substring(endPos, this.value.length);
        this.selectionStart = startPos + text.length;
        this.selectionEnd = startPos + text.length;
      } else {
        this.value += text;
      }
    };
    
    editor.env.editor.getSession = function() {
      
      return {
        setUndoManager: function() { }
      };
      
    };
    editor.env.editor.session = {
      setMode: function() { }
    };
    
    editor.addEventListener('keydown', classicEnter);
    editor.setValue($('#ex-editor').env.editor.getValue());
  }
  
  $('#editor').addEventListener('keydown', saveListener);
});