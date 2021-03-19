const isSupport = (function() {

	function checkJSZip() {
		if ('JSZip' in window) {
			// TO DO
			// show/enable file download option
		}
	}

	function check(key) {
		switch (key) {
			case 'JSZip': checkJSZip(); break;
		}
	}

	let self = {
		check,
	    showSaveFilePicker: 'showSaveFilePicker' in window,
	}

	return self;

})();