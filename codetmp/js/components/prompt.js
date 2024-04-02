(function() {

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
    content = modal.querySelector('.Modal');
    overlay = modal.querySelector('.Overlay');
    btnClose = modal.querySelector('.Btn-close');
    form = modal.querySelector('.form');
    title = modal.querySelector('.Title');
    message = modal.querySelector('.Message');
    input = modal.querySelector('input'); 
  }
  
  function closeModal() {
    modal.classList.toggle(hideClass, true)
    window.removeEventListener('keydown', blur);
    window.cprompt.isActive = false;
    form.onsubmit = () => event.preventDefault();
  }

  function blur() {
    if (event.key == 'Escape') {
      closeModal();
	if (type == 'prompt')
      _resolve(null);
    else {
      _reject();
    }
    } 
  }
  
  function close() {
    closeModal();
	if (type == 'prompt')
	    _resolve(null)
    else {
      _reject();
    }
  }

  function submitForm() {
    event.preventDefault();
    if (event.submitter.name == 'submit') {
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

  window.cconfirm = function(promptText = '') {
    modal = $('#cconfirm-modal');
    initComponent(modal);
    type = 'confirm';
    modal.classList.toggle(hideClass, false)
    window.cprompt.isActive = true;
    overlay.onclick = close;
    btnClose.onclick = close;
    form.onsubmit = submitForm;
    document.activeElement.blur();
    setTimeout(() => {
      modal.querySelector('.Btn-submit').focus();
    }, 150);
    window.addEventListener('keydown', blur);
    message.textContent = promptText;
    return new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    })
  }

  window.cprompt = function(promptText = '', defaultValue = '') {
    modal = $('#cprompt-modal');
    initComponent(modal);
    input = modal.querySelector('input');
    type = 'prompt';
    modal.classList.toggle(hideClass, false)
    window.cprompt.isActive = true;
    overlay.onclick = close;
    btnClose.onclick = close;
    form.onsubmit = submitForm;
    document.activeElement.blur()
    title.textContent = promptText;
    input.value = defaultValue;
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(0,input.value.length);
    }, 150);
    window.addEventListener('keydown', blur);
    return new Promise(resolve => {
      _resolve = resolve
    })
  }

})();