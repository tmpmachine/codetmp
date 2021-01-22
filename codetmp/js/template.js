let snippets = [
  {pos: [-3, 2], title: 'HTML', snippet: '<!DOCTYPE html>\n<html>\n<head>\n\n<\/head>\n<body>\n\t\n\t\n\t\n<\/body>\n<\/html>'},
  {pos: [-1, 2], title: 'style', snippet: '<style>\n\t\n<\/style>'},
  {pos: [-1, 2], title: 'inline script', snippet: '<script>\n\t\n<\/script>'},
  {pos: [-2, 14], title: 'template', snippet: '<template id="">\n\t\n<\/template>'},
  {pos: [0, 11], title: 'include file', snippet: '<file src=""><\/file>'},
  {pos: [0, 13], title: 'external script', snippet: '<script src=""><\/script>'},
  {pos: [0, 12], title: 'link', snippet: '<link href="" rel="stylesheet"/>'},
  {pos: [1, 0], title: 'meta viewport', snippet: '<meta name="viewport" content="width=device-width"/>\n'},
  {pos: [1, 0], title: 'charset', snippet: '<meta charset="utf-8"/>\n'},
  {pos: [1, 0], title: 'querySelector()', snippet: "<script> $ = function(selector, node=document) { let nodes = node.querySelectorAll(selector); return selector.startsWith('#') ? nodes[0] : nodes } </script>"},
  {pos: [1, 0], title: 'console.log()', snippet: '<script> L = console.log </script>'},
  {title: 'reload snippet', callback: loadSnippets},
];
let customSnippetsCounter = 0;
let index = 0;
for (let snippet of snippets) {
  snippet.index = index;
  if (snippet.snippet)
  	snippet.snippet = snippet.snippet.replace(/\t/g, '  ');
  index++;
}

function downloadSnippetFile(fid) {
  return new Promise(function(resolve, reject) {
    let f = odin.dataOf(fid, fileStorage.data.files, 'fid');
    if (!f)
      resolve();
      
    if (f.loaded) {
      resolve(f);
    } else {
	    drive.downloadDependencies(f).then(media => {
	      f.content = media;
	      f.loaded = true;
	      fileStorage.save();
	      resolve(f);
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
      
      	drive.downloadDependencies(file).then(media => {
	      file.content = media;
	      file.loaded = true;
	      fileStorage.save();
	      resolve(file);
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
  
  for (let i=0; i<fileStorage.data.files.length; i++) {
    if (fileStorage.data.files[i].parentId == -1 && fileStorage.data.files[i].name == 'env.json' && !fileStorage.data.files[i].trashed) {
      loadEnvironmentSettings(fileStorage.data.files[i]);
      break;
    }
  }
  
  for (let i=0; i<snippets.length; i++)
    snippets[i].index = i;
}

// https://github.com/bevacqua/fuzzysearch
function fuzzysearch (needle, haystack) {
  var tlen = haystack.length;
  var qlen = needle.length;
  var matchIndexes = [];
  if (qlen > tlen) {
    return {isMatch: false};
  }
  if (qlen === tlen) {
    return {isMatch: true, matchIndexes};
  }
  var i = 0;
  var j = 0;
  outer: for (; i < qlen; i++) {
    var nch = needle.charCodeAt(i);
    while (j < tlen) {
      if (haystack.charCodeAt(j++) === nch) {
        matchIndexes.push(j-1)
        continue outer;
      }
    }
    return {isMatch: false};
  }
  return {isMatch: true, matchIndexes};
}

var wgSearchRes;
var wgSearch = {
  hints: [],
  pageId: '',
  keywords: [],
  match: function(value) {
    this.find.idx = -1;

    if (value.trim().length < 2) return [];
    var data = [];
    var extraMatch = [];
    for (var i=0,title,matchIdx,match=1,xmatch=1,wildChar,offset,creps; i<snippets.length; i++) {
      if (match > 10) break;
      titleOri = snippets[i].title;
      let search = fuzzysearch(value,titleOri.toLowerCase());
      if (search.isMatch) {
        if (search.matchIndexes.length === 0) {
          if (value == titleOri.toLowerCase()) {
            data.push({index:snippets[i].index,title:'<b>'+titleOri+'</b>'});
            match++  
          } else {
          extraMatch.push({index:snippets[i].index,title:titleOri});
            xmatch++;

          }
        } else {
          titleOri = titleOri.split('');
          for (let index of search.matchIndexes) {
            titleOri[index] = '<b>'+titleOri[index]+'</b>';
          }
          data.push({index:snippets[i].index,title:titleOri.join('')});
          match++
        }
      }
    }
    if (match < 10) {
      for (var i=0; i<xmatch-1 && match<10; i++) {
        data.push(extraMatch[i]);
        match++;
      }
    }
    return data;
  },
  selectHints: function() {
    let hints = $('.search-hints');
    if (hints.length === 0)
        return

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
        if (this.find.idx == -2) {
          this.find.idx = hints.length-1;
          hints[this.find.idx].classList.toggle('selected');
        } else {
          hints[this.find.idx+1].classList.toggle('selected');
          if (this.find.idx > -1 && this.find.idx < hints.length)
            hints[this.find.idx].classList.toggle('selected');
        }
        return;
      break;
      case 40:
        this.find.idx++;
        if (this.find.idx == hints.length) {
          this.find.idx = -1;
          hints[hints.length-1].classList.toggle('selected');
        } else {
          hints[this.find.idx].classList.toggle('selected');
          if (this.find.idx > 0 && this.find.idx < hints.length)
            hints[this.find.idx-1].classList.toggle('selected');
        }
        return;
      break;
    }
  },
  highlightHints: function() {
    let idx = Number(this.dataset.searchIndex);
    var hints = $('.search-hints');
    for (var i=0; i<hints.length; i++) {
      if (i == idx)
        hints[i].classList.toggle('selected',true);
      else
        hints[i].classList.toggle('selected',false);
    }
    wgSearch.find.idx = idx;
  },
  displayResult: function(data) {
    $('#search-result').innerHTML = '';
    let i = 0;
    for (let hint of data) {
      if (index == data.length-1) {
        let tmp = $('#tmp-hints-last').content.cloneNode(true);
        $('.Title', tmp)[0].innerHTML = hint.title;
        $('.Container', tmp)[0].addEventListener('mouseover', wgSearch.highlightHints);
        $('.Container', tmp)[0].addEventListener('click', insertTemplate);
        $('.Container', tmp)[0].dataset.index = hint.index;
        $('.Container', tmp)[0].dataset.searchIndex = i;
        $('#search-result').appendChild(tmp);
      } else {
        let tmp = $('#tmp-hints').content.cloneNode(true);
        $('.Title', tmp)[0].innerHTML = hint.title;
        $('.Container', tmp)[0].addEventListener('mouseover', wgSearch.highlightHints);
        $('.Container', tmp)[0].addEventListener('click', insertTemplate);
        $('.Container', tmp)[0].dataset.index = hint.index;
        $('.Container', tmp)[0].dataset.searchIndex = i;
        $('#search-result').appendChild(tmp);
      }
      i++;
    }
  },
  find: function(v) {
    clearTimeout(this.wait);
    this.v = v;
    
    if (this.v.trim().length < 2) {
      if (this.v.trim().length == 0) {
        somefun($('#btn-somefun'),true)
      }
        
      $('#search-result').innerHTML = '';
      return;
    }
    
    if ($('#btn-somefun').textContent == 'search')
      somefun($('#btn-somefun'))
    
    var data = wgSearch.match(this.v.toLowerCase());
    
    if (this.keywords.indexOf(v) < 0) {
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

function insertTemplate() {
  let index = this.dataset.index;
  let data = snippets[index];
  $('#search-result').innerHTML = '';
  toggleInsertSnippet();
  if (data.callback) {
    data.callback();
  } else {
    let curCol = fileTab[activeTab].editor.env.editor.getCursorPosition().column
    fileTab[activeTab].editor.env.editor.insert(data.snippet);
    fileTab[activeTab].editor.env.editor.moveCursorToPosition({row:fileTab[activeTab].editor.env.editor.getCursorPosition().row+data.pos[0], column: curCol+data.pos[1]});
    fileTab[activeTab].editor.env.editor.focus();
  }
}