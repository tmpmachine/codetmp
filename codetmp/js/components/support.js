const support = (function() {

	let $ = document.querySelector.bind(document);

	function checkJSZip() {
		if ('JSZip' in window) {
			// TO DO
			// show/enable file download option
		}
	}

	function checkFirebase() {
		let scope = 'https://www.googleapis.com/auth/firebase'
	  let hasScopeFirebase = compoGsi.HasGrantScope(scope);
	  if (hasScopeFirebase) {
	  	// compoGsi.AddScope(scope);
		compoFirebaseHosting.init();
	    displayFeature('firebase');
	  } else {
	  	// compoGsi.RemoveScope(scope);
	    $('#project-list').innerHTML = '';
      	$('#site-list').innerHTML = '';
	  	hideFeature('firebase');
	  }
	}

	function hideFeature(name) {
		let style = $('style[data-feature="'+name+'"]');
		if (style)
			style.remove();
	}

	function displayFeature(name) {
		let style = document.createElement('style');
		style.dataset.feature = name;
		style.innerHTML = 'body.is-authorized .feature-disabled[data-feature="'+name+'"]{display:none}';
		style.innerHTML += 'body.is-authorized .feature-enabled[data-feature="'+name+'"]{display:unset}';
		document.body.append(style);
	}

	function check(key) {
		switch (key) {
			case 'JSZip': checkJSZip(); break;
			case 'firebase': checkFirebase(); break;
		}
	}

	let self = {
		check,
	    showSaveFilePicker: 'showSaveFilePicker' in window,
	}

	return self;

})();