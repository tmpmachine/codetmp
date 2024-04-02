const modal = (function() {

  let $ = document.querySelector.bind(document);
  let $$ = document.querySelectorAll.bind(document);

  let _modal;
  let _resolve;
  let _reject;

  let confirmModal = $('.modal-component[data-name="confirm"]');
  confirmModal.addEventListener('onclose', closeHandler);
  confirmModal.querySelector('form').onsubmit = submitForm;
  confirmModal.querySelector('.btn-cancel').onclick = rejectForm;

  let promptModal = $('.modal-component[data-name="prompt"]');
  promptModal.addEventListener('onclose', closeHandler);
  promptModal.querySelector('form').onsubmit = submitForm;

  function submitForm() {
    event.preventDefault();
    if (this.dataset.type == 'confirm')
      _resolve();
    else
      _resolve(input.value);
    _modal.toggle();
  }

  function rejectForm() {
    if (this.form.dataset.type == 'confirm')
      _reject();
    else
      _resolve(null);
  }

  function closeHandler() {
    // delay to handle global key listener
    window.setTimeout(() => {
      compoStateManager.popState([0]);
    }, 50);
  }

  function confirm(message = '') {
    _modal = confirmModal.toggle();
    type = 'confirm';
    compoStateManager.pushState([0]);
    _modal.querySelector('.message').innerHTML = message;
    return getResolver();
  }

  function prompt(promptText = '', defaultValue = '', notes = '', selectionLength = 0) {
    _modal = promptModal.toggle();
    input = _modal.querySelector('input');
    type = 'prompt';
    compoStateManager.pushState([0]);
    _modal.querySelector('.title').innerHTML = promptText;
    input.value = defaultValue;
    _modal.querySelector('.notes').innerHTML = notes;
    setTimeout(() => {
      input.focus();
      if (selectionLength > 0)
        input.setSelectionRange(0, selectionLength);
      else
        input.setSelectionRange(0, input.value.length);
    }, 150);
    return getResolver();
  }

  function getResolver() {
    return new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });
  }

  return {
    confirm,
    prompt,
  };

})();