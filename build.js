const fs = require('fs-extra')
const minify = require('minify');
const htmlMinifier = require('html-minifier').minify;


fs.copySync('./codetmp', './deploy/codetmp');
minifyFiles();

function minifyFiles() {

	function minifyJS(srcPath) {
		fs.readdir(srcPath, (err, files) => {
		  	files.forEach(filename => {
				let stats = fs.statSync(srcPath+filename);
				if (stats.isFile()) {
			    	if (['min','minify.js'].includes(filename)) return
					minify(srcPath+filename).then(content => {
						let path = srcPath+filename
						fs.writeFile(path, content, () => {
						  console.log('Done!')
						});
					})
				}
		    })
		});
	}

	function minifyCSS(srcPath) {
		fs.readdir(srcPath, (err, files) => {
		  	files.forEach(filename => {
				minify(srcPath+filename, {minifyCSS: true}).then(content => {
					let path = srcPath+filename
					fs.writeFile(path, content, () => {
					  console.log('Done!')
					});
				})
		    })
		});
	}

	function minifyHTML(srcPath) {
		fs.readdir(srcPath, (err, files) => {
		  	files.forEach(filename => {
		    	if (filename.endsWith('.html')) {
					let path = srcPath+filename;
		    		fs.readFile(path, 'utf8' , (err, data) => {
					  	if (err) {
					    	console.error(err)
					    	return
					   	}
						let content = htmlMinifier(data, {
							removeComments: true,
						    collapseWhitespace: true,
						})
						fs.writeFile(path, content, () => {
						  console.log('Done!')
						});
					})
		    	}
		    })
		});
	}

	minifyHTML('./deploy/codetmp/');
	minifyHTML('./deploy/codetmp/views/');
	minifyCSS('./deploy/codetmp/css/');
	minifyJS('./deploy/codetmp/js/');
	minifyJS('./deploy/codetmp/js/require/');
	minifyJS('./deploy/codetmp/js/core/');
	minifyJS('./deploy/codetmp/js/components/');
}