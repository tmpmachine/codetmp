const modal = (function() {

  // preferences
  let modal;
  let content;
  let overlay;
  let btnClose;
  let form;
  let title;
  let message;
  let input;
  let hideClass = 'Hide';

  let _resolve;
  let _reject;
  let type = 'confirm';

  function initComponent(modal) {
    content = $('.Modal', modal)[0];
    overlay = $('.Overlay', modal)[0];
    btnClose = $('.Btn-close', modal)[0];
    form = $('.form', modal)[0];
    title = $('.Title', modal)[0];
    message = $('.Message', modal)[0];
    input = $('input', modal)[0]; 
  }

  function getResolver() {
    window.addEventListener('keydown', blur);
    return new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });
  }
  
  function closeModal() {
    modal.classList.toggle(hideClass, true)
    window.removeEventListener('keydown', blur);
    stateManager.popState([0]);
    form.onsubmit = () => event.preventDefault();
  }

  function blur() {
    if (event.key == 'Escape') {
      closeModal();
      if (type == 'prompt')
        _resolve(null);
      else
        _reject();
    } 
  }
  
  function close() {
    closeModal();
    if (type == 'prompt')
      _resolve(null)
    else
      _reject();
  }

  function submitForm() {
    event.preventDefault();
    if (this.dataset.submitter == 'submit') {
      if (type == 'confirm')
        _resolve();
      else
        _resolve(input.value);
    } else {
      if (type == 'prompt')
        _resolve(null)
      else {
        _reject();
      }
    }
    closeModal(); 
  }

  function confirm(promptText = '', isFocusSubmit = true) {
    modal = $('#cconfirm-modal');
    initComponent(modal);
    type = 'confirm';
    modal.classList.toggle(hideClass, false)
    stateManager.pushState([0]);
    overlay.onclick = close;
    btnClose.onclick = close;
    form.onsubmit = submitForm;
    $('.Btn-submit', modal)[0].onclick = function() {
      form.dataset.submitter = 'submit';
    }
    $('.Btn-cancel', modal)[0].onclick = function() {
      form.dataset.submitter = 'cancel';
    }
    document.activeElement.blur();
    setTimeout(() => {
      if (isFocusSubmit)
        $('.Btn-submit', modal)[0].focus();
      else
        $('.Btn-cancel', modal)[0].focus();
    }, 150);
    message.textContent = promptText;
    return getResolver();
  }

  function prompt(promptText = '', defaultValue = '', notes = '', selectionLength = 0) {
    modal = $('#cprompt-modal');
    initComponent(modal);
    input = $('input', modal)[0];
    type = 'prompt';
    modal.classList.toggle(hideClass, false)
    stateManager.pushState([0]);
    overlay.onclick = close;
    btnClose.onclick = close;
    form.onsubmit = submitForm;
    document.activeElement.blur()
    title.textContent = promptText;
    input.value = defaultValue;
    $('.Notes', modal)[0].innerHTML = notes;
    $('.Btn-submit', modal)[0].onclick = function() {
      form.dataset.submitter = 'submit';
    }
    $('.Btn-cancel', modal)[0].onclick = function() {
      form.dataset.submitter = 'cancel';
    }
    setTimeout(() => {
      input.focus();
      if (selectionLength > 0)
        input.setSelectionRange(0, selectionLength);
      else
        input.setSelectionRange(0, input.value.length);
    }, 150);
    return getResolver();
  }

  return {
    confirm,
    prompt,
  };

})();