"use strict"; 
(function() {

  function FileBundlerComponent() {

    const SELF = {
      
    };

    function createBundle(selectedFile, zip, options) {
      return new Promise(async (resolve) => {

        let notifId = notif.add({title: 'Bundling files ...'});
        let fileRequests = [];

         for (let file of selectedFile) {
            if (file.dataset.type == 'folder') {
              let f = await fileManager.get({fid: Number(file.getAttribute('data')), type: 'folders'})
              let folder = zip.folder(f.name);
              await insertTreeToBundle(f, folder, fileRequests, options);
            } else if (file.dataset.type == 'file') {
              let f = await fileManager.get({fid: Number(file.getAttribute('data')), type: 'files'});
              if (f.trashed)
                continue;
              if (f.isTemp && helper.hasFileReference(f.fileRef) && f.content === null) {
                zip.file(f.name, f.fileRef, {binary: true});
              } else {
                fileRequests.push({f, folder: zip, options});
              }
            }
          }

        let countError = 0;
        handleRequestChunks(fileRequests, () => {
          notif.update(notifId, {}, true);        
          notifId = notif.add({title: 'Downloading your files ...'});
          notif.update(notifId, {}, true);        
          resolve();
        }, countError);
      });
    }

    function downloadSingle(file, options) {
      return new Promise(async (resolve) => {

          let f = await fileManager.get({fid: Number(file.getAttribute('data')), type: 'files'})
          new Promise(resolveReader => {

              if (f.isTemp && helper.hasFileReference(f.fileRef) && f.content === null) {
                resolveReader(f.fileRef);
              } else {
                SELF.getReqFileContent(f, options).then(blob => {
                  resolveReader(blob);
                });
              }

          }).then(blob => {

            let firstBytes = blob.slice(0, 12);
            let r = new FileReader();
            let mimeType = helper.getMimeType(f.name);
            r.onload = function() {
              if (r.result == '/*RD-start*/')  {
                let r = new FileReader();
                r.onload = async function() {
                  let source = helper.getRemoteDataContent(r.result);
                  if (needConvertDivless(f, options) || needReplaceFileTag(f, options)) { 
                    fetch(source.downloadUrl).then(r => r.text()).then(async (content) => {
                        if (options.replaceFileTag)
                          content = await replaceFileTag(content, f.parentId);
                        resolve(new Blob([divless.replace(content)], {type:blob.type}));
                    });
                  } else {
                    fetch(source.downloadUrl).then(r => r.blob()).then(resolve);
                  }
                }
                r.readAsText(blob);     
              } else {
                if (needConvertDivless(f, options) || needReplaceFileTag(f, options)) { 
                  let r = new FileReader();
                  r.onload = async function() {
                    let content = r.result;
                    if (options.replaceFileTag)
                      content = await replaceFileTag(content, f.parentId);
                    resolve(new Blob([divless.replace(content)], {type:blob.type}));
                  }
                  r.readAsText(blob);                 
                } else {
                  resolve(blob);
                }
              }
            }
            r.readAsText(firstBytes);
            
          })
      });
    }

    function handleRequestChunks(requests, resolveZip, countError) {
      if (requests.length > 0) {
        let request = requests[0];
        let notifId = notif.add({title:'Downloading '+request.f.name, content: 'In progress'});
        SELF.getReqFileContent(request.f, request.options).then(content => {
          requests.shift();
          notif.update(notifId, {content:'Done'}, true);
          handleRequestChunks(requests, resolveZip, countError);
           request.folder.file(request.f.name, content);
        }).catch(() => {
          requests.shift();
          notif.update(notifId, {content:'Failed'}, true);
          handleRequestChunks(requests, resolveZip, countError+1);
        });
      } else {
        if (countError > 0)
          alert('There is an error while downloading files. You might want to redownload some files');
        resolveZip();
      }
    }

    SELF.getReqFileContent = function(f, options) {
      return new Promise(async (resolve) => {

        let mimeType = helper.getMimeType(f.name);
        let isMultimedia = helper.isMediaTypeMultimedia(mimeType);
        
        if (f.isTemp && helper.hasFileReference(f.fileRef) && f.content === null) {
          resolve(f.fileRef);
          return
        } else if (isMultimedia && typeof(f.blob) != 'undefined') {
          resolve(f.blob);
          return
        }
          
          if (f.loaded) {
            
              let content = f.content;
              if (needReplaceFileTag(f, options))
                content = await replaceFileTag(content, f.parentId);
              if (needConvertDivless(f, options)) 
                content = divless.replace(content);
              if (needMinifyJs(f, options)) {
                try {
                  let result = await Terser.minify(content, { sourceMap: false });
                  content = result.code;
                } catch (e) {
                  console.log(e)
                }
              }

            resolve(new Blob([content], {type: mimeType}));

          } else {

            if (helper.isHasSource(f.content)) {
              let source = helper.getRemoteDataContent(f.content);
              if (needConvertDivless(f, options) || needReplaceFileTag(f, options)) {
                fetch(source.downloadUrl).then(r => r.text()).then(async (content) => {
                  if (options.replaceFileTag)
                    content = await replaceFileTag(content, f.parentId);
                   content = divless.replace(content);
                   resolve(new Blob([content], {type: mimeType}));
                });
              } else { 
                fetch(source.downloadUrl).then(r => r.blob()).then(resolve);
              }
            } else {
              drive.downloadDependencies(f, 'blob').then(blob => {
                let firstBytes = blob.slice(0, 12);
                let r = new FileReader();
                r.onload = function() {
                  if (r.result == '/*RD-start*/')  {
                    let r = new FileReader();
                    r.onload = function() {
                      let source = helper.getRemoteDataContent(r.result);
                      if (needConvertDivless(f, options) || needReplaceFileTag(f, options)) { 
                        fetch(source.downloadUrl).then(r => r.text()).then(async (content) => {
                            if (options.replaceFileTag)
                              content = await replaceFileTag(content, f.parentId);
                            resolve(new Blob([divless.replace(content)], {type:blob.type}));
                        });
                      } else {
                        fetch(source.downloadUrl).then(r => r.blob()).then(resolve);
                      }
                    }
                    r.readAsText(blob);     
                  } else {
                    if (needConvertDivless(f, options)) {
                      let r = new FileReader();
                      r.onload = function() {
                        resolve(new Blob([divless.replace(r.result)], {type:blob.type}));
                      }
                      r.readAsText(blob);                 
                    } else {
                      if (isMultimedia)
                        f.blob = blob;
                      resolve(blob);
                    }
                  }
                }
                r.readAsText(firstBytes);
              });
            }
          }
      });
    }

    function needConvertDivless(f, options) {
      if (helper.isMediaTypeHTML(f.name) && options.replaceDivless)
        return true;
      return false;
    }

    function needReplaceFileTag(f, options) {
      if (helper.isMediaTypeHTML(f.name) && options.replaceFileTag)
        return true;
      return false;
    }

    function needMinifyJs(f, options) {
      if (typeof Terser != 'undefied' && helper.isMediaTypeJavascript(f.name) && options.minifyJs)
        return true;
      return false;
    }

    async function replaceFileTag(content, parentId) {
      let preParent = -1
      let match = getMatchTemplate(content);
      while (match !== null) {
        let searchPath = JSON.parse(JSON.stringify(['root']));
        content = await previewHandler.replaceFile(match, content, parentId, searchPath);
        match = getMatchTemplate(content);
      }
      return content;
    }

    function getMatchTemplate(content) {
      return content.match(/<file src=.*?><\/file>/);
    }

    function folderToZip(container, folder, fileRequests, options) {
      return new Promise(async resolve => {

        let folders = await fileManager.listFolders(container.fid);
        let files = await fileManager.listFiles(container.fid);
        for (let f of folders) {
          if (f.trashed)
            continue;
          let subFolder = folder.folder(f.name);
          await insertTreeToBundle(f, subFolder, fileRequests, options);
        }
        for (let f of files) {
          if (f.trashed)
            continue;
          if (f.isTemp && helper.hasFileReference(f.fileRef) && f.content === null) {    
          // if (f.fileRef.name !== undefined) {
            folder.file(f.name, f.fileRef, {binary: true});
          } else {
            fileRequests.push({f, folder, options})
          }
        }
        resolve();

      })
    }

    function insertTreeToBundle(container, folder, fileRequests, options) {
      return new Promise(resolve => {
        
        if (container.id.length > 0) {
          if (container.isLoaded) {
            folderToZip(container, folder, fileRequests, options).then(resolve);
          } else {
            drive.syncFromDrivePartial([container.id]).then(async () => {
              folderToZip(container, folder, fileRequests, options).then(resolve);
            });
          }
        } else {
          folderToZip(container, folder, fileRequests, options).then(resolve);
        }

      })
    }

    SELF.fileDownload = function(self) {
      if (selectedFile.length === 0)
        return;

      if (JSZip === undefined) {
        aww.pop('JSZip component is not yet loaded. Try again later.');
        return
      }

      let form = self.target;
      let zip = new JSZip();
      let zipName = ui.fileManager.getSelected(selectedFile[0]).title+'.zip';
      let isCompressed = ( selectedFile.length > 1 || (selectedFile.length === 1 && (selectedFile[0].dataset.type == 'folder')) );
      let options = {
        replaceDivless: form.replaceDivless.checked,
        replaceFileTag: form.replaceFileTag.checked,
        minifyJs: form.minifyJs.checked,
      };

      if (isCompressed) {
        createBundle(selectedFile, zip, options).then(() => {
          zip.generateAsync({type:"blob"})
          .then(function(content) {
            let blob = new Blob([content], {type: 'application/zip'});
            let a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = zipName;
            $('#limbo').appendChild(a);
            a.click();
            $('#limbo').removeChild(a);
          });
        })
      } else {
        downloadSingle(selectedFile[0], options).then(blob => {
          if (blob === null)
            return
          let a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = ui.fileManager.getSelected(selectedFile[0]).title;
          $('#limbo').appendChild(a);
          a.click();
          $('#limbo').removeChild(a);
        })
      }
    }

    SELF.init = function() {

    }

    return SELF;

  }

  let fileBundler = new FileBundlerComponent();
  window.app.registerComponent('fileBundler', fileBundler);
  fileBundler.init(); 

})();