const compoKeyInput = (function() {

  let SELF = {
    Init,
    listenCombinationKeys,
    keyEscape,
    environmentKeyEventHandler,
    keyDown,
    keyUp,
    blur,
    pressedKeys: {},
  };

  function listenCombinationKeys() {
    let keyboard = new KeyTrapper();
    keyboard.isBlocked = function() {
      return compoStateManager.isState(1);
    }
    keyboard.listen(DOMEvents.keyboardShortcuts);
  }

  function keyEscape() {
    if ($('#btn-menu-my-files').classList.contains('active')) {
      if (selectedFile.length > 0) {
        for (let el of selectedFile) {
          uiFileExplorer.ToggleFileHighlight(el, false);
        }
        uiFileExplorer.SetState('doubleClick', false);
        selectedFile.length = 0;
        ui.toggleFileActionButton();
      } else {
         if (!fileReaderModule.isDragging) {
           $('#btn-menu-my-files').click();
           delayedFocusCursorEditor();
        }
      }
    }
  }

  function blur() {
    SELF.pressedKeys.shiftKey = false; SELF.pressedKeys.ctrlKey = false; 
    compoEditor.editorManager.isPasteRow = false;
  }
  
  function keyUp(e) {
    SELF.pressedKeys.shiftKey = e.shiftKey; SELF.pressedKeys.ctrlKey = e.ctrlKey;
  }

  function keyDown(e) {
    SELF.pressedKeys.shiftKey = e.shiftKey; 
    SELF.pressedKeys.ctrlKey = e.ctrlKey; 

    if (compoModalWindow.hasOpenModal()) {
      return;
    }

    // prevent combination keys on input
    if (e.altKey && (fileTab[activeTab].editor.env.editor.isFocused() || document.activeElement.id == 'search-input')) {
      e.preventDefault();
    }

    if (!$('#btn-menu-my-files').classList.contains('active')) {
      if (event.key === 'Escape') {
        ui.toggleInsertSnippet(false);
        delayedFocusCursorEditor();
      }
    }

    if (!e.ctrlKey && !e.altKey && $('#btn-menu-my-files').classList.contains('active')) {
      if (('_-.abcdefghijklmnopqrstuvwxyz1234567890'.includes(e.key))) {
        uiFileExplorer.SelectFileByName(e.key);
      } else {

        switch (event.key) {
          case 'Backspace': 
            uiFileExplorer.PreviousFolder(); 
            break;
          case 'Escape':
            this.keyEscape();
            break;
          case 'Delete': 
            uiFileExplorer.deleteSelected(); 
            break;
          case 'ArrowLeft': 
          case 'ArrowDown': 
          case 'ArrowRight': 
          case 'ArrowUp': 
            uiFileExplorer.NavigationHandler(event);
            break;
          case 'Enter': 
            if ($('#btn-menu-my-files').classList.contains('active') && selectedFile.length > 0) {
              event.preventDefault();
              uiFileExplorer.DoubleClickOnFile();
            }
          break;
        }

      }
    }
  }

  function environmentKeyEventHandler(e) {
    switch (e.type) {
      case 'blur':
        this.blur();
        break;
      case 'keyup':
        this.keyUp(e);
        break;
      case 'keydown':
        this.keyDown(e);
        break;
    }
  }

  function Init() {
    this.listenCombinationKeys();
    let handler = this.environmentKeyEventHandler.bind(this);
    window.addEventListener('blur', handler);
    window.addEventListener('keyup', handler)
    window.addEventListener('keydown', handler);
  }

  function delayedFocusCursorEditor() {
    window.setTimeout(() => {
      fileTab[activeTab].editor.env.editor.focus();
    }, 10);
  };

  return SELF;

})();