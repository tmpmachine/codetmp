let compoSnippet = (function() {
  
  let $ = document.querySelector.bind(document);
  let $$ = document.querySelectorAll.bind(document);

  let SELF = {
    InitAsync,
    match,
    selectHints,
    highlightHints,
    displayResult,
    find,
    appendIDESnippet,
    AddCommand,
  };
  
  let findIdx;
  let keywords = [];
  let index = 0;
  let snippetManager;
  let snippets = [
    {title: 'HTML', snippet: '<!DOCTYPE html>\n<html>\n<head>\n\n<\/head>\n<body>\n\t\n\t${1}\n\t\n<\/body>\n<\/html>'},
    {title: 'style', snippet: '<style>\n\t${1}\n<\/style>'},
    {title: 'inline script', snippet: '<script>\n\t${1}\n<\/script>'},
    {title: 'template', snippet: '<template id="${2}">\n\t${1}\n<\/template>'},
    {title: 'include file', snippet: '<file src="${1}"><\/file>'},
    {title: 'external script', snippet: '<script src="${1}"><\/script>'},
    {title: 'link', snippet: '<link href="${1}" rel="stylesheet"/>'},
    {title: 'meta viewport', snippet: '<meta name="viewport" content="width=device-width"/>\n'},
    {title: 'charset', snippet: '<meta charset="utf-8"/>\n'},
    {title: 'querySelector()', snippet: "let $ = document.querySelector.bind(document);"},
    {title: 'querySelectorAll()', snippet: "let $$ = document.querySelectorAll.bind(document);"},
  ];

  function AddCommand(snippetObj) {
    snippets.push(snippetObj);
  }

  function match(value) {
    findIdx = -1;

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
            match++;
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
          match++;
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
  }

  function selectHints() {
    let hints = $$('.search-hints');

    if (hints.length === 0) return;

    switch(event.keyCode) {
      case 13:
        if (findIdx > -1) {
          event.preventDefault();
          hints[findIdx].click();
        }
      break;
      case 38:
        event.preventDefault();
        findIdx--;
        if (findIdx == -2) {
          findIdx = hints.length-1;
          hints[findIdx].classList.toggle('selected');
        } else {
          hints[findIdx+1].classList.toggle('selected');
          if (findIdx > -1 && findIdx < hints.length)
            hints[findIdx].classList.toggle('selected');
        }
        return;
      break;
      case 40:
        findIdx++;
        if (findIdx == hints.length) {
          findIdx = -1;
          hints[hints.length-1].classList.toggle('selected');
        } else {
          hints[findIdx].classList.toggle('selected');
          if (findIdx > 0 && findIdx < hints.length)
            hints[findIdx-1].classList.toggle('selected');
        }
        return;
      break;
    }
  }

  function highlightHints() {
    let idx = Number(this.dataset.searchIndex);
    let hints = $$('.search-hints');
    for (var i=0; i<hints.length; i++) {
      if (i == idx)
        hints[i].classList.toggle('selected',true);
      else
        hints[i].classList.toggle('selected',false);
    }
    findIdx = idx;
  }

  function displayResult(data) {
    $('#search-result').innerHTML = '';
    let i = 0;

    for (let hint of data) {
      if (index == data.length-1) {
        let tmp = $('#tmp-hints-last').content.cloneNode(true);
        tmp.querySelector('.Title').innerHTML = hint.title;
        tmp.querySelector('.Container').addEventListener('mouseover', highlightHints);
        tmp.querySelector('.Container').addEventListener('click', insertTemplate);
        tmp.querySelector('.Container').dataset.index = hint.index;
        tmp.querySelector('.Container').dataset.searchIndex = i;
        $('#search-result').appendChild(tmp);
      } else {
        let tmp = $('#tmp-hints').content.cloneNode(true);
        tmp.querySelector('.Title').innerHTML = hint.title;
        tmp.querySelector('.Container').addEventListener('mouseover', highlightHints);
        tmp.querySelector('.Container').addEventListener('click', insertTemplate);
        tmp.querySelector('.Container').dataset.index = hint.index;
        tmp.querySelector('.Container').dataset.searchIndex = i;
        $('#search-result').appendChild(tmp);
      }
      i++;
    }
  }

  function find(v) {
      clearTimeout(this.wait);
      this.v = v;
      
      if (this.v.trim().length < 2) {
        if (this.v.trim().length == 0) {
          resetSearch($('#btn-search'),true)
        }
          
        $('#search-result').innerHTML = '';
        return;
      }
      
      if ($('#btn-search').textContent == 'search') {
        resetSearch($('#btn-search'))
      }
      
      var data = match(this.v.toLowerCase());
      
      if (keywords.indexOf(v) < 0) {
        displayResult(data);
        keywords.push(v)
      } else if (data.length >= 0) {
        displayResult(data);
      }
      
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
          matchIndexes.push(j-1);
          continue outer;
        }
      }
      return {isMatch: false};
    }
    return {isMatch: true, matchIndexes};
  }

  
  function appendIDESnippet(snippet) {
    // snippets.push(snippet);
  
    snippet.index = index;
    if (snippet.snippet) {
      snippet.snippet = snippet.snippet.replace(/\t/g, '  ');
    }
    index++;
  }
  
  function resetSearch(self, bypass) {
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

  function waitUntil(stateCheckCallback, delay = 100) {
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

  async function InitAsync() {

    // initial setup
    {
      for (let snippet of snippets) {
        appendIDESnippet(snippet)
      }
    }

    await waitUntil(() => {
      return typeof(ace.require('ace/snippets').snippetManager == 'object')
    }, 200)
    snippetManager = ace.require('ace/snippets').snippetManager;
 
    // add temporary snippet
    {
      let snippetText = "snippet asd\n\tconsole.log($1)";
      let snippets = snippetManager.parseSnippetFile(snippetText);
      snippetManager.register(snippets,'javascript');
    }
  }

  function insertTemplate() {
    let index = this.dataset.index;
    let data = snippets[index];

    $('#search-result').innerHTML = '';
    ui.toggleInsertSnippet();

    if (data.callback) {
      data.callback(data);
    } else {
      let editor = fileTab[activeTab].editor.env.editor;
      snippetManager.insertSnippet(editor, data.snippet);
      window.setTimeout(() => {
        editor.focus();
      }, 10);
    }
  } 

  return SELF;
  
})();