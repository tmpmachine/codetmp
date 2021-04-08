const helper = (function () {

  function getFileNameLength(fileName) {
    let arr = fileName.split('.');
    if (arr.length > 1)
      arr.pop();
    fileName = arr.join('.');
    return fileName.length;
  }

  function parseDescription(description) {
    if (typeof(description) == 'string') {
      if (description.startsWith('{')) {
        try {
          description = JSON.parse(description);
        } catch (e) {
          description = {};
        }
      } else {
        description = parseDescriptionOld(description);
      }
    }
    return description;
  }

  function fixOldParse(ob) {
    if (ob.bibibi)
      ob.isSummaryFix = true;
    if (ob.pre)
      ob.isWrap = true;
    if (ob.more)
      ob.isBreak = true;
    if (ob.blog)
      ob.blogName = ob.blog;
    if (ob.eid)
      ob.entryId = ob.eid;
  }

  function parseDescriptionOld(txt) {
    
    let obj = {};
    txt = txt.split('\n');
    
    for (let i = 0; i < txt.length; i++) {
      
      let t = txt[i];
      t = t.trim();
      if (t.length === 0) {
        
        txt.splice(i, 1);
        i -= 1;
        continue;
      }
      
      let key = t.split(':')[0];
      let val = t.split(key+': ')[1];
      
      if (val === "false")
        val = false;
      else if (val === "true")
        val = true;
      else if (val == undefined)
        val = "";
        
      obj[key] = val;
    }
    
    fixOldParse(obj);
    
    return obj;
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
    return content.startsWith('/*RD-start*/') && content.endsWith('/*RD-end*/');
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
      bg = '#1e44ff';
    else if (fileName.includes('.js'))
      bg = '#ccad1b';
    else if (fileName.includes('.html'))
      bg = '#fb5c10';
    return bg;
  }

  function redirectWarning() {
    let notSaved = false;
    for (let icon of $('.icon-rename')) {
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

  return {
    getFileNameLength,
    parseDescription,
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
    getFileIconColor,
    redirectWarning,
  };

})();