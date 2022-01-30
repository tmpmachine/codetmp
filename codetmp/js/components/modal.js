const modal = (function() {

  let _modal;
  let _resolve;
  let _reject;

  let confirmModal = $('.modal-component[data-name="confirm"]')[0];
  confirmModal.addEventListener('onclose', closeHandler);
  $('form', confirmModal)[0].onsubmit = submitForm;
  $('.btn-cancel', confirmModal)[0].onclick = rejectForm;

  let promptModal = $('.modal-component[data-name="prompt"]')[0];
  promptModal.addEventListener('onclose', closeHandler);
  $('form', promptModal)[0].onsubmit = submitForm;

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
      stateManager.popState([0]);
    }, 50);
  }

  function confirm(message = '') {
    _modal = confirmModal.toggle();
    type = 'confirm';
    stateManager.pushState([0]);
    $('.message', _modal)[0].innerHTML = message;
    return getResolver();
  }

  function prompt(promptText = '', defaultValue = '', notes = '', selectionLength = 0) {
    _modal = promptModal.toggle();
    input = $('input', _modal)[0];
    type = 'prompt';
    stateManager.pushState([0]);
    $('.title', _modal)[0].innerHTML = promptText;
    input.value = defaultValue;
    $('.notes', _modal)[0].innerHTML = notes;
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