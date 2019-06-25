var editorTemplate = [
  {id: 0, pos: [-3, 1], title: 'HTML', snippet: '<!DOCTYPE html>\n<html>\n<head>\n\n<\/head>\n<body>\n\t\n\t\n\t\n<\/body>\n<\/html>'},
  {id: 1, pos: [-1, 1], title: 'style', snippet: '<style>\n\t\n<\/style>'},
  {id: 2, pos: [-1, 1], title: 'script', snippet: '<script>\n\t\n<\/script>'},
  {id: 3, pos: [-2, 14], title: 'template', snippet: '<template id="">\n\t\n<\/template>'},
  {id: 4, pos: [0, 19], title: 'in template', snippet: '<template include=""><\/template>'},
  {id: 5, pos: [0, 17], title: 'in script', snippet: '<script include=""><\/script>'},
  {id: 6, pos: [0, 15], title: 'in link', snippet: '<link include="" rel="stylesheet"/>'},
  {id: 7, pos: [1, 0], title: 'meta viewport', snippet: '<meta name="viewport" content="width=device-width"/>\n'},
  {id: 8, pos: [1, 0], title: 'charset', snippet: '<meta charset="utf-8"/>\n'},
];

var wgSearchRes;
var wgSearch = {
  hints: [],
  pageId: '',
  keywords: [],
  songIdx: function(id) {
    for (var i=0,found=false; i<editorTemplate.length; i++)
    {
      var s = editorTemplate[i];
      if (s.id == id)
      {
          found = true;
          break;
      }
    }
    return found ? i : -1;
  },
  match: function(value) {
    if (value.trim().length < 2) return [];
  
    var data = [];
    var extraMatch = [];
    value = value.replace(/-|,|'/g,'');
    for (var i=0,title,matchIdx,match=1,xmatch=1,wildChar,offset,creps; i<editorTemplate.length; i++)
    {
      if (match > 10) break;
      titleOri = editorTemplate[i].title;
      title = titleOri.replace(/-|,|'/g,'');
      href = editorTemplate[i].href;
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
            data.push({id:editorTemplate[i].id,ori:titleOri.replace(/'/g,'!!!'),title:title,href:href});
            match++;
        }
        else
        {
            extraMatch.push({id:editorTemplate[i].id,ori:titleOri.replace(/'/g,'!!!'),title:title,href:href});
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
          if (this.find.idx > -1)
          {
            event.preventDefault();
            hints[this.find.idx].click();
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
    var local = window.location.origin.indexOf('file') >= 0;
    
    for (var i=0,d,html=''; i<data.length; i++)
    {
      d = Object.assign({},data[i]);
      d.index = i;
      if (local) d.href = '?postID='+d.id;
      
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




function toggleInsertSnippet(persistent) {
  if ($('#in-project').classList.contains('active') || $('#in-settings').classList.contains('active')) return

  let el = $('.search-box')[0];

  if (persistent === undefined)
    el.classList.toggle('w3-hide');
  else
    el.classList.toggle('w3-hide', !persistent);

  if (!el.classList.contains('w3-hide'))
  {
    $('#search-input').value = '';
    $('#search-input').focus();
  }
  else
  {
    $('#search-input').value = '';
  }
}

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

function insertTemplate(id) {
  let data = odin.dataOf(id, editorTemplate, 'id');
  let curCol = $('#editor').env.editor.getCursorPosition().column
  $('#editor').env.editor.insert(data.snippet);
  $('#editor').env.editor.moveCursorToPosition({row:$('#editor').env.editor.getCursorPosition().row+data.pos[0], column: curCol+data.pos[1]});
  $('#editor').env.editor.focus();

  $('#search-result').innerHTML = '';
  toggleInsertSnippet();
}