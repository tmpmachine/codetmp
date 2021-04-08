const preferences = (function() {

  function toggleWordWrap() {
    if (fileTab[activeTab]) {
      settings.data.editor.wordWrapEnabled = !settings.data.editor.wordWrapEnabled;
      let isEnabled = settings.data.editor.wordWrapEnabled;
      settings.save();
      let editor = fileTab[activeTab].editor;
      editor.env.editor.session.setUseWrapMode(isEnabled ? true : false);
    }
  }

  function toggleEmmet(isEnabled) {
    if (isEnabled) {
      extension.cache('emmet');
      extension.load('emmet');
    }
  }

  function toggleAutocomplete(isEnabled) {
    if (settings.data.editor.autoCompleteEnabled) {
      extension.cache('autocomplete');
      extension.load('autocomplete');
    }
  }

  function applyEditorSettings(key, isEnabled) {
    switch (key) {
      case 'emmetEnabled': toggleEmmet(isEnabled); break;
      case 'autoCompleteEnabled': toggleAutocomplete(isEnabled); break;
    }
  }

  function toggleEditorSettings() {
    let key = this.dataset.name;
    settings.data.editor[key] = this.checked;
    applyEditorSettings(key, this.checked);
    settings.save();
  }

  function initEditorSettings() {
    for (let input of $('.input-settings')) {
      let key = input.dataset.name;
      input.checked = settings.data.editor[key];
      applyEditorSettings(key, input.checked);
      input.addEventListener('input', toggleEditorSettings);
    }
  }

  function loadSettings() {
    initEditorSettings();
    $('#check-show-homepage').checked = settings.data.showHomepage ? true : false;
    $('#check-auto-sync').checked = settings.data.autoSync ? true : false;
    $('#check-save-token').checked = settings.data.saveGitToken ? true : false;

    if (!$('#check-show-homepage').checked) {
      toggleHomepage();
    }
  }

  return {
    loadSettings,
    toggleWordWrap,
  };

})();