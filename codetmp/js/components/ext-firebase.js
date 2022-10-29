const fire = (() => {

  let projectId = '';
  let siteID = '';
  let ver = '';
  let hash = '';
  let token = '';
  let _cacheControl = 1800;
  let headers = {
    'Authorization': 'Bearer '+token,
    'Content-Type': 'application/json',
  };
  let logger = $('#deploy-logs');

  function selectProject(value) {
    projectId = value;
    $('#site-list').innerHTML = '';
    listSite();
  }

  function selectSite(value) {
    siteID = value;
  }

  function listProject() {
    fetch('https://firebase.googleapis.com/v1beta1/projects?fields=results(projectId)',{
      headers,
    }).then(r=>r.json()).then(json => {
      $('#project-list').innerHTML = '';
      if (json.results) {
        for (let project of json.results) {
          let option = document.createElement('option');
          option.value = project.projectId;
          option.textContent = project.projectId;
          $('#project-list').append(option);
        }
        if (json.results.length > 0) {
           projectId = json.results[0].projectId;
           listSite();
        }
      }
    });
  }
  
  function listSite() {
    fetch(`https://firebasehosting.googleapis.com/v1beta1/projects/${projectId}/sites?fields=sites(name)`,{
    headers,
    }).then(r=>r.json()).then(json => {
      $('#site-list').innerHTML = '';
      for (let site of json.sites) {
        let option = document.createElement('option');
        let siteName = site.name.split('sites/')[1];
        option.value = siteName;
        option.textContent = siteName;
        $('#site-list').append(option);
      }
      if (json.sites.length > 0) {
         siteID = json.sites[0].name.split('sites/')[1]
      }
    })
  }

  function getHash(file) {
    return new Promise(resolve => {
      let reader = new FileReader();
        var batch = 1024 * 1024 * 2;
        var start = 0;
        var total = file.size;
        let method = sha256;
        reader.onload = function (event) {
          try {
            method = method.update(event.target.result);
            asyncUpdate();
          } catch(e) {
            L(e);
          }
        };
        var asyncUpdate = function () {
          if (start < total) {
            log('Hashing...' + (start / total * 100).toFixed(2) + '%')
            var end = Math.min(start + batch, total);
            reader.readAsArrayBuffer(file.slice(start, end));
            start = end;
          } else {
            let hash = method.hex()
            resolve(hash);
          }
        };
        asyncUpdate();
      
    })
  }

  function log(txt, isInline = false) {
    let newLine = isInline ? '' : '\n';
    logger.textContent += newLine+txt;
    logger.scrollTo(0, logger.scrollHeight);
  }
  
    function step1() {
      log('Logs :\n\n')
      log('Preparing files for upload. Avoid changing files before the upload process starts.\n\n')
      return new Promise(resolve => {
        log('Creating new site version... ')
        fetch(`https://firebasehosting.googleapis.com/v1beta1/sites/${siteID}/versions`,{
        method:'POST',
        headers,
        body:JSON.stringify({
                    "config": {
                      "headers": [{
                        "glob": "**",
                        "headers": {
                          "Cache-Control": "max-age="+_cacheControl
                        }
                      }]
                    }
                  })
        }).then(r=>r.json()).then(json =>{
          ver = json.name.split('versions/')[1]
          log('(Done)', true)
          resolve();
        })
      })
    }

    function getHashTree(tree, files) {

      return new Promise(resolve => {

        if (files.length === 0) {
          resolve();
        } else {

          let data = files.pop();
          let file = data.file;
          let options = {
            replaceFileTag: true,
            replaceDivless: settings.data.editor.divlessHTMLEnabled,
          };

          app.fileBundler.getReqFileContent(file, options).then(blob => {

            let r = new FileReader();
            r.onload = function() {
              const gzipped = fflate.gzipSync( new Uint8Array(r.result), {
                filename: file.name,
              });
              let gzipFile = new Blob([gzipped], {type:'application/gzip'})
              getHash(gzipFile).then(hash => {
                tree.push({
                  hash,
                  gzipFile,
                  path: data.path+file.name,
                });
                getHashTree(tree, files).then(resolve);
              })
            }
            r.readAsArrayBuffer(blob);
          });
        }
      }) 
    }

  function step2(files) {
    
    return new Promise(async resolve => {

      let gzipFiles = [];
      let hashTree = {};
      log('Compressing files... ')

      await getHashTree(gzipFiles, files)
      log('(Done)', true);
      for (let i=0; i<gzipFiles.length; i++)
        hashTree[gzipFiles[i].path] = gzipFiles[i].hash;

      log('Uploading hash tree... ')
      fetch(`https://firebasehosting.googleapis.com/v1beta1/sites/${siteID}/versions/${ver}:populateFiles`,{
        method:'POST',
        headers,
        body: JSON.stringify(
          {
            "files": hashTree
          })
      }).then(r=>r.json()).then(json => {
        log('(Done)', true);
        resolve(gzipFiles);
      });


    }) ;
  }


  function step4() {
    return new Promise(resolve => {
      log('Finalizing version... ');
      fetch(`https://firebasehosting.googleapis.com/v1beta1/sites/${siteID}/versions/${ver}?update_mask=status`,{
        headers,
        method:'PATCH',
        body: JSON.stringify({"status":"FINALIZED"})
      }).then(r=>r.json()).then(json => {
        log('(Done)', true);
        resolve();
      });
    });
  }


  function step5() {
    log('Releasing new version... ');
    fetch(`https://firebasehosting.googleapis.com/v1beta1/sites/${siteID}/releases?versionName=sites/${siteID}/versions/${ver}`,{
      method:'POST',
      headers,
    }).then(r=>r.json()).then(() => {
      log('(Done)', true);
      log('\n\n---Deploy complete.');
    });
  }


  async function init() {
    if (token.length > 0) {
       await auth2.init();
      listProject();
    }
  }

  function setToken(_token) {
    token = _token;
    headers['Authorization'] = 'Bearer '+_token;
  }

  async function populateQueue(queue, parentId, path) {
    let files = await fileManager.listFiles(parentId);
    for (let i=0; i<files.length; i++) {
      if (files[i].trashed)
        continue;
      queue.push({
        path,
        file: files[i],
      });
    }

    let folders = await fileManager.listFolders(parentId);
    for (let i=0; i<folders.length; i++) {
      if (folders[i].trashed)
        continue;
      if (folders[i].id.length > 0 && !folders[i].isLoaded)
        await drive.syncFromDrivePartial([folders[i].id]);
      await populateQueue(queue, folders[i].fid, path+folders[i].name+'/');
    }
  }

  async function populateFiles() {
    let queue = [];
    let parentId = activeFolder;
    let path = '/';
    await populateQueue(queue, parentId, path);
    return queue;
  }

  async function deploy(e) {
    let form = e.target;
    let files = await populateFiles();
    _cacheControl = parseInt(form.cacheControl.value);
    
    if (files.length > 50) {
      if (!window.confirm('Upload cap limit exceeded. You are about to upload more than 50 files. This will take a long time. Continue?')) {
        aww.pop('Deploy cancelled');
        return;
      }
    }

    $('#deploy-logs').textContent = '';
    modal.confirm('This will deploy current opened directory to selected Firebase project site. Continue?').then(() => {
      step1()
      .then(() => {
        step2(files)
        .then(gzFiles => {
          log('\n\n***\n\nUploading files... It is now safe to make changes to files.\n');

          uploadFile(gzFiles, gzFiles.length)
          .then(step4)
          .then(step5)
        })
      })
    })
  }

  function queueUpload(file,uploader) {
    waitFreeQueue().then(() => {

        let r = new FileReader();
        r.onload = function() {
          let opt = {
            method:'POST',
            headers,
            body: r.result
          };
          opt.headers['Content-Type'] = 'application/octet-stream'
           uploader.uploadCount++;
           log('Uploading ('+uploader.uploadCount+'/'+uploader.totalUpload+') '+file.path+'... ');
           fetch(`https://upload-firebasehosting.googleapis.com/upload/sites/${siteID}/versions/${ver}/files/${file.hash}` ,opt)
           .then(() => {
              running--;
              uploader.totalUpload--;
              runner();
              if (uploader.totalUpload === 0)
                uploader.resolve();
           })
           .catch(err => {
              running--;
              uploader.totalUpload--;
              runner();
              if (uploader.totalUpload === 0)
                uploader.resolve();
           });
        };
        r.readAsArrayBuffer(file.gzipFile);



    });
  }

  let totalUpload = 0;
  let currentUpload = 0;
  let uploadResolver = null;

  function uploadFile(gzFiles, total) {
    

    return new Promise(resolve => {
      let uploader = {
        resolve,
        totalUpload: total,
        uploadCount: 0,
      }
      for (let f of gzFiles) {
        queueUpload(f, uploader);
      }
      // if (gzFiles.length === 0) {
      //   resolve()
      // } else {
      //   let file = gzFiles.shift();
      //   let r = new FileReader();
      //   r.onload = function() {
      //     let opt = {
      //       method:'POST',
      //       headers,
      //       body: r.result
      //     };
      //     opt.headers['Content-Type'] = 'application/octet-stream'
      //      log('Uploading ('+(total-gzFiles.length)+'/'+total+') '+file.path+'... ');
      //      fetch(`https://upload-firebasehosting.googleapis.com/upload/sites/${siteID}/versions/${ver}/files/${file.hash}` ,opt)
      //      .then(() => {
      //         log('(Done)', true);
      //         uploadFile(gzFiles, total).then(resolve);
      //      })
      //   }
      //   r.readAsArrayBuffer(file.gzipFile);
      // }

    })
  }


  let q = []
  let limit = 10;
  let running = 0;
  
  function runner() {
    if (q.length > 0) {
      if (running < limit) {
        running++;
        let r = q.shift();
        r();
      }
       // else {
        // result.textContent += "queue limi exceeded\n";
      // }
    }
  }
  
  function waitFreeQueue() {
    return new Promise(resolve => {
      q.push(resolve);
      runner();
    })
  }
  
  return {
    init,
    setToken,
    selectProject,
    selectSite,
    deploy,
  };
})();