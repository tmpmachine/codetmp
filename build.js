const fs = require('fs-extra')
const minify = require('minify');

// copy file
// fs.copySync('/tmp/myfile', '/tmp/mynewfile')

// copy directory, even if it has subdirectories or files
fs.copySync('./codetmp', './deploy/codetmp');
minifyJS();

function minifyJS() {

	function generateFiles(srcPath) {
		// fs.ensureDir(srcPath+'min/', err => {
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
		// })
	}

	generateFiles('./deploy/codetmp/js/');
	generateFiles('./deploy/codetmp/require/');
}