let compoEditor = (function() {
  
    let SELF = {
        Init,
        SetMode,
        ToggleWrapMode,
        HandlePasteRow,
    };

    Object.defineProperty(SELF, 'editorManager', {
        get: () => editorManager,
    });

    
  function ToggleWrapMode() {
    settings.data.wrapMode = !settings.data.wrapMode;
    settings.save();
    compoFileTab.focusTab(fileTab[activeTab].fid);
  }

  function HandlePasteRow() {
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
  }
    
    function SetMode(fileName = '') {
        let editor = fileTab[activeTab].editor.env.editor;
        let themeMd =  false;
    
        if (fileName.endsWith('.txt'))
        editor.session.setMode();
        else if (fileName.endsWith('.css'))
        editor.session.setMode("ace/mode/css");
        else if (fileName.endsWith('.js'))
        editor.session.setMode("ace/mode/javascript");
        else if (fileName.endsWith('.md')) {
        editor.session.setMode("ace/mode/markdown");
        themeMd =  true;
        }
        else if (fileName.endsWith('.json'))
        editor.session.setMode("ace/mode/json");
        else
        editor.session.setMode("ace/mode/html");
    
        if (themeMd) {
            editor.setTheme('ace/theme/codetmp-markdown');
        } else {
            editor.setTheme('ace/theme/codetmp');
        }
    }
    
    function Init(content = '', scrollTop = 0, row = 0, col = 0) {
        let editorElement = document.createElement('div');
        editorElement.classList.add('editor');
        editorElement.style.opacity = '0'
        let editor = ace.edit(editorElement);
        editor.session.on('changeMode', function(e, session){
            if ('ace/mode/javascript' === session.getMode().$id) {
                if (!!session.$worker) {
                    session.$worker.send('setOptions', [{
                        'esversion': 9,
                        'esnext': false,
                    }]);
                }
            }
        });
        
        editor.setTheme("ace/theme/codetmp", () => {
            editorElement.style.opacity = '1';
        });
        editor.session.setMode("ace/mode/html");
        editor.session.setUseWrapMode(settings.data.editor.wordWrapEnabled);
        editor.setOption("scrollPastEnd", 1);
        editor.session.setTabSize(2);
        editor.setFontSize(editorManager.fontSize);
        editor.clearSelection();
        editor.focus();
        editor.moveCursorTo(0,0);
        
        
        editor.commands.addCommand({
          bindKey: {win:"Ctrl-Shift-P"},
          exec: function() {
            ui.toggleTemplate();
          }
        });
        editor.commands.addCommand({
            name: "movelinesup",
            bindKey: {win:"Ctrl-Shift-Up"},
            exec: function(editor) {
            editor.moveLinesUp();
            }
        });
        editor.commands.addCommand({
            name: "movelinesdown",
            bindKey: {win:"Ctrl-Shift-Down"},
            exec: function(editor) {
            editor.moveLinesDown();
            }
        });
        editor.commands.addCommand({
            name: "select-or-more-after",
            bindKey: {win:"Ctrl-D"},
            exec: function(editor) {
            if (editor.selection.isEmpty()) {
                editor.selection.selectWord();
            } else {
                editor.execCommand("selectMoreAfter");
            }
            }
        });
        editor.commands.addCommand({
            name: "removeline",
            bindKey: {win: "Ctrl-Shift-K"},
            exec: function(editor) {
            editor.removeLines();
            }
        });
        
        editor.commands.addCommand({
            name: "custom-copy",
            bindKey: {win: "Ctrl-C"},
            exec: function(editor) {
            let selection = editor.getSelectionRange();
            if (selection.start.row == selection.end.row && selection.start.column == selection.end.column) {
                let row = selection.start.row
                let col = selection.start.column
                editor.selection.setSelectionRange({start:{row,column:0},end:{row:row+1,column:0}})
                document.execCommand('copy');
                editor.clearSelection();
                editor.moveCursorTo(row, col);
                editorManager.isPasteRow = true;
            } else {
                document.execCommand('copy');
                editorManager.isPasteRow = false;
            }
            }
        });
        
        editor.commands.addCommand({
            name: "custom-cut",
            bindKey: {win: "Ctrl-X"},
            exec: function(editor) {
            let selection = editor.getSelectionRange();
            if (selection.start.row == selection.end.row && selection.start.column == selection.end.column) {
                let row = selection.start.row
                editor.selection.setSelectionRange({start:{row,column:0},end:{row:row+1,column:0}})
                document.execCommand('cut');
                editorManager.isPasteRow = true;
            } else {
                document.execCommand('cut');
                editorManager.isPasteRow = false;
            }
            }
        });
        
        editor.commands.addCommand({
            name: "decrease-font-size",
            bindKey: {win: "Ctrl--"},
            exec: function(editor) {
            event.preventDefault();
            editorManager.changeFontIndex(-1);
            }
        });
        editor.commands.addCommand({
            name: "increase-font-size",
            bindKey: {win: "Ctrl-="},
            exec: function(editor) {
            event.preventDefault();
            editorManager.changeFontIndex(+1);
            }
        });
        editor.commands.addCommand({
            name: "reset-font-size",
            bindKey: {win: "Ctrl-0"},
            exec: function(editor) {
            event.preventDefault();
            editorManager.changeFontIndex(0);
            }
        });
        editor.commands.addCommand({
            name: "gotoline",
            bindKey: {win: "Ctrl-G"},
            exec: function(editor, line) {
            if (typeof line === "number" && !isNaN(line))
                editor.gotoLine(line);
            editor.prompt({ $type: "gotoLine" });
            },
        });
        
        initEditorSmartBookmark(editor);
        
        let undoMgr = new ace.UndoManager();
        editor.setValue(content)
        editor.clearSelection();
        editor.getSession().setUndoManager(undoMgr);
        editor.focus();
        editor.getSession().setScrollTop(scrollTop);
        editor.moveCursorTo(row, col);
        editor.commands.removeCommand('fold');
        editor.session.on("change", function() {
            if (undoMgr.canUndo()) {
                fileTab[activeTab].fiber = 'fiber_manual_record';
                $('.icon-rename')[activeTab].textContent = 'fiber_manual_record';
                // $('.icon-rename')[activeTab].classList.toggle('w3-hide', false);
            } else {
                fileTab[activeTab].fiber = 'close';
                $('.icon-rename')[activeTab].textContent = 'close';
            }
        })
            
        if (settings.data.editor.emmetEnabled) {
            editor.setOption('enableEmmet', true);
        }
        if (settings.data.editor.autoCompleteEnabled) {
            editor.setOptions({
            'enableBasicAutocompletion': true,
            'enableSnippets': true,
            'enableLiveAutocompletion': true,
            });
        }
        
        editor.focus();
        
        return editorElement;
    }
    
    const editorManager = {
        fontSizeIndex: 2,
        defaultFontSizeIndex: 2,
        fontSizes: [12, 14, 16, 18, 21, 24, 30, 36, 48],
        isPasteRow: false,
        changeFontIndex: function(value) {
            let temp = this.fontSizeIndex;
            if (value === 0) {
                this.fontSizeIndex = this.defaultFontSizeIndex;
            } else {
                this.fontSizeIndex += value;
                this.fontSizeIndex = Math.min(this.fontSizes.length-1, Math.max(0, this.fontSizeIndex));
            }
            let isChanged = (temp != this.fontSizeIndex);
            if (isChanged) {
                let row = this.firstVisibleRow;
                fileTab[activeTab].editor.env.editor.setFontSize(this.fontSize);
                fileTab[activeTab].editor.env.editor.scrollToLine(row);
            }
        },
        get fontSize() { return this.fontSizes[this.fontSizeIndex] },
        get firstVisibleRow() { return fileTab[activeTab].editor.env.editor.getFirstVisibleRow() },
    };

    function initEditorSmartBookmark(editor) {
    
        editor.commands.addCommand({
          name: "custom-bookmark",
          bindKey: {win: "Alt-K Alt-K"},
          exec: function(editor) {
            ui.toggleBreakPoint(editor);
          }
        });
        
        editor.session.doc.on('change', updateDataOnDocChange.bind(editor.session));
        
        function updateDataOnDocChange(e) {
          let delta = e;
          let range = e;
          let len, firstRow, f1;
                  
          if (range.end.row == range.start.row)
            return;
                      
          if (delta.action == 'insert') {
            len = range.end.row - range.start.row;
            firstRow = range.start.row;
          } else if (delta.action == 'remove') {
            len = range.start.row - range.end.row;
            firstRow = range.start.row;
          }
          if (len > 0) {
            args = Array(len);
            args.unshift(firstRow, 0)
            this.$breakpoints.splice.apply(this.$breakpoints, args);
          } else if (len < 0) {
            let rem = this.$breakpoints.splice(firstRow + 1, -len);
            if(!this.$breakpoints[firstRow]){
              for (let oldBP in rem) {
                if (rem[oldBP]) {
                  this.$breakpoints[firstRow] = rem[oldBP]
                  break 
                }
              }
            }
          }
        }
        
        editor.commands.addCommand({
          name: "custom-clear-bookmark",
          bindKey: {win: "Alt-K Alt-L"},
          exec: function(editor) {
            if (window.confirm('Clear all bookmark?')) {
              editor.session.clearBreakpoints();
            }
          }
        });
        
        editor.commands.addCommand({
          name: "custom-next-bookmark",
          bindKey: {win: "Ctrl-Alt-."},
          exec: function(editor) {
            let row = editor.selection.getCursor().row+1;
            
            let found = false;
            
            for (let i=row; i<editor.session.$breakpoints.length; i++) {
              if (editor.session.$breakpoints[i] !== undefined) {
                editor.gotoLine(i+1)
                found = true;
                break;
              }
            }
            if (!found) {
            for (let i=0; i<row; i++) {
                if (editor.session.$breakpoints[i] !== undefined) {
                  editor.gotoLine(i+1)
                  break;
                }
              } 
            }
          }
      
        });
        
        editor.commands.addCommand({
          name: "custom-previous-bookmark",
          bindKey: {win: "Ctrl-Alt-,"},
          exec: function(editor) {
            let row = editor.selection.getCursor().row+1;
            let found = false;
            for (let i=row-2; i>=0; i--) {
              if (editor.session.$breakpoints[i] !== undefined) {
                editor.gotoLine(i+1)
                found = true;
                break;
              }
            }
            if (!found) {
            for (let i=editor.session.$breakpoints.length; i>row; i--) {
                if (editor.session.$breakpoints[i] !== undefined) {
                  editor.gotoLine(i+1)
                  break;
                }
              } 
            }
          }
        });
    }

    return SELF;
    
  })();