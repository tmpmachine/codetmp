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
          'ace/emmet-core/emmet.js',
          'ace/ext-emmet.js',
        ];
        callback = initEmmet;
        break;
      case 'autocomplete':
        files = [
          'ace/ext-language_tools.js',
          'ace/snippets/javascript.js',
          'ace/snippets/html.js',
        ];
        callback = initAutocomplete;
        break;
    }
    
    return { files, callback };
  }

  function load(name) {
    let ext = getModule(name);
    loadExternalFiles(ext.files).then(ext.callback);
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