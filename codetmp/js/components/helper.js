let helper = (function () {

  let SELF = {
    getFileNameLength,
    generateRemoteDataContent,
    getRemoteDataContent,
    isHasSource,
    getMimeType,
    isMediaTypeText,
    isMediaTypeHTML,
    isMediaTypeStream,
    isMediaTypeMultimedia,
    isMediaTypeImage,
    isMediaTypeAV,
    isMediaTypeJavascript,
    isMediaTypeCSS,
    getFileIconColor,
    redirectWarning,
    hasFileReference,
    FileReaderReadAsText,
    TaskWaitUntil,
  };

  function TaskWaitUntil(stateCheckCallback, delay = 100) {
    return new Promise(resolve => {
        let interval = window.setInterval(() => {
        let shouldResolve = stateCheckCallback();
        if (shouldResolve) {
            window.clearInterval(interval);
            resolve();
        }
        }, delay);
    });
  }

  async function FileReaderReadAsText(fileRef) {
    
    let file = fileRef;
    if (fileRef.entry) {
      file = await fileRef.entry.getFile();
    }
    
    return new Promise(resolve => {
      let reader = new FileReader();
      reader.onload = async function(evt) {
          resolve(reader.result)
      }
      reader.readAsText(file);
    });
  }

  function getFileNameLength(fileName) {
    let arr = fileName.split('.');
    if (arr.length > 1)
      arr.pop();
    fileName = arr.join('.');
    return fileName.length;
  }

  function fixOldParse(ob) {
    if (ob.bibibi)
      ob.isSummaryFix = true;
    if (ob.pre)
      ob.isWrap = true;
    if (ob.more)
      ob.isBreak = true;
    if (ob.eid)
      ob.entryId = ob.eid;
  }

  function generateRemoteDataContent(origin, downloadUrl) {
    let data = {
      origin,
      downloadUrl,
    };
    return '/*RD-start*/' + JSON.stringify(data) + '/*RD-end*/';
  }

  function getRemoteDataContent(content) {
    content = content.replace('/*RD-start*/', '');
    content = content.replace('/*RD-end*/', '');
    return JSON.parse(content);
  }

  function isHasSource(content) {
    return content !== null && content.startsWith('/*RD-start*/') && content.endsWith('/*RD-end*/');
  }

  function getMimeType(name) {
    let ext = name.split('.').pop().toLowerCase();
    let type = 'application/octet-stream';
    switch (ext) {
      // web
      case 'svelte':
      case 'htm':
      case 'html': type ='text/html'; break;
      case 'xml': type ='text/xml'; break;
      case 'sql': type ='text/sql'; break;
      case 'js': type ='text/javascript'; break;
      case 'css': type ='text/css'; break;
      case 'json': type ='application/json'; break;
      case 'ico': type = 'image/vnd.microsoft.icon'; break;
      // media
      case 'jpg':
      case 'jpeg': type ='image/jpeg'; break;
      case 'gif': type ='image/gif'; break;
      case 'png': type ='image/png'; break;
      case 'svg': type ='image/svg+xml'; break;
      case 'bmp': type ='image/bmp'; break;
      case 'wav': type ='audio/wav'; break;
      case 'm4a': type ='audio/mp4'; break;
      case 'mp3': type ='audio/mpeg'; break;
      case 'ogg': type ='audio/ogg'; break;
      case 'mp4': type ='video/mp4'; break;
      case 'avi': type ='video/avi'; break;
      case 'webm': type ='video/webm'; break;
      // document
      case 'pdf': type ='application/pdf'; break;
      case 'md': type ='text/markdown'; break;
      // others
      case 'rar': type ='application/x-rar-compressed'; break;
      case 'ttf': type ='font/ttf'; break;
      case 'woff': type ='font/woff'; break;
      case 'woff2': type ='font/woff2'; break;
      case 'log':
      case 'txt': type ='text/plain'; break;
    }
    return type;
  }

  function isMediaTypeText(name) {
    return getMimeType(name).match(/^(text|application\/json)/);
  }

  function isMediaTypeHTML(name) {
    return getMimeType(name).match(/(text\/html|text\/xml)/);
  }

  function isMediaTypeJavascript(name) {
    return getMimeType(name).match(/(text\/javascript)/);
  }

  function isMediaTypeCSS(name) {
    return getMimeType(name).match(/(text\/css)/);
  }

  function isMediaTypeMultimedia(mimeType) {
    return mimeType.match(/^(audio|video|image)/);
  }
  function isMediaTypeImage(mimeType) {
    return mimeType.match(/^image/);
  }
  function isMediaTypeAV(mimeType) {
    return mimeType.match(/^(video|audio)/);
  }

  function isMediaTypeStream(name) {
    return getMimeType(name) == 'application/octet-stream';
  }

  function getFileIconColor(fileName) {
    let bg = '#777777';
    if (fileName.includes('.css'))
      bg = '#2196f3';
    else if (fileName.includes('.js'))
      bg = '#ffeb3b';
    else if (fileName.includes('.html'))
      bg = '#FF5722';
    return bg;
  }

  function redirectWarning() {
    let notSaved = false;
    for (let icon of $$('.icon-rename')) {
      if (icon.textContent !== 'close') {
        notSaved = true;
        break;
      }
    }
    
    if (fileTab.length > 1) {
      notSaved = true
    } else {
      if (fileTab[0].fid[0] !== '-')
        notSaved = true
    }
    
    if (notSaved)
      return  'Changes you made may not be saved';
  }

  function hasFileReference(fileRef) {
    return (typeof fileRef.name == 'string' && typeof fileRef.size == 'number' && typeof fileRef.type == 'string');
  }

  return SELF;

})();