let snippets = [
  {pos: [-3, 1], title: 'HTML', snippet: '<!DOCTYPE html>\n<html>\n<head>\n\n<\/head>\n<body>\n\t\n\t\n\t\n<\/body>\n<\/html>'},
  {pos: [-1, 1], title: 'style', snippet: '<style>\n\t\n<\/style>'},
  {pos: [-1, 1], title: 'inline script', snippet: '<script>\n\t\n<\/script>'},
  {pos: [-2, 14], title: 'template', snippet: '<template id="">\n\t\n<\/template>'},
  {pos: [0, 19], title: 'in template', snippet: '<template include=""><\/template>'},
  {pos: [0, 13], title: 'external script', snippet: '<script src=""><\/script>'},
  {pos: [0, 12], title: 'link', snippet: '<link href="" rel="stylesheet"/>'},
  {pos: [1, 0], title: 'meta viewport', snippet: '<meta name="viewport" content="width=device-width"/>\n'},
  {pos: [1, 0], title: 'charset', snippet: '<meta charset="utf-8"/>\n'},
  {pos: [-1, 1], title: 'snippet template', snippet: '<template data-prefix="snippet-name" data-trim="true" data-cursor="1,0">\n\t\n<\/template>'},
  {title: 'reload snippet', callback: loadSnippets},
];
let customSnippetsCounter = 0;

function downloadSnippetFile(fid) {
  return new Promise(function(resolve, reject) {
    let f = odin.dataOf(fid, fs.data.files, 'fid');
    if (!f)
      resolve();
      
    if (f.loaded) {
      resolve(f);
    } else {
      
      new Promise(function(resolveTokenRequest) {
        if (auth0.state(5))
          return resolveTokenRequest();
        else {
          auth0.requestToken(function() {
            return resolveTokenRequest();
          }, true);
        }
      }).then(function() {
        fetch('https://www.googleapis.com/drive/v3/files/' + f.id + '?alt=media', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + auth0.auth.data.token
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
          resolve(f);
        }).catch(reject);
      });
    }
  });
}

function applySnippets(html) {
  let child = html.children;
  for (let el of child) {
    if (!['TEMPLATE','SCRIPT'].includes(el.nodeName)) continue;
    if (!el.dataset.prefix) continue;
    
    let snippet = el.innerHTML;
    let cursor = el.dataset.cursor ? [parseInt(el.dataset.cursor.split(',')[0]), parseInt(el.dataset.cursor.split(',')[1])] : [1,0];
    let isTrim = el.dataset.trim ? el.dataset.trim == 'false' ? false : true : true;
    if (isTrim)
      snippet = snippet.trim();
    snippets.push({pos: cursor, title: el.dataset.prefix, snippet});
    customSnippetsCounter++;
  }
  document.body.removeChild(html);
  
  for (let i=0; i<snippets.length; i++)
    snippets[i].index = i;
}

function loadEnvironmentSettings(file) {
  
  new Promise((resolve, reject) => {
    if (file.loaded) {
      resolve(file);
    } else {
      
      new Promise(function(resolveTokenRequest) {
        if (auth0.state(5))
          return resolveTokenRequest();
        else {
          auth0.requestToken(function() {
            return resolveTokenRequest();
          }, true);
        }
      }).then(function() {
        fetch('https://www.googleapis.com/drive/v3/files/'+file.id+'?alt=media', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + auth0.auth.data.token
          }
        }).then(function(r) {
          
          if (r.ok)
            return r.text();
          else
            throw r;
        }).then(function(media) {
          file.content = media;
          file.loaded = true;
          fs.save();
          resolve(file);
        }).catch(reject);
      });
    }
    
  }).then(file => {
    let setup = JSON.parse(file.content);
    let files = setup.snippets;
    for (let path of files) {
      let f = getFileAtPath(path);
      if (typeof(f) == 'undefined' || f.trashed)
        L('Environemnt error : snippet '+path+' not found');
      else
        downloadSnippetFile(f.fid)
        .then(f => {
          let html = o.cel('div');
          html.style.display = 'none';
          document.body.append(html);
          html.innerHTML += f.content;
          applySnippets(html);
        });
    }
  });
}

function loadSnippets() {
  
  snippets.length -= customSnippetsCounter;
  customSnippetsCounter = 0;
  
  for (let i=0; i<fs.data.files.length; i++) {
    if (fs.data.files[i].parentId == -1 && fs.data.files[i].name == 'env.json' && !fs.data.files[i].trashed) {
      loadEnvironmentSettings(fs.data.files[i]);
      break;
    }
  }
  
  for (let i=0; i<snippets.length; i++)
    snippets[i].index = i;
}

var wgSearchRes;
var wgSearch = {
  hints: [],
  pageId: '',
  keywords: [],
  match: function(value) {
    if (value.trim().length < 2) return [];
  
    var data = [];
    var extraMatch = [];
    value = value.replace(/-|,|'/g,'');
    for (var i=0,title,matchIdx,match=1,xmatch=1,wildChar,offset,creps; i<snippets.length; i++)
    {
      if (match > 10) break;
      titleOri = snippets[i].title;
      title = titleOri.replace(/-|,|'/g,'');
      matchIdx = title.toLowerCase().indexOf(value.toLowerCase());
      if (matchIdx >= 0)
      {
        offset = 0;
        wildChar = titleOri.substr(matchIdx,value.length).match(/-|,|'/g);
        if (wildChar !== null)
          offset = wildChar.length;
        title = '<b>'+titleOri.substr(0,matchIdx)+'</b>'+titleOri.substr(matchIdx,value.length+offset)+'<b>'+titleOri.substr(matchIdx+value.length+offset)+'</b>';
        
        if (matchIdx === 0)
        {
            data.push({index:snippets[i].index,ori:titleOri.replace(/'/g,'!!!'),title:title});
            match++;
        }
        else
        {
            extraMatch.push({index:snippets[i].index,ori:titleOri.replace(/'/g,'!!!'),title:title});
            xmatch++;
        }
      }
    }
    if (match < 10)
    {
      for (var i=0; i<xmatch-1 && match<10; i++)
      {
        data.push(extraMatch[i]);
        match++;
      }
    }
    return data;
  },
  selectHints: function(idx,event) {
    var hints = $('.search-hints');
    if (idx !== null)
    {
      for (var i=0; i<hints.length; i++)
      {
        if (i == idx)
          hints[i].classList.toggle('selected',true);
        else
          hints[i].classList.toggle('selected',false);
      }
      this.find.idx = idx;
    }
    else
    {
      switch(event.keyCode) {
        case 13:
          
          if (this.find.idx > -1) {
            event.preventDefault();
            hints[this.find.idx].click();
          } else {
            handleCommand();
          }
        break;
        case 38:
          event.preventDefault();
          this.find.idx--;
          if (this.find.idx == -2)
          {
            this.find.idx = hints.length-1;
            hints[this.find.idx].classList.toggle('selected');
          }
          else
          {
            hints[this.find.idx+1].classList.toggle('selected');
            if (this.find.idx > -1 && this.find.idx < hints.length)
            hints[this.find.idx].classList.toggle('selected');
          }
          return;
        break;
        case 40:
          this.find.idx++;
          if (this.find.idx == hints.length)
          {
            this.find.idx = -1;
            hints[hints.length-1].classList.toggle('selected');
          }
          else
          {
            hints[this.find.idx].classList.toggle('selected');
            if (this.find.idx > 0 && this.find.idx < hints.length)
            hints[this.find.idx-1].classList.toggle('selected');
          }
          return;
        break;
        case 37:
        case 39:
          return;
      }
    }
  },
  displayResult: function(data) {
    this.find.idx = -1;
    
    for (var i=0,d,html=''; i<data.length; i++)
    {
      d = Object.assign({},data[i]);

      if (i == data.length-1)
        html += o.creps('tmp-hints-last',d);
      else
        html += o.creps('tmp-hints',d);
    }
    
    $('#search-result').innerHTML = html;
  },
  find: function(v) {
    clearTimeout(this.wait);
    this.v = v;
    
    if (this.v.trim().length < 2)
    {
      if (this.v.trim().length == 0)
      {
        somefun($('#btn-somefun'),true)
      }
        
      $('#search-result').innerHTML = '';
      return;
    }
    
    if ($('#btn-somefun').textContent == 'search')
      somefun($('#btn-somefun'))
    
    var data = wgSearch.match(this.v);
    
    if (this.keywords.indexOf(v) < 0)
    {
      this.displayResult(data);
      this.keywords.push(v)
    }
    else if (data.length >= 0)
      this.displayResult(data);
    
  }
};

function somefun(self, bypass) {
  if (self.textContent == 'search' && $('#search-input').value.length > 0)
  {
    self.textContent = 'close';
    self.style.color = '#d48989';
  }
  else if (self.textContent == 'close' || bypass)
  {
    self.textContent = 'search';
    self.style.color = '#000';
    $('#search-input').value = '';
    $('#search-result').innerHTML = '';
  }
}

function insertTemplate(index) {
  let data = odin.dataOf(index, snippets, 'index');
  if (data.callback) {
    data.callback();
  } else {
    let curCol = $('#editor').env.editor.getCursorPosition().column
    $('#editor').env.editor.insert(data.snippet);
    $('#editor').env.editor.moveCursorToPosition({row:$('#editor').env.editor.getCursorPosition().row+data.pos[0], column: curCol+data.pos[1]});
    $('#editor').env.editor.focus();
  }
  $('#search-result').innerHTML = '';
  toggleInsertSnippet();
}