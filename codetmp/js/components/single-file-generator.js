window.app.registerComponent('single-file-generator', new SingleFileGeneratorComponent());

function SingleFileGeneratorComponent() {

  this.generate = async function(form) {
    let options = {
      replaceDivless: form.replaceDivless.checked,
    };
    let content = await getSingleFileContent(options);
    downloadFile(content);
  };

  this.copy = async function(form) {
    let options = {
      replaceDivless: form.replaceDivless.checked,
    };
    let content = await getSingleFileContent(options);
    copyToClipboard(content, form);
  }

  async function getSingleFileContent(options) {
    let body = fileTab[activeTab].editor.env.editor.getValue();
    let preParent = activeFile ? activeFile.parentId : activeFolder;
    let path = ['root'];
    body = await replaceTemplate(body, preParent, path);
    body = body.replace(/<web-script /g, '<script ').replace(/<web-link /g, '<link ');
    if (options.replaceDivless)
      body = divless.replace(body);
    return body;
  }

  async function replaceTemplate(body, preParent = -1, path = ['root']) {
    let match = getMatchLinkedFile(body);
    while (match !== null) {
      let searchPath = JSON.parse(JSON.stringify(path));
      body = await replaceLinkedFile(match, body, preParent, searchPath);
      match = getMatchLinkedFile(body);
    }

    match = getMatchTemplate(body);
    while (match !== null) {
      let searchPath = JSON.parse(JSON.stringify(path));
      body = await replaceFile(match, body, preParent, searchPath);
      match = getMatchTemplate(body);
    }
    return body;
  }

  async function replaceFile(match, body, preParent, path) {
    let src = match[0].substring(11, match[0].length-9);
    let relativeParent = preParent;
    let parentId = await previewHandler.getDirectory(src, relativeParent, path);
    let files = await fileManager.listFiles(parentId);
    let name = src.replace(/.*?\//g,'');
    let file = null;
    for (let i=0; i<files.length; i++) {
      if (files[i].trashed) {
        continue;
      } else if (files[i].name == name) {
        file = files[i];
      }
    }
    if (file === null) {
      body = body.replace(match[0], '');
      aww.pop('Required file not found : '+src);
    } else {
      let content = '';
      if (!file.loaded) {
        fileManager.downloadMedia(file);
      } else {
        let tabIdx = odin.idxOf(file.fid, fileTab, 'fid');
        if (tabIdx >= 0)
          content = (activeFile && activeFile.fid === file.fid) ? fileTab[activeTab].editor.env.editor.getValue() : fileTab[tabIdx].editor.env.editor.getValue();
        else
          content = file.content;
      }
      let swap = await replaceTemplate(content, parentId, path);
      body = body.replace(new RegExp(match[0]), swap);
    }
    return body;
  }

  function getMatchTemplate(content) {
    return content.match(/<file src=.*?><\/file>/);
  }

  async function getMatchLinkedFile(content) {
    return content.match(/<script .*?src=.*?><\/script>|<link .*?rel=('|")stylesheet('|").*?>/);
  }

  async function replaceLinkedFile(match, body, preParent, path) {

    let tagName;
    let isScriptOrLink = false;
    let start = 11;
    let end = 9;
    let src = '';
    
    if (match[0].includes('<script')) {
      src = match[0].match(/src=['|"].*?['|"]/)[0];
      src = src.substring(5, src.length - 1);
      isScriptOrLink = true;
      tagName = 'script';
    } else if (match[0].includes('<link')) {
      src = match[0].match(/href=['|"].*?['|"]/)[0];
      src = src.substring(6, src.length - 1);
      isScriptOrLink = true;
      tagName = 'style';
    }
    
    src = (src.length > 0) ? src : match[0].substring(start, match[0].length-end);
    let relativeParent = preParent;
  
    if (src.startsWith('https://') || src.startsWith('http://')) {
   
      body = body.replace(match[0], match[0].replace('<link ','<web-link ').replace('<script ','<web-script '));
      match = getMatchLinkedFile(body);
   
    } else {

      if (src.startsWith('__')) {
        relativeParent = -1;
        src = src.replace(/__\//, '');
      }
      
      let parentId = await previewHandler.getDirectory(src, relativeParent, path);
      let files = await fileManager.listFiles(parentId);
      let name = src.replace(/.*?\//g,'');
      let file = null;
      for (let i=0; i<files.length; i++) {
        if (files[i].trashed) {
          continue;
        } else if (files[i].name == name) {
          file = files[i];
        }
      }
      if (file === null) {
        body = body.replace(match[0], '');
        console.log(src+' not found');
      } else {
        let content = '';
        let ot = '', ct = '';
        if (tagName) {
          ot = '<'+tagName+'>\n';
          ct = '\n</'+tagName+'>';
        }

        if (file.loaded) {
          let tabIdx = odin.idxOf(file.fid, fileTab, 'fid');
          if (tabIdx >= 0)
            content = (activeFile && activeFile.fid === file.fid) ? fileTab[activeTab].editor.env.editor.getValue() : fileTab[tabIdx].editor.env.editor.getValue();
          else
            content = file.content;
        } else {
          fileManager.downloadMedia(file);
        }
      
        let swap = ot + content + ct;
        body = body.replace(new RegExp(match[0]), swap);
      }
    }
    
    return body;
  }

  function downloadFile(content) {
    let a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], {type: 'text/html'}));
    a.download = 'Untitled export.html';
    document.body.appendChild(a);
    a.click();
    a.remove()
  }

  function copyToClipboard(content, form) {
    let copyText = document.createElement('textarea');
    copyText.setAttribute('style', 'heigh:1px;position:absolute;opacity:0');
    copyText.value = content;
    form.append(copyText);
    copyText.select();
    copyText.setSelectionRange(0, content.length+1);
    document.execCommand("copy");
    copyText.remove();
    aww.pop('Copied to clipboard.')
  }

}