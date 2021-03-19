const fs = require('fs-extra')
const minify = require('minify');

fs.copySync('./codetmp', './deploy/codetmp');
minifyJS();

function minifyJS() {

	function generateFiles(srcPath) {
		fs.readdir(srcPath, (err, files) => {
		  	files.forEach(filename => {
		    	if (['min','minify.js'].includes(filename)) return
				minify(srcPath+filename).then(content => {
					let path = srcPath+filename
					fs.writeFile(path, content, () => {
					  console.log('Done!')
					});
				})
		    })
		});
	}

	generateFiles('./deploy/codetmp/js/');
	generateFiles('./deploy/codetmp/require/');
}