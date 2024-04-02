let compoModalWindow = (function() {
  
	let $ = document.querySelector.bind(document);
	let $$ = document.querySelectorAll.bind(document);

    let SELF = {
		open,
		closeAll,
		hasOpenModal,
    };

    let activeModal;

	function closeAll() {
		for (let modal of $$('.modal-window'))
	      modal.classList.toggle('Hide', true);
      	compoStateManager.popState([0]);
	}

	function open(name) {
		closeAll();
		for (let modal of $$('.modal-window')) {
		    if (modal.dataset.name == name) {
		      modal.classList.toggle('Hide', false);
		      compoStateManager.pushState([0]);
		      break;
		    }
		  }
	}

	function hasOpenModal() {
		return compoStateManager.isState(1);
	}
    
    return SELF;
    
})();