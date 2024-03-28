import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import * as htmlMinifier from 'html-minifier';
import { transform } from 'lightningcss';
import { minify } from 'uglify-js';

minifyFiles();

async function minifyFiles() {

	function minifyJS(srcPath) {
		fs.readdir(srcPath, (err, files) => {
		  	files.forEach(async (filename) => {
				let path = srcPath+filename
				let stats = fs.statSync(path);
				if (stats.isFile()) {

					fs.readFile(path, 'utf8' , async (err, data) => {
						if (err) {
							console.error(err)
							return;
						}

						// Minify the input code
						const minifiedCode = minify(data).code;

						fs.writeFile(path, minifiedCode, () => {
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
				let path = srcPath+filename
				/* minify(path, {minifyCSS: true}).then(content => {
					fs.writeFile(path, content, () => {
					  console.log('Done!')
					});
				}) */

				fs.readFile(path, 'utf8' , (err, data) => {
					if (err) {
						console.error(err)
						return;
					}

					let { code, map } = transform({
						filename,
						targets: { 
							chrome: 95, 
						},
						code: Buffer.from(data),
						minify: true,
						sourceMap: false
					});

					fs.writeFile(path, code, () => {
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
						let content = htmlMinifier.minify(data, {
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

	await fsExtra.remove('./deploy/codetmp/')
	fsExtra.copySync('./codetmp', './deploy/codetmp');

	minifyHTML('./deploy/codetmp/');
	minifyHTML('./deploy/codetmp/views/');
	minifyCSS('./deploy/codetmp/css/');
	minifyJS('./deploy/codetmp/js/');
	minifyJS('./deploy/codetmp/js/require/');
	minifyJS('./deploy/codetmp/js/components/');
}