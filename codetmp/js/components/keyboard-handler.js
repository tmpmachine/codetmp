function delayedFocusCursorEditor() {
  window.setTimeout(() => {
    fileTab[activeTab].editor.env.editor.focus();
  }, 10);
};

const keyboardHandler = {

  init: function() {
    this.listenCombinationKeys();
    let handler = this.environmentKeyEventHandler.bind(this);
    window.addEventListener('blur', handler);
    window.addEventListener('keyup', handler)
    window.addEventListener('keydown', handler);
  },

  environmentKeyEventHandler: function(e) {
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
  },

  listenCombinationKeys: function() {
    let keyboard = new KeyTrapper();
    keyboard.isBlocked = function() {
      return stateManager.isState(1);
    }
    keyboard.listen(DOMEvents.keyboardShortcuts);
  },

  blur: function() {
    pressedKeys.shiftKey = false; pressedKeys.ctrlKey = false; 
    editorManager.isPasteRow = false;
  },

  keyUp: function(e) {
    pressedKeys.shiftKey = e.shiftKey; pressedKeys.ctrlKey = e.ctrlKey;
  },

  keyDown: function(e) {
    pressedKeys.shiftKey = e.shiftKey; 
    pressedKeys.ctrlKey = e.ctrlKey; 

    // L(modalWindowManager.hasOpenModal())
    if (modalWindowManager.hasOpenModal()) {
      // if (event.key === 'Escape') {
        // modalWindowManager.closeAll();
      // }
      return;
    }

    // prevent combination keys on input
    if (e.altKey && (fileTab[activeTab].editor.env.editor.isFocused() || document.activeElement.id == 'search-input')) {
      e.preventDefault();
    }

    if (!$('#btn-menu-my-files').classList.contains('active')) {
      if (event.key === 'Escape') {
        toggleInsertSnippet(false);
        delayedFocusCursorEditor();
      }
    }

    if (!e.ctrlKey && !e.altKey && $('#btn-menu-my-files').classList.contains('active')) {
      if (('_-.abcdefghijklmnopqrstuvwxyz1234567890'.includes(e.key))) {
        selectFileByName(e.key);
      } else {

        switch (event.key) {
          case 'Backspace': 
            previousFolder(); 
            break;
          case 'Escape':
            this.keyEscape();
            break;
          case 'Delete': 
            ui.fileManager.deleteSelected(); 
            break;
          case 'ArrowLeft': 
          case 'ArrowDown': 
          case 'ArrowRight': 
          case 'ArrowUp': 
            navigationHandler(event);
            break;
          case 'Enter': 
            if ($('#btn-menu-my-files').classList.contains('active') && selectedFile.length > 0) {
              event.preventDefault();
              doubleClickOnFile();
            }
          break;
        }

      }
    }
  },

  keyEscape: function() {
    if ($('#btn-menu-my-files').classList.contains('active')) {
      if (selectedFile.length > 0) {
        for (let el of selectedFile)
          toggleFileHighlight(el, false);
        fileExplorerManager.doubleClick = false;
        selectedFile.length = 0;
        ui.toggleFileActionButton();
      } else {
         if (!fileReaderModule.isDragging) {
           $('#btn-menu-my-files').click();
           delayedFocusCursorEditor();
        }
      }
    }
  },

};