(function() {

  let $ = document.querySelector.bind(document);
	let $$ = document.querySelectorAll.bind(document);

  function initMenuBar() {

    function handler(e) {
      if (document.activeElement.classList.contains('Root') || document.activeElement.classList.contains('menu-link')) {
        if (e.target != document.activeElement && e.target.classList.contains('Root')) {
          if (e.target.dataset.callback === undefined) {
            e.target.focus();
            e.target.click();
          }
        }
      }
    }
    
    function blur() {
      if (document.activeElement.classList.contains('authorized') && !$('body').classList.contains('is-authorized')) {

      } else {
        document.activeElement.blur();
      }
    }
    
    $('#nav-bar').addEventListener('mouseover', handler);
    for (let node of $$('.menu-bar a')) {
      if (node.classList.contains('Root'))
        node.setAttribute('tabindex', '0');
      if (node.getAttribute('href') == '#')
        node.href = 'javascript:void(0)';
    }
    
    for (let node of $$('.menu-bar a:not(.Root)'))
      node.addEventListener('click', blur)
  }

  function initNavMenus() {

    for (let menu of $$('.menu-link')) {
      
      if (menu.dataset.shortcut) {
        let shortcut = $('#tmp-keyboard-shortcut').content.cloneNode(true);
        shortcut.querySelector('.shortcuts').textContent = menu.dataset.shortcut;
        menu.append(shortcut);
      }

      let key = menu.dataset.callback;
      let isSupported = checkBrowserSupport(key);
      if (isSupported) {
        menu.classList.toggle('hide', false);
        menu.addEventListener('click', DOMEvents.eventsMap.clickableMenu[key]);
      }
    }

    function checkBrowserSupport(key) {
      let status = true;
      switch (key) {
        case 'new-file-on-disk': status = support.showSaveFilePicker; break;
      }
      return status;
    }
  }

  function logWarningMessage() {
    let cssRule = "color:rgb(249,162,34);font-size:60px;font-weight:bold";
    setTimeout(console.log.bind(console, "%cATTENTION", cssRule), 0); 
    setTimeout(console.log.bind(console, "This window is intended for developers. Someone might be tyring to steal your data by asking you to enter malicious code from here."), 0); 
    setTimeout(console.log.bind(console, "Ignore this message if you're well aware of what you're going to do."), 0); 
  }

  function attachMouseListener() {
    $('#editor-wrapper').addEventListener('mousewheel', event => {
      if (fileTab[activeTab].editor.env.editor.isFocused()) {
          event.preventDefault();
        wheel(event.deltaY / 1000 * -1);
      }
    }, {passive:false});
    function wheel(delta) {
      if (compoKeyInput.pressedKeys.ctrlKey) {
        let value = (delta < 0) ? -1 : +1;
        compoEditor.editorManager.changeFontIndex(value);
      }
    }
  }

  initMenuBar();
  initNavMenus();
  logWarningMessage();
  attachMouseListener();

})();