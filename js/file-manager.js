var activeFolder = -1;
var selectedFile = [];
var clipBoard = [];
var copyParentFolderId = -2;

const fm = {
  INSERT: {
    folder: function(data) {
      
      let folder = fs.new('folders');
      folder.fid = fs.data.counter.folders;
      
      for (let d in data)
        folder[d] = data[d];

      fs.data.folders.push(folder);
      fs.data.counter.folders++;
      
    },
    file: function(data) {
      
      let file = fs.new('files');
      file.fid = fs.data.counter.files;
      
      for (let d in data)
        file[d] = data[d];

      fs.data.files.push(file);
      fs.data.counter.files++;
      
      return file;
    }
  }
};


function changeRev(revId) {
  
  
  
}

function handleSync(sync) {
  
  if (sync.action === 'create' || sync.action === 'copy')
  {
    sync.metadata = [];
    fs.data.sync.push(sync);
  }
  else if (sync.action === 'update')
  {
      fs.data.sync.push(sync);
    
      for (let i=0; i<fs.data.sync.length-1; i++)
      {
          let s = fs.data.sync[i];
          
          if (s.fid === sync.fid)
          {
              if (s.action === 'create' || s.action === 'copy')
              {
                
                if (!sync.metadata.includes('trashed'))
                {
                  fs.data.sync.splice(i, 1);
                  sync.action = s.action;
                  sync.metadata = [];
                }
                
              }
              else
              {
                
                for (let meta of s.metadata)
                {
                  if (sync.metadata.indexOf(meta) < 0)
                    sync.metadata.push(meta);
                    
                  if (meta === 'parents')
                    sync.source = s.source;
                }
                
                fs.data.sync.splice(i, 1);
              }
              break;
          }
      }
      
  }
  else if (sync.action === 'delete')
  {
    for (let i=0; i<fs.data.sync.length; i++)
    {
      if (fs.data.sync[i].fid === sync.fid)
        fs.data.sync.splice(i, 1);
    }
  }
  
  
  L('---------')
  for (let i of fs.data.sync)
  {
    L(i)
  }
}


function fileRename(fid) {
  
  let file = odin.dataOf(fid, fs.data.files, 'fid');
  
  let input = window.prompt('Rename :', file.name);
  if (input === null)
    return;
  if (input.trim().length === 0)
    input = file.name;
  else
    file.name = input;
  
  handleSync({
    fid,
    action: 'update',
    metadata: ['name'],
    type: 'files'
  });
  drive.syncToDrive();
  
  fs.save();
  fileList();
  
  // editor
  if (activeFile && fid === activeFile.fid)
  {
    if (file.name.endsWith('.js'))
      $('#editor').env.editor.session.setMode("ace/mode/javascript");
    else if (file.name.endsWith('.php'))
      $('#editor').env.editor.session.setMode("ace/mode/php");
    else if (file.name.endsWith('.css'))
      $('#editor').env.editor.session.setMode("ace/mode/css");
    else if (file.name.endsWith('.json'))
      $('#editor').env.editor.session.setMode("ace/mode/json");
    else
      $('#editor').env.editor.session.setMode("ace/mode/html");
    
    $('.file-name')[activeTab].textContent = file.name;
  }
}

function fileList() {
  
  var el;
  $('#file-list').innerHTML = '';
  
  let folders = odin.filterData(activeFolder, fs.data.folders, 'parentId');
  
  folders.sort(function(a, b) {
    return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
  });

  for (let f of folders)
  {
    if (f.trashed) continue;
    
    el = o.cel('div',{innerHTML:o.creps('tmp-folder-list',f)});
    $('#file-list').appendChild(el);
  }
  
  $('#file-list').appendChild(o.cel('div', { class: 'w3-row w3-padding-small' }));
  
  let files = odin.filterData(activeFolder, fs.data.files, 'parentId');
  
  files.sort(function(a, b) {
    return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
  });
  
  for (let {fid, name, trashed} of files)
  {
    if (trashed) continue;
    
    let clsLock = '';
    let defaultBg = '#777';
    
    if (name.includes('.blogger'))
      defaultBg = '#ffa51e';
    else if (name.includes('.js'))
      defaultBg = '#a81eff';
    else if (name.includes('.php'))
      defaultBg = 'orange';
    else if (name.includes('.tmp'))
      defaultBg = '#4aad4d';
    else if (name.includes('.lib'))
      defaultBg = 'burlywood';
      
    if (fid === locked)
      clsLock = 'w3-text-purple';
    
    el = o.cel('div',{ innerHTML: o.creps('tmp-file-list', {
      fid,
      name,
      defaultBg,
      clsLock
    }) });
    
    $('#file-list').appendChild(el);
  }
  
  loadBreadCrumbs();
  $('#btn-rename-folder').classList.toggle('w3-hide', true);
  selectedFile.splice(0, 1);
}



function loadBreadCrumbs() {
  $('#breadcrumbs').innerHTML = '';
  let i = 0;
  for (let b of breadcrumbs)
  {
    let link;
    if (i == breadcrumbs.length-1)
      link = o.cel('div',{innerHTML:o.creps('tmp-breadcrumb-fake', b),class:'w3-inline-block w3-left'});
    else
      link = o.cel('div',{innerHTML:o.creps('tmp-breadcrumb', b),class:'w3-inline-block w3-left'});
    $('#breadcrumbs').appendChild(link);
    i++;
  }
}

function openBread(id) {
  activeFolder = id;
  let idx = odin.idxOf(id,breadcrumbs,'folderId');
  breadcrumbs = breadcrumbs.slice(0,idx+1);
  fileList();
}

function openFolderConfirm(el) {
  if (selectedFile.length < 1)
    selectedFile.push(el);
  
  if (lastClickEl !== undefined && lastClickEl != el)
  {
    selectedFile.splice(0, 1);
    selectedFile.push(el);
    
    lastClickEl.classList.toggle('w3-light-blue',false);
    lastClickEl.classList.toggle('w3-hover-light-blue',false);
    doubleClick = false;
    
  }
  
  if (!doubleClick)
  {
    $('#btn-rename-folder').classList.toggle('w3-hide', false);
    
    lastClickEl = el;
    doubleClick = true;
    el.classList.toggle('w3-light-blue',true);
    el.classList.toggle('w3-hover-light-blue',true);
    setTimeout(function(){
      doubleClick = false;
    }, 500);
  }
  else
  {
    $('#btn-rename-folder').classList.toggle('w3-hide', true);
    
    selectedFile.splice(0, 1);
    
    doubleClick = false;
    let folderId = Number(el.getAttribute('data'))
    openFolder(folderId);
    el.classList.toggle('w3-light-blue', false);
    el.classList.toggle('w3-hover-light-blue', false);
    
  }
}

function openFileConfirm(el) {
  if (selectedFile.length < 1)
    selectedFile.push(el);
  
  $('#btn-rename-folder').classList.toggle('w3-hide', true);
  
  if (lastClickEl !== undefined && lastClickEl != el)
  {
    selectedFile.splice(0, 1);
    selectedFile.push(el);
    
    lastClickEl.classList.toggle('w3-light-blue',false)
    lastClickEl.classList.toggle('w3-hover-light-blue',false)
    doubleClick = false;
  }
  
  if (!doubleClick)
  {
    lastClickEl = el;
    doubleClick = true;
    el.classList.toggle('w3-light-blue',true)
    el.classList.toggle('w3-hover-light-blue',true)
    setTimeout(function(){
      doubleClick = false;
    },500)
  }
  else
  {
    selectedFile.splice(0, 1);
    doubleClick = false;
    openFile(el.getAttribute('data'));
    el.classList.toggle('w3-light-blue',false)
    el.classList.toggle('w3-hover-light-blue',false)
  }
}

var fileTab = [];
var activeTab = 0;

function focusTab(fid) {
  for (let tab of $('.file-tab'))
    tab.lastElementChild.style.background = '#202020';
  
  let idx = odin.idxOf(String(fid), fileTab, 'fid');
  $('.file-tab')[idx].lastElementChild.style.background = '#154358';
  
  fileTab[activeTab].scrollTop = $('#editor').env.editor.getSession().getScrollTop();
  fileTab[activeTab].content = $('#editor').env.editor.getSession().getValue();
  fileTab[activeTab].fiber = $('.icon-rename')[activeTab].textContent;
  
  openFile(fid);
}


function openFile(fid) {
  var f = odin.dataOf(fid, fs.data.files, 'fid');
  // if (activeFile === f && activeFile.loaded)
  // {
  //   $('#btn-menu-project').click();
  //   return;
  // }
  
  activeFile = f;
  
  Promise.all([
    
    (function() {
      
      return new Promise(function(resolve, reject) {
        
        if (f.loaded)
          resolve()
        else
        {
          aww.pop('Downloading file...');
          
          fetch('https://www.googleapis.com/drive/v3/files/'+f.id+'?alt=media', {
            method:'GET',
            headers: {
              'Authorization':'Bearer '+oblog.auth.data.token
            }
          }).then(function(r) {
            
            if (r.ok)
              return r.text();
            else
              throw r;
            
          }).then(function(media) {
            
            f.content = media;
            f.loaded = true;
            fs.save();
            resolve();
            
          }).catch(reject)
        }
        
      });
      
    })()
    
  ]).then(function() {
    
    // if (fileTab.includes(fid))
    if (fileTab.length === 0 && $('#editor').env.editor.getValue().trim().length === 0 || activeTab === -2)
      $('#file-title').removeChild($('.file-tab')[0]);
    else if (activeTab >= 0)
    {
      fileTab[activeTab].scrollTop = $('#editor').env.editor.getSession().getScrollTop();
      fileTab[activeTab].content = $('#editor').env.editor.getSession().getValue();
      fileTab[activeTab].fiber = $('.icon-rename')[activeTab].textContent;
    }
    
    for (let e of $('.file-tab'))
      e.lastElementChild.style.background = '#202020';
      
    let tabIdx = odin.idxOf(fid, fileTab, 'fid');
    if (tabIdx >= 0)
    {
      activeTab = tabIdx;
      $('.file-tab')[activeTab].lastElementChild.style.background = '#154358';
    }
    else
    {
      let el = o.cel('div', {
        innerHTML: o.creps('tmp-file-tab', {
          fid: f.fid,
          name: f.name
        })
      })
      
      el.firstElementChild.lastElementChild.style.background = '#154358';
      $('#file-title').appendChild(el.firstElementChild)
      // {
      fileTab.push({
        fid,
        scrollTop: 0,
        content: f.content,
        fiber: 'close'
      });
      activeTab = fileTab.length-1;
      // }
      
      let offset = $('#file-title-wrapper').offsetWidth-50;
      let width = $('.file-tab').length * 180;
      
      if (offset < width)
      {
        if (offset/$('.file-tab').length >= 100)
        {
          for (let tab of $('.file-tab'))
          {
            tab.style.maxWidth = offset/$('.file-tab').length + 'px';
          }
        }
        else
        {
          for (let tab of $('.file-tab'))
            tab.style.maxWidth = (width-50)/3+'px';
            
          $('#file-title-wrapper').style.overflowX = 'scroll';
          $('#file-title').style.width = (width+50)+'px';
        }
      }
    }
    
    $('.file-name')[activeTab].textContent = f.name;
    
    $('#editor').env.editor.setValue(fileTab[activeTab].content);
    $('#editor').env.editor.clearSelection();
    // $('#editor').env.editor.focus()
    // $('#editor').env.editor.gotoLine(0,0);
    
    $('#editor').env.editor.session.setMode("ace/mode/html");
    
    $('#menu-basic').classList.toggle('w3-hide', false);
    $('#menu-blogger').classList.toggle('w3-hide', true);
    
    if (f.name.endsWith('.blogger'))
    {
      $('#menu-basic').classList.toggle('w3-hide')
      $('#menu-blogger').classList.toggle('w3-hide')
    }
    else if (f.name.endsWith('.css'))
      $('#editor').env.editor.session.setMode("ace/mode/css");
    else if (f.name.endsWith('.js'))
      $('#editor').env.editor.session.setMode("ace/mode/javascript");
    else if (f.name.endsWith('.json'))
      $('#editor').env.editor.session.setMode("ace/mode/json");
    else if (f.name.endsWith('.php'))
      $('#editor').env.editor.session.setMode("ace/mode/php");
      
    
    if ($('#btn-menu-project').classList.contains('active'))
      $('#btn-menu-project').click();
    
    $('#btn-info').classList.toggle('w3-hide', false)
    $('#btn-assets').classList.toggle('w3-hide', false)
    
    $('#editor').env.editor.getSession().setUndoManager(new ace.UndoManager())
    $('#editor').addEventListener('keydown', saveListener);
    
    $('.icon-rename')[activeTab].textContent = fileTab[activeTab].fiber;
    $('#editor').env.editor.getSession().setScrollTop(fileTab[activeTab].scrollTop);
    
    
    $('#sel-revisions').innerHTML = '';
    for (let rev of f.revisions)
    {
      $('#sel-revisions').appendChild( o.cel('option', {
        innerHTML: rev.name,
        value: rev.id
      }) )
    }
    
    let x = patob(activeFile.description);
    if (f.name.endsWith('.blogger'))
    {
    	$('#in-blog-title').value = x.blogTitle || '';
    	$('#in-blog-id').value = x.blogId || '';
    	$('#in-max-posts').value = x.maxPosts || 20;
    	
    	init(x);
    }
    else
    {
    	$('#in-blog-name').value = x.blog || '';
    	$('#in-eid').value = x.eid || '';
    	$('#in-summary').value = x.summary || '';
    	$('#in-summary').value = $('#in-summary').value.substring(1, $('#in-summary').value.length-1);
    	$('#chk-more-tag').checked = x.more || false;
    	$('#chk-bibibi').checked = x.bibibi || false;
    	$('#chk-in-pre').checked = x.pre || false;
    }
  	
  }).catch(function(error) {
    
    L(error);
    aww.pop('Could not download file');
    
  })
  
}


function fileClose(fid) {
  let idx = odin.idxOf(String(fid), fileTab, 'fid');
  
  if ($('.icon-rename')[idx].textContent !== 'close')
  {
    if (!window.confirm('Changes you made may not be saved'))
      return
  }
  
  if (fileTab.length > 1)
  {
    $('#file-title').removeChild($('.file-tab')[idx]);
    fileTab.splice(idx, 1);
    
    let offset = $('#file-title-wrapper').offsetWidth-50;
    let width = $('.file-tab').length * 180;
    
    if (offset < width)
    {
      if (offset/$('.file-tab').length >= 100)
      {
        for (let tab of $('.file-tab'))
        {
          tab.style.maxWidth = offset/$('.file-tab').length + 'px';
        }
        
        $('#file-title-wrapper').style.overflowX = 'auto';
        $('#file-title').style.width = $('#file-title-wrapper').offsetWidth+'px';
      }
      else
      {
        for (let tab of $('.file-tab'))
          tab.style.maxWidth = (width-50)/3+'px';
          
        $('#file-title-wrapper').style.overflowX = 'scroll';
        $('#file-title').style.width = (width+50)+'px';
      }
    }
    else
    {
      for (let tab of $('.file-tab'))
        tab.style.maxWidth = '';
    }
    
    
    activeTab = -1;
    if (idx === 0)
      openFile(fileTab[0].fid);
    else
      openFile(fileTab[idx-1].fid);
  }
  else
  {
    fileTab.splice(0, 1);
    activeTab = 0;
    activeFile = undefined;
    $('.icon-rename')[activeTab].textContent = 'fiber_manual_record';
    $('#in-info').classList.toggle('active', false);
    $('#btn-info').classList.toggle('w3-hide', true)
      
    $('#btn-assets').classList.toggle('w3-hide', true)
    $('#editor').env.editor.setValue('');
    $('.file-name')[0].textContent = 'Untitled File';
    
    $('#editor').env.editor.getSession().setUndoManager(new ace.UndoManager());
    // $('#editor').env.editor.focus();
    $('#editor').env.editor.session.setMode("ace/mode/html");
    
    $('#in-blog-name').value = '';
  	$('#in-eid').value = '';
  	$('#in-summary').value = '';
  	$('#chk-more-tag').checked = false;
  	$('#chk-bibibi').checked = false;
  	$('#chk-in-pre').checked = false;
  	
  	$('.icon-rename')[activeTab].classList.toggle('w3-hide', false);
  }
}

function fileSave() {
  
  let modifiedTime = new Date().toISOString();
  if (activeFile === undefined)
    ui.fm.newFile();
  else
  {
    activeFile.content = $('#editor').env.editor.getValue();
    activeFile.modifiedTime = modifiedTime;
    
    if (activeFile.name.endsWith('.blogger'))
      activeFile.description = patobr('blog-description');
    else
      activeFile.description = patobr('description');
    
    if (iframeRender.includes(activeFile.name))
    {
      var idx = iframeRender.indexOf(activeFile.name);
      $('#loader'+idx).contentWindow.postMessage({
        method: 'put',
        src: activeFile.name,
        content: activeFile.content
      }, '*');
    }
    
    handleSync({
      fid: activeFile.fid,
      action: 'update',
      metadata: ['media', 'description'],
      type: 'files'
    })
    drive.syncToDrive();
    
    fs.save();
    
    $('.icon-rename')[activeTab].textContent = 'close';
    $('#editor').addEventListener('keydown', saveListener);
  }
}

function patobr(cls) {
  
  let data = [];
  let els = $('.'+cls);
  
  for (let e of els)
  {
    let key = e.getAttribute('name');
    
    if (e.type === 'text')
      data.push(key+': '+e.value);
    else if (e.type === 'textarea')
      data.push(key+': "'+e.value+'"');
    else if (e.type === 'checkbox')
      data.push(key+': '+e.checked);
  }
  
  return data.join('\n');
  
}

function patob(txt) {

  let obj = {};
  txt = txt.split('\n');
  
	for (var i=0; i<txt.length; i++)
	{
	  let t = txt[i];
	  t = t.trim();
	  if (t.length === 0)
    {
      txt.splice(i, 1);
      i -= 1;
      continue;
    }
    
    let key = t.split(': ')[0];
    let val = t.split(key+': ')[1];
    
    if (val === "false")
      val = false;
    else if (val === "true")
      val = true;
      
    obj[key] = val;
	}

  return obj;
}
	
	

function chooseDeploy() {
  let data;
  let blogName;
  let eid;
  let isPre = $('#chk-in-pre').checked;
  let isMore = $('#chk-more-tag').checked;
  let isBibibi = $('#chk-bibibi').checked;
  let summary = $('#in-summary').value.trim();
  
  if (locked >= 0)
  {
    data = odin.dataOf(locked, fs.data.files, 'fid');
    
    let ob = patob(data.description);
    
    blogName = ob.blog;
    eid = ob.eid;
    isPre = ob.pre;
    isMore = ob.more;
    isBibibi = ob.bibibi;
    summary = ob.summary.trim();
    summary = summary.substring(1, summary.length-1)
    
    if (summary === '""')
      summary = "";
  }
  else
  {
    data = activeFile;
    blogName = $('#in-blog-name').value;
    eid = $('#in-eid').value;
  }
  
  
  if (blogName && eid)
  {
    aww.pop('Deploying update...');
    
    let more = '';
    let bibibib = '';
    
    if (isMore)
      more = '<!--more--> ';
    if (isBibibi)
      bibibib = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      
    let nowUpload;
    if (isPre)
      nowUpload = summary+more+bibibib+'<pre>'+uploadBody+'</pre>';
    else
      nowUpload = summary+more+bibibib+uploadBody;
    
    L(nowUpload);
    
    oblog.config({ blog: blogName });
    oblog.posts.patch(eid, {
      
      content: nowUpload
    }, function() {
      
      aww.pop('Update Deployed!')
    })
  }
  else
    alert('Deploy failed. Blog name or entry ID has not been set.');
}


function openFolder(folderId) {
  activeFolder = folderId;
  
  let folder = odin.dataOf(folderId, fs.data.folders, 'fid');
  title = folder.name;
  breadcrumbs.push({folderId:activeFolder, title: title})
  
  fileList();
}

function getAllBranch(fid) {
  let files = [];
  let folders = odin.filterData(fid, fs.data.folders, 'fid')
  
  let data = getBranch(folders);
  
  for (let f of data.files)
    files.push(f)
  for (let f of data.folders)
    folders.push(f)
    
  let fileIds = [];
  let folderIds = [];
  for (let f of files)
    fileIds.push(f.fid)
  for (let f of folders)
    folderIds.push(f.fid)
    
  return {fileIds: fileIds, folderIds: folderIds}
}

function getBranch(parents) {
  let files = []
  let folders = []
  
  for (let p of parents)
  {
    let f = odin.filterData(p.fid, fs.data.files, 'parentId');
    let f2 = odin.filterData(p.fid, fs.data.folders, 'parentId');
    
    for (let i of f)
      files.push(i)
    for (let i of f2)
      folders.push(i)
      
    let data = getBranch(f2);
    
    for (let i of data.files)
      files.push(i)
    for (let i of data.folders)
      folders.push(i)
  }
  
  return {files: files, folders: folders};
}

function fileDownload(data) {
  
  let chunks;
  if (data)
  {
    chunks = data;
    name = window.prompt('Export file name', 'export-'+new Date().toLocaleDateString().replace(/\//g,'-')+'.bthor');
  }
  else
  {
    name = activeFile ? activeFile.name : window.prompt('File name :', $('.file-name')[activeTab].textContent);
    chunks = $('#editor').env.editor.getValue();
    
    if (window.confirm('Plate-HTML > HTML?'))
      chunks = plate.cook(chunks);
  }
  
  if (name === 'null')
    return;
  
  let blob = new Blob([chunks], {type: 'application/octet-stream'});
  let url = URL.createObjectURL(blob);
  let a = o.cel('a', {
    href: url,
    download: name
  })
  $('#limbo-element').appendChild(a);
  a.click();
  $('#limbo-element').removeChild(a);
  // $('#editor').env.editor.focus()
}

function exportData() {
  
  fileDownload(JSON.stringify(fs.data));
}

function importData(self) {
  
  r = new FileReader();
  r.onload = function() {
    fs.data = JSON.parse(this.result)
    aww.pop('Data imported successfully');
    fileList();
    self.value = null;
  }
  
  r.readAsText(self.files[0]);
}

// copy, move, cut, paste
function copyFile(cut) {
  for (var f of selectedFile)
  {
    if (clipBoard.indexOf(f) < 0)
      clipBoard.push(f);
  }
  
  copyParentFolderId = activeFolder;
  
  if (cut)
    pasteFile.mode = 'cut';
  else
    pasteFile.mode = 'copy';
}

function pasteFile() {
  
  if (clipBoard.length === 0) return;
  
  while (clipBoard.length > 0)
  {
    let data;
    let fid = clipBoard[0].getAttribute('data');
    let type = clipBoard[0].getAttribute('data-type');
    let modifiedTime = new Date().toISOString();
    
    if (type === 'file')
    {
      data = odin.dataOf(fid, fs.data.files, 'fid');
      
      if (pasteFile.mode === 'copy')
        copySingleFile(data, modifiedTime);
      else
      {
        if (data.parentId !== activeFolder)
          fileMove(data, 'files');
      }
    }
    else
    {
      if (pasteFile.mode === 'copy')
      {
        let branch = getAllBranch(fid);
     
        let road = copyBranchFolder(branch.folderIds, modifiedTime);
        copyBranchFile(branch.fileIds, road, modifiedTime);
      }
      else
      {
        data = odin.dataOf(fid, fs.data.folders, 'fid');
        if (data.parentId !== activeFolder)
          fileMove(data, 'folders');
      }
    }
    
    clipBoard.splice(0, 1);
    selectedFile.splice(0, 1);
  }
  
  drive.syncToDrive();
  fs.save();
  fileList();
  
  copyParentFolderId = -2;
}
pasteFile.mode = 'copy';

function copySingleFile({ id, fid, name, content, loaded }, modifiedTime) {
  
  fm.INSERT.file({
    id,
    name: (copyParentFolderId == activeFolder) ? name + ' (copy)' : name,
    modifiedTime,
    content,
    loaded,
    parentId: activeFolder,
  });
  
  handleSync({
    fid: fs.data.counter.files-1,
    action: (loaded) ? 'create' : 'copy',
    type: 'files'
  })
}

function copyBranchFile(fileIds, road, modifiedTime) {
  
  if (fileIds.length === 0) return;
  
  ({ id, fid, name, parentId, content, loaded, trashed } = odin.dataOf(fileIds[0], fs.data.files, 'fid'));
  
  if (!trashed)
  {
    let idx = odin.idxOf(parentId, road, 0);
    
    fm.INSERT.file({
      id,
      name,
      modifiedTime,
      trashed,
      content,
      loaded,
      parentId: road[idx][1],
    });
    
    handleSync({
      fid: fs.data.counter.files-1,
      action: (loaded) ? 'create' : 'copy',
      type: 'files'
    })
    
  }
  
  fileIds.splice(0, 1);
  copyBranchFile(fileIds, road, modifiedTime);
}


function copyBranchFolder(folderIds, modifiedTime, road = []) {
  
  if (folderIds.length === 0) return road;
  
  let folderId = folderIds[0];
  
  ({ name, modifiedTime, parentId, trashed } = odin.dataOf(folderId, fs.data.folders, 'fid'));
  
  if (!trashed)
  {
    road.push([folderId, fs.data.counter.folders]);
    
    let idx = odin.idxOf(parentId, road, 0);
    
    if (copyParentFolderId == activeFolder)
    {
      name = name + ' (copy)';
      copyParentFolderId = -2;
    }
    
    fm.INSERT.folder({
      name,
      modifiedTime,
      parentId: (idx < 0) ? activeFolder : road[idx][1],
    });
    
    handleSync({
      action: 'create',
      fid: fs.data.counter.folders-1,
      type: 'folders'
    })
  }
  
  folderIds.splice(0, 1);

  return copyBranchFolder(folderIds, modifiedTime, road);
  
}

function fileMove(data, fileType) {
  
  handleSync({
    fid: data.fid,
    action: 'update',
    metadata: ['parents'],
    type: fileType,
    source: data.parentId
  });
  
  data.parentId = activeFolder;
}

function getAvailParents() {
  let folds = ['"'+fs.data.rootId+'"'];
  
  fs.data.folders.map((folder) => {
    if (folder.id !== '')
      folds.push('"'+folder.id+'"');
  });
  
  return folds;
}

function trashList() {
  
  var el;
  $('#list-trash').innerHTML = '';
  
  let folders = odin.filterData(true, fs.data.folders, 'trashed');
  
  folders.sort(function(a, b) {
    return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
  });

  for (let f of folders)
  {
    el = o.cel('div',{innerHTML:o.creps('tmp-list-folder-trash', f)});
    $('#list-trash').appendChild(el);
  }
  
  $('#list-trash').appendChild(o.cel('div', { class: 'w3-row w3-padding-small' }));
  
  let files = odin.filterData(true, fs.data.files, 'trashed');
  
  files.sort(function(a, b) {
    return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
  });
  
  for (let {fid, name, trashed} of files)
  {
    let clsLock = '';
    let defaultBg = '#777';
    
    if (name.includes('.blogger'))
      defaultBg = '#ffa51e';
    else if (name.includes('.js'))
      defaultBg = '#a81eff';
    else if (name.includes('.php'))
      defaultBg = 'orange';
    else if (name.includes('.tmp'))
      defaultBg = '#4aad4d';
    else if (name.includes('.lib'))
      defaultBg = 'burlywood';
      
    if (fid === locked)
      clsLock = 'w3-text-purple';
    
    el = o.cel('div',{ innerHTML: o.creps('tmp-list-file-trash', {
      fid,
      name,
      defaultBg,
      clsLock
    }) });
    
    $('#list-trash').appendChild(el);
  }
  
}