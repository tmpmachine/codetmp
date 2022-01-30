const extension = (function() {

  function initEmmet() {
    ace.require(["ace/ace", "ace/ext/emmet"], function() {
      for (let tab of fileTab) {
        tab.editor.env.editor.setOption('enableEmmet', true);
      }
    });
  }

  function initAutocomplete() {
  	ace.require(["ace/ace", "ace/ext/language_tools"], function() {
      for (let tab of fileTab) {
        tab.editor.env.editor.setOption('enableBasicAutocompletion', true);
        tab.editor.env.editor.setOption('enableSnippets', true);
        tab.editor.env.editor.setOption('enableLiveAutocompletion', true);
      }
    });
  }

  function getModule(name) {
    let callback;
    let files = [];

    switch (name) {
      case 'emmet':
        files = [
          'assets/ace/emmet-core/emmet.js',
          'assets/ace/ext-emmet.js',
        ];
        callback = initEmmet;
        break;
      case 'autocomplete':
        files = [
          'assets/ace/ext-language_tools.js',
          'assets/ace/snippets/javascript.js',
          'assets/ace/snippets/html.js',
        ];
        callback = initAutocomplete;
        break;
    }
    
    return { files, callback };
  }

  function load(name) {
    let ext = getModule(name);
    window.app.loadFiles([{
      urls: ext.files,
      callback: ext.callback,
    }]);
  }

  function cache(name) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        name, 
        type: 'extension',
        files: getModule(name).files,
      });
    }
  }

  return { 
    load, 
    cache,
  };
  
})();