const fs = require('fs');
const fsExtra = require('fs-extra');

let dependencies = [
  { // ace-builds
    source: 'node_modules/ace-builds/src-min-noconflict/',
    destination: 'codetmp/assets/js/packages/ace-builds/src-min-noconflict/',
  }, 
  { // @isomorphic-git/lightning-fs
    source: 'node_modules/@isomorphic-git/lightning-fs/dist/',
    destination: 'codetmp/assets/js/packages/@isomorphic-git/lightning-fs/',
  }, 
  { // isomorphic-git
    source: 'node_modules/isomorphic-git/',
    destination: 'codetmp/assets/js/packages/isomorphic-git/',
    files: [ 'index.umd.min.js' ],
  }
];


for (let item of dependencies) {

  // Copy files from source to destination directory
  try {

    fsExtra.removeSync(item.destination);
    fs.mkdirSync(item.destination, { recursive: true });

    if (item.files) {
      // Copy specified files individually
      for (let file of item.files) {
        const sourcePath = `${item.source}${file}`;
        const destinationPath = `${item.destination}${file}`;

        fsExtra.copySync(sourcePath, destinationPath);
        console.log(`File '${file}' copied successfully.`);
      }
    } else {
      // Copy entire directory if no specific files are listed
      fsExtra.copySync(item.source, item.destination);
      console.log('Directory copied successfully.');
    }

  } catch (error) {
    console.error(`Error copying directory: ${error}`);
  }

}
