let singleFileGenerator = (function() {

  let SELF = {
    generate,
    copy,
  };

  async function generate(form) {
    let options = getFormOptions(form);
    let content = await getSingleFileContent(options);
    downloadFile(content);
  };

  async function copy(form) {
    let options = getFormOptions(form);
    let content = await getSingleFileContent(options);
    copyToClipboard(content);
  }

  function getFormOptions(form) {
    return {
      replaceDivless: form.replaceDivless.checked,
      minifyJs: form.minifyJs.checked,
      minifyCss: form.minifyCss.checked,
      transformCss: form.transformCss.checked,
      wrapCdata: form.wrapCdata.checked,
    };
  }

  async function getSingleFileContent(options) {
    let body = fileTab[activeTab].editor.env.editor.getValue();
    let preParent = activeFile ? activeFile.parentId : activeFolder;
    let path = ['root'];
    body = await replaceTemplate(body, preParent, path, options);
    body = body.replace(/<web-script /g, '<script ').replace(/<web-link /g, '<link ');
    if (options.replaceDivless)
      body = divless.replace(body);
    return body;
  }

  async function replaceTemplate(body, preParent = -1, path = ['root'], options) {
    let match = getMatchLinkedFile(body);
    while (match !== null) {
      let searchPath = JSON.parse(JSON.stringify(path));
      body = await replaceLinkedFile(match, body, preParent, searchPath, options);
      match = getMatchLinkedFile(body);
    }

    match = getMatchTemplate(body);
    while (match !== null) {
      let searchPath = JSON.parse(JSON.stringify(path));
      body = await replaceFile(match, body, preParent, searchPath, options);
      match = getMatchTemplate(body);
    }
    return body;
  }

  async function replaceFile(match, body, preParent, path, options) {

    let src = match[0].substring(11, match[0].length-9);
    let relativeParent = preParent;
    let parentId = await previewHandler.getDirectory(src, relativeParent, path);
    let files = await fileManager.TaskListFiles(parentId);
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
        if (tabIdx >= 0) {
          content = (activeFile && activeFile.fid === file.fid) ? fileTab[activeTab].editor.env.editor.getValue() : fileTab[tabIdx].editor.env.editor.getValue();
        } else {
          content = file.content;

          if (helper.hasFileReference(file.fileRef) && file.content === null) {
        
            if (file.fileRef.entry) {
              let fileResult = await file.fileRef.entry.getFile();
              content = await new Promise(resolve => {
                let reader = new FileReader();
                reader.onload = async function(evt) {
                  resolve(reader.result)
                }
                reader.readAsText(fileResult);
              })
            }
    
          }

        }

        content = await taskApplyFilePreprocessing(content, file.name, options);

      }

      let swap = await replaceTemplate(content, parentId, path, options);
      body = body.replace(new RegExp(match[0]), swap);

    }
    
    return body;

  }

  async function taskApplyFilePreprocessing(content, fileName, options) {

    try {
      
      // terser preprocessing
      if (typeof Terser != 'undefied' && helper.isMediaTypeJavascript(fileName) && options.minifyJs) {
        
        let result = await Terser.minify(content, { sourceMap: false });
        content = result.code;

      } 

      // lighting CSS preprocessing
      else if (helper.isMediaTypeCSS(fileName) ) {
        
        if (typeof(window.lightingCss) != 'undefined' && (options.minifyCss || options.transformCss) ) {

          let targets = {}
          if (options.transformCss) {
            targets = { chrome: 95, };
          }
          
          let { code, map } = lightingCss.transform({
            targets,
            code: new TextEncoder().encode(content),
            minify: options.minifyCss,
          });
          
          content = new TextDecoder().decode(code);
        }

        if (options.wrapCdata) {
          if (content.startsWith('/*! <![CDATA[ *//* !!! */')) {
            content = content.replace('/*! <![CDATA[ *//* !!! */', '')
          }
          if (content.endsWith('/*! ]]> *//* !!! */')) {
            content = content.replace('/*! ]]> *//* !!! */', '')
          }
          content = `/*! <![CDATA[ *//* !!! */\n${content}\n/*! ]]> *//* !!! */`
        }

      }

    } catch (error) {
      console.error(error);
    }

    return content;

  }

  function getMatchTemplate(content) {
    return content.match(/<file src=.*?><\/file>/);
  }

  function getMatchLinkedFile(content) {
    return content.match(/<script .*?src=.*?><\/script>|<link .*?rel=('|")stylesheet('|").*?>/);
  }

  async function replaceLinkedFile(match, body, preParent, path, options) {

    let tagName;
    let isScriptOrLink = false;
    let start = 11;
    let end = 9;
    let src = '';
    
    if (match[0].includes('<script')) {
      src = match[0].match(/src=['|"].*?['|"]/)[0];

      // keep element attributes
      let attrStr = '';
      try {
        attrStr = match[0].replace(src,'').match(/<script.*?>/)[0].replace('<script', '');
        attrStr = attrStr.substring(0, attrStr.length-1);
      } catch (error) {
        console.error(error);        
      }

      src = src.substring(5, src.length - 1);
      isScriptOrLink = true;
      tagName = `script ${attrStr}`.trim();
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
      let files = await fileManager.TaskListFiles(parentId);
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
          if (tabIdx >= 0) {  
            content = (activeFile && activeFile.fid === file.fid) ? fileTab[activeTab].editor.env.editor.getValue() : fileTab[tabIdx].editor.env.editor.getValue();
          } else {
            content = file.content;

            if (helper.hasFileReference(file.fileRef) && file.content === null) {
        
              if (file.fileRef.entry) {
                let fileResult = await file.fileRef.entry.getFile();
                content = await new Promise(resolve => {
                  let reader = new FileReader();
                  reader.onload = async function(evt) {
                    resolve(reader.result)
                  }
                  reader.readAsText(fileResult);
                })
              }
      
            }
          }
          
          content = await taskApplyFilePreprocessing(content, file.name, options);
          
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

  function copyToClipboard(content) {
    let node  = document.createElement('textarea');
    node.value = content;
    document.body.append(node);
    node.select();
    node.setSelectionRange(0, node.value.length);
    document.execCommand("copy");
    node.remove();
    aww.pop('Copied to clipboard.')
  }

  return SELF;

})();