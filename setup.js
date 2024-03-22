const fs = require('fs');
const fsExtra = require('fs-extra');

// Directory path
const destinationDir = `codetmp/assets/js/ace-builds/src-min-noconflict`
const sourceDir = 'node_modules/ace-builds/src-min-noconflict';

// Create the directory
try {
  fs.mkdirSync(destinationDir, { recursive: true });
} catch (error) {
  console.error(`Error creating directory: ${error}`);
}

// Copy files from source to destination directory
try {
  fsExtra.removeSync(destinationDir);
  fsExtra.copySync(sourceDir, destinationDir);
  console.log('Directory copied successfully.');
} catch (error) {
  console.error(`Error copying directory: ${error}`);
}