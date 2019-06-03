var globalRender;
var locked = -1;
var previewWindow = null;
var previewTwice = false;
var currentPage = '';
var loadingStatus = 0;


window.addEventListener('message', function(e) {
  
  if (e.data.type !== undefined && e.data.type == 'loaded')
  {
    // if (e.data.page !== undefined)
      // currentPage = '?'+e.data.page;
    // else
      // currentPage = '';
    
    if (waitRender !== null)
      loadingStatus = 200;
    else
      renderBlog();
  }
  
}, false);


function getDirectory(source, parentId) {
  while (source.match('//'))
    source = source.replace('//','/');
  
  let dir = source.split('/');
  let currentFolder;
  
  while (dir.length > 1)
  {
    if (dir[0] === '..' || dir[0] === '.'  || dir[0] === '')
    {
      currentFolder = odin.dataOf(parentId, fs.data.folders, 'fid');
      if (currentFolder === undefined)
      {
        acFold = -2;
        break;
      }
      
      dir.splice(0, 1);
      parentId = currentFolder.parentId;
    }
    else
    {
      let folders = odin.filterData(parentId, fs.data.folders, 'parentId');
      
      currentFolder = odin.dataOf(dir[0], folders, 'name');
      if (currentFolder)
      {
        parentId = currentFolder.fid;
        dir.splice(0, 1);
      }
      else
      {
        parentId = -2;
        break;
      }
    }
  }
  
  return parentId;
}


function renderBlog() {
  // checkParam();
  
  let body = replaceLocal();
  
  body = clearComments(body);
  body = closeHTML(body);
  body = repairDataTag(body);
  body = body.replace(/ => /g,' =v ');
  body = body.replace(/ >= /g,' v= ');
  body = removeCloseTag(closeDataTag(body));
  
  var template = body;
  template = plate.cook(template).replace(/\n\n+/g,'\n');
  var cond = template.match(/<.*?cond.*?>|<b:class.*?>|<b:with.*?>/g);
  if (cond !== null)
  {
    for (var i=0; i<cond.length; i++)
    {
      let single = false;
      if (cond[i].indexOf('quot;') > 0)
        single = true;
      
      let newCon = cond[i];
      if (single)
        newCon = cond[i].replace(/"/g,"'").replace(/&quot;/g,'"');

      template = template.replace(cond[i],newCon.replace(' < ',' &lt; '));
    }
  }
  var cond = template.match(/expr.*?=".*?&quot;.*?"/g);
  if (cond !== null)
  {
    for (var i=0; i<cond.length; i++)
      template = template.replace(cond[i],cond[i].replace(/"/g,"'").replace(/&quot;/g,'"'));
  }
  template = template.replace(/ =v /g,' => ');
  template = template.replace(/ v= /g,' >= ');
  renderTemplate = template;
  
  body = body.replace(/<b:skin>(.|\n)*?<\/b:skin>/g,'');
  body = body.replace(/<b:else\/>/g,'<b:else>');

  var W = body.match('<b:section.*?>|<b:widget.*?>|<b:eval.*?>|<b:with.*?>|<b:if.*?>|<b:loop.*?>|<data:.*?>| expr:');
  var w;
  var i = 1000;
  if (core !== undefined)
  {
    while (W !== null)
    {
      var d = Object.assign({},data);
      w = W[0];
      if (w.indexOf(':section') > 0)
        body = blogSection(body);
      else if (w.indexOf(':widget') > 0)
        body = blogWidget(body,d);
      else if (w.indexOf(':if') > 0)
        body = blogConditional(body,d);
      else if (w.indexOf('<data:') >= 0)
        body = blogData(body,d);
      else if (w.indexOf('expr:') > 0)
        body = blogExpr(body,d);
      else if (w.indexOf(':eval') > 0)
        body = blogEval(body,d);
      else if (w.indexOf(':loop') > 0)
        body = blogLoop(body,d);
      else if (w.indexOf(':with') > 0)
        body = blogWith(body,d);
      i--;
      if (i < 0)
      {
        alert('overflow~')
        break;
      }
      W = body.match('<b:section.*?>|<b:widget.*?>|<b:eval.*?>|<b:with.*?>|<b:if.*?>|<b:loop.*?>|<data:.*?>| expr:');
    }
    body = replaceData(body);
  }

  body = plate.cook(body);
  body = body.replace(/ =v /g,' => ');
  body = body.replace(/ v= /g,' >= ');
  
  if ($('#btn-classic-editor').textContent === 'Disable')
    togglePreview();
  
  previewWindow.postMessage({type:'reload'}, '*');

  waitRender = function(){
    if (loadingStatus != 200)
    {
      setTimeout(function(){
        if (waitRender)
          waitRender();
        loadingStatus = 0;
      },500)
    }
    else
    {
      uploadBody = body;
      
      previewWindow.postMessage({
        type: 'template',
        xml: body
      }, '*');
      waitRender = null;
    }
  }
  waitRender();
}

function fixDirectory(body, parent) {

  let match = body.match(/<template include=.*?>|<script include=.*?>|<link include=.*?>/g)

  if (match)
  {
    for (let m of match)
    {
      let source = m.match(/include=('|").*?('|")/)[0];
      source = source.substring(9, source.length-1).split(':');
      let src = source[0];
      let mx = m.replace(src, '~' + getDirectory(src, parent) + '@' + src.replace(/.*\//g,''))
      
      body = body.replace(m, mx);
    }
  }
  
  return body;
}

var uploadBody = '';

var waitRender = null;
var totalLoader = 0;
var iframeRender = [];
var renderQueue = [];
var renderBody = '';
var renderTemplate = '';
var renderLib;
var libParentId;

function replaceLocal(body, preParent = -1) {

  if (body === undefined)
  {
    if (locked === -1 || (activeFile && locked === activeFile.fid))
    {
      body = $('#editor').env.editor.getValue();
      
      preParent = activeFile ? activeFile.parentId : activeFolder;
    }
    else
    {
      let file = odin.dataOf(locked, fs.data.files, 'fid');
      
      // body = file.content;
      let tabIdx = odin.idxOf(file.fid, fileTab, 'fid');
      if (tabIdx >= 0)
        body = fileTab[tabIdx].content;
      else
        body = file.content;
      
      preParent = file.parentId;
    }
  }
  

  let match = body.match(/<template include=.*?><\/template>|<script include=.*?><\/script>|<link include=.*?>/);
  
  while (match !== null)
  {
    let start = 19,
    end = 13;
    
    if (match[0].includes('<script'))
    {
      start = 17;
      end = 11;
    }
    else if (match[0].includes('<link'))
    {
      start = 15;
      end = 3;
    }
    
    let src = match[0].substring(start, match[0].length-end);
    let parentId = getDirectory(src, preParent);
    let files = odin.filterData(parentId, fs.data.files, 'parentId');
    let name = src.replace(/.*?\//g,'')
    let data = odin.dataOf(name, files, 'name');
    
    if (data === undefined)
      body = body.replace(match[0], '<b style="font-size:0.9em;">THOR unexpected: '+src+' not found.</b><br/>');
    else
    {
      if (!data.loaded)
      {
        aww.pop('Downloading required file : '+name);
        drive.downloadDependencies(data);
      }
      
      let ot = '', ct = '';
      switch (start)
      {
        case 17:
          ot = '<script>\n';
          ct = '\n</script>';
          break;
        case 15:
          ot = '<style>\n';
          ct = '\n</style>';
          break;
      }
      
      // let content = (activeFile && activeFile.fid === data.fid) ? $('#editor').env.editor.getValue() : data.content;
      let tabIdx = odin.idxOf(data.fid, fileTab, 'fid');
      let content;
      if (tabIdx >= 0)
        content = (activeFile && activeFile.fid === data.fid) ? $('#editor').env.editor.getValue() : fileTab[tabIdx].content;
      else
        content = data.content;
    
      // let split = body.split(match[0]);
      let swap = ot+replaceLocal(content, parentId)+ct;
      // body = split[1]+ot+replaceLocal(content, parentId)+ct+split[2];
      body = body.replace(new RegExp(match[0], 'g'), swap);
    }
   
    
    match = body.match(/<template include=.*?><\/template>|<script include=.*?><\/script>|<link include=.*?>/);
  }
  
  return body;
}

function fixBlogCond(xml) {
  var s = xml.match(/<b:if cond=.*?>/g);
  if (s === null) return xml;
  
  for (x of s)
  {
    let zoom = x.substring(1,x.length-1);
    let n = zoom.replace(/</g,'&lt;');
    let nx = x.replace(zoom,n);
    xml = xml.replace(x,nx)
  }
  return xml
}

function fixLoop(xml) {
  var oT = xml.match(/<b:loop.*?values=".*? where .*?">/);
  if (oT !== null)
  {
    oT = oT[0];
    let oTReplaced = oT.replace(/"/g,"donquixote");
    oTReplaced = oTReplaced.replace(/'/g,'"');
    oTReplaced = oTReplaced.replace(/donquixote/g,"'");
    xml = fixLoop(xml.replace(oT,oTReplaced));
  }
  return xml;
}


window.name = 'parent';
var previewMode = false;

function exportTemplate(reparse) {
  if ($('#thor-limbo-invisible') === null)
    document.body.appendChild(o.cel('div',{id:'thor-limbo-invisible',style:'opacity:0;position:absolute;z-index:-1;'}));
  
  var copy = o.cel('textarea',{innerHTML:renderTemplate})
  $('#thor-limbo-invisible').appendChild(copy)
  copy.value = fixLoop(copy.value);
  copy.value = fixJS(copy.value);
  copy.value = fixBlogCond(copy.value);
  // copy.value = blogTamer(copy.value);
  
  if (reparse)
    copy.value = copy.value.replace(/&amp;/g,'&');
  
  copy.select();
  
  
  document.execCommand("copy");
  $('#thor-limbo-invisible').removeChild(copy);
  aww.pop('Copied to clipboard')
}

var core;
var data = {
  view:{
    isPost:false,
    isPage:false,
    isSingleItem:false,
    isLayoutMode:false,
    isHomepage:false,
    isSearch:false,
    isArchive:false,
    isMultipleItems:false,
    isLabelSearch:false,
    isError:false,
    title:'',
    description:'',
    url:''
  },
  search: {
    label:'',
    query:'',
    resultsMessage:''
  },
  blog:{
    title:'',
    searchQuery:'',
    searchLabel:''
  }
};



function ret(t) {
  core.data.updated = t.feed.updated.$t;
  core.data.posts = [];
  core.data.blog.title = t.feed.title.$t;
  core.data.view.description = t.feed.subtitle.$t;
  core.data.blog.blogId = t.feed.id.$t.split('-')[1];
  
  if (core.data.blog.refresh) core.data.blog.refresh = false;
  if (t.feed.category !== undefined)
  {
    core.data.labels = [];
    for (var i=0,e,ex; i<t.feed.category.length; i++)
    {
      e = t.feed.category[i];
      ex = {
        name:e.term,
        count:0,
        url:'?label='+e.term
      };
      core.data.labels.push(ex);
    }
    core.data.labels.sort(function(a,b){ return (a.name < b.name) ? -1 : 1});
  }
  if (t.feed.entry !== undefined)
  {
    document.body.appendChild(o.cel('div',{id:'limbo-snippet'}));
    for (var i=0,e,ex; i<t.feed.entry.length; i++)
    {
      e = t.feed.entry[i];
      
      let snippet = e.content.$t.split("<a name='more'></a>")[0];

      ex = {
        id:e.id.$t.split('post-')[1],
        title:e.title.$t,
        body:e.content.$t,
        snippets:{
          short:snippet,
          long:snippet
        },
        numberOfComments:e.thr$total.$t,
        date:e.published.$t,
        author:{
          name:e.author[0].name.$t,
          authorPhoto:{
            image:e.author[0].gd$image.src
          }
        }
      };
      ex.url = '?postID='+ex.id;
      ex.labels = [];
      if (ex.author.authorPhoto.image.substr(0,1) == '/')
        ex.author.authorPhoto.image = ex.author.authorPhoto.image.replace('//','https://');
      if (e.media$thumbnail !== undefined)
      {
        // L(e)
        ex.featuredImage = e.media$thumbnail.url.replace('s72-c','s320');
      }
      else
        ex.featuredImage = '';
      if (e.category !== undefined)
      {
        for (var j=0; j<e.category.length; j++)
        {
          ex.labels.push({
            name:e.category[j].term,
            url:'?label='+e.category[j].term
          });
          
          for (let l of core.data.labels)
          {
            if (e.category[j].term == l.name)
            {
              l.count++;
              break;
            }
          }
        }
      }
      core.data.posts.push(ex);
    }
    core.data.posts.sort(function(a,b){ return (a.date < b.date) ? 1 : -1; })
  }

  DB.get(core.data.blog.blogId, function(data) {
    if (data === undefined)
    {
      DB.create(core.data, function() {
        console.log('saved')
        aww.pop('Done')
      })
    }
    else
    {
      DB.delete(core.data.blog.blogId, function() {
        DB.create(core.data,function(){
          console.log('created new one')
          aww.pop('Blog data updated')
        })
      })
    }
  })
}


function syncBlog() {
  
  let title = $('#in-blog-title').value;
  let id = $('#in-blog-id').value;
  
  if (title.trim().length === 0 || id.trim().length === 0)
  {
    aww.pop('Blog title or ID has not been set');
    return;
  }
  
  
  data.maxPosts = $('#in-max-posts').value;
  if (data.maxPosts <= 0)
    data.maxPosts = 20;

  aww.pop('Sync blog data...')
  document.body.appendChild(o.cel('script',{src:'https://blogger.com/feeds/'+id+'/posts/default?max-results='+data.maxPosts+'&alt=json-in-script&callback=ret&token='+oblog.auth.data.token}));
}

function init(blogData) {
  
  core = new lsdb('THOR-'+blogData.blogId, THORdata);
  core.data.blogId = blogData.blogId;
  data.maxPosts = blogData.maxPosts;
  
  DB.get(blogData.blogId, function(result){
    if (result !== undefined)
    {
      core.data = result;
      aww.pop('Blog data loaded')
    }
    data.blog.homepageUrl = 'https://b-thor.firebaseapp.com/preview.html';
    
  })
  
}


function param(param,custom) {
  if (custom)
    var value = currentPage.split(param+custom)[1];
  else
    var value = currentPage.split(param+'=')[1];
  if (value !== undefined)
    value = decodeURI(value.split('&')[0]);
  return value;
}


function timestamp(date){
  return date;
}



function clearComments(xml) {
  xml = xml.replace(new RegExp('<!--_(.|\n)*?-->','g'),'');
  return xml;
}


function tame(xml) {
  var wild = xml.match(/\(|\)|\+|\*|\[|\?|\^|\$|\|/g);
  var wildBox = [];
  xml = xml.replace(new RegExp('\\\\','g'),'\\\\');
  if (wild !== null)
  {
    for (var i=0; i<wild.length; i++)
    {
      if (wildBox.indexOf(wild[i]) < 0)
      {
        xml = xml.replace(new RegExp('\\'+wild[i],'g'),'\\'+wild[i]);
        wildBox.push(wild[i]);
      }
    }
  }
  return xml;
}


function markLoop(xml,part) {
  var ot = part.match(new RegExp('<b:loop.*?>','g'));
  var ct = part.match(new RegExp('</b:loop>','g'));
  if (ot.length != ct.length)
  {
    var x = xml.match(new RegExp(tame(part)+'(.|\n)*?</b:loop>'))[0];
    part = markLoop(xml,x);
  }
  else
  {
    var x = xml.match(tame(part))[0];
    part = part.replace(ot[0],ot[0].replace('b:','!b:'));
    part = part.replace(/<\/b:loop>$/,'</!b:loop>');
    part = xml.replace(x,part);
  }
  return part;
}


function blogSection(xml) {
  var section = xml.match(/<b:section(.|\n)*?\/b:section>/g);
  if (section === null) return xml;
  for (var i=0,oT,cT,c; i<section.length; i++)
  {
    oT = section[i].match(/<b:section.*?>/)[0];
    cT = '</b:section>';
    id = oT.match(/id=".*?"/);
    if (id === null)
    id = '';
    c = section[i].substring(oT.length,section[i].length-cT.length);
    xml = xml.replace(oT+c+cT,'<div '+id+' class="section">'+c+'</div>');
  }
  return xml;
}


function blogWidget(xml,data) {
  var data = Object.assign({},data);
  var widget = xml.match(/<b:widget(.|\n)*?\/b:widget>/);
  if (widget === null) return xml;
  var i=0,oT,cT,c;
  var maxPosts = data.maxPosts;
  oT = widget[i].match(/<b:widget.*?>/)[0];
  cT = '</b:widget>';
  id = oT.match(/id=("|').*?("|')/);
  type = oT.match(/type=("|').*?("|')/);
  if (id === null)
    id = '';
  else
    id = id[0];
    
  if (type === null)
    type = '';
  else
  {
    c = widget[i].substring(oT.length,widget[i].length-cT.length);
    type = type[0].substring(5).replace(/"|'/g,'');
    if (type == 'Blog')
    {
      data.newerPageUrl = '';
      data.olderPageUrl = '';

      if (currentPage.indexOf('?postID') >= 0)
        data.posts = JSON.parse(JSON.stringify([core.data.posts[odin.idxOf(param('postID'),core.data.posts,'id')]]));
      else if (data.view.isLabelSearch)
      {
        data.posts = JSON.parse(JSON.stringify(odin.filterData(data.blog.searchLabel,core.data.posts,'labels.name','idxof')));
        var start = param('start')
        if (!start)
          start = 0;
        else
          start = parseInt(start)
        
        data.maxPosts = 20;
        if (start >= data.maxPosts)
        {
          if (start == data.maxPosts)
            data.newerPageUrl = 'https://b-thor.firebaseapp.com/preview.html?q='+param('q').replace(/"/g,'&quot;');
          else
            data.newerPageUrl = 'https://b-thor.firebaseapp.com/preview.html?q='+param('q').replace(/"/g,'&quot;')+'&start='+(start-data.maxPosts);
        }
        if (data.posts[start+data.maxPosts] !== undefined)
          data.olderPageUrl = 'https://b-thor.firebaseapp.com/preview.html?q='+param('q').replace(/"/g,'&quot;')+'&start='+(start+data.maxPosts);
        
        data.posts = data.posts.slice(start,start+data.maxPosts)
      }
      else
        data.posts = JSON.parse(JSON.stringify(core.data.posts));
        
      if (data.posts[0] !== null)
      {
        for (var j=0; j<data.posts.length; j++)
        {
          data.posts[j].url = data.posts[j].url;
          data.posts[j].date = timestamp(data.posts[j].date);
        }
        cen = widgetRender(c,data)
      }
      else
        cen = '<h4>Nothing found here.</h4>';
        
      xml = xml.replace(oT+c+cT,'<div '+id+' class="widget '+type+'">'+cen+'</div>');
    }
    else if (type == 'HTML')
    {
      cen = widgetRender(c,data);
      xml = xml.replace(oT+c+cT,'<div '+id+' class="widget '+type+'">'+cen+'</div>');
    }
    else if (type == 'Label')
    {
      data.labels = JSON.parse(JSON.stringify(core.data.labels));
      data.maxPosts = -1;
      cen = widgetRender(c,data);
      xml = xml.replace(oT+c+cT,'<div '+id+' class="widget '+type+'">'+cen+'</div>');
    }
    else if (type == 'PageList')
    {
      data.links = JSON.parse(JSON.stringify(core.data.links));
      cen = widgetRender(c,data);
      xml = xml.replace(oT+c+cT,'<div '+id+' class="widget '+type+'">'+cen+'</div>');
    }
    else
    {
      console.log('Widget with type "'+type+'" is not recognised by THOR');
      xml = xml.replace(oT+c+cT,'<div '+id+' class="widget '+type+'"><!-- cannot render widget with type '+type+'--></div>');
    }
  }
  return xml;
}


function blogExpr(xml,data) {
  var tags = xml.match(/(<|\[).*?expr:.*?(>|])/);
  if (tags === null) return xml;
  
  var t = tags[0];
  var expr = t.match("expr:.*?('|\").*?('|\")");
  var attr = expr[0].match(':.*?=(\'|")');
  var value = expr[0].match("('|\").*?('|\")");
  value = value[0].substring(1,value[0].length-1).replace(/data:/g,'data.');
  
  var single = false;
  if (value.indexOf('&quot;') >= 0)
    single = true;
  
  value = eval(value.replace(/&quot;/g,'"'));
  attr = attr[0].substring(1,attr[0].length-1);
  
  if (single)
  {
    xml = xml.replace(t.match(tame(expr[0])),attr+"'"+value+"'");
  }
  else
    xml = xml.replace(t.match(tame(expr[0])),attr+'"'+value+'"');
  
  return xml;
}


function checkContains(value) {
  if (value.match(/.*? contains .*?/) !== null)
  {
    var pile = value.split(' contains ')[0];
    var right = value.split(' contains ')[1];
    value = pile+'.indexOf('+right+') >= 0';
  }
  return value;
}


function checkLambda(value,type) {
  if (type === undefined) type = 'any';
  let reg = new RegExp('.*? '+type+'.*?','g');
  if (value.match(reg) !== null)
  {
    let score = 0;
    let record = false;
    let recorded = '';
    let fine = [];
    for (let i of value)
    {
      if (score == 4)
      {
        if ('abcdefghijklmnopqrstuvw.'.includes(i))
        {
          if (i == '.')
          {
            record = true;
            continue;
          }
        }
        else
        {
          fine.push(recorded);
          recorded = '';
          record = false;
          score = 0;
        }
        
        if (record)
          recorded += i;
      }
      else
      {
        if (score == 0 && i == " ")
          score++;
        else if (score == 1 && i == "=")
          score++;
        else if (score == 2 && i == "v")
          score++;
        else if (score == 3 && i == " ")
          score++;
        else
          score = 0;
      }
    }
    
    var pile = value.split(' '+type+' ')[0];
    var find = value.match(/("|').*?("|')/g);
    
    if (type == 'where')
    {
      if (value.match(' none '))
        value = 'odin.filterData(['+find+'],'+pile+',"'+fine.join('.')+'","none")';
      else
        value = 'odin.filterData(['+find+'],'+pile+',"'+fine.join('.')+'")';
    }
    else
      value = 'odin.filterData('+find+','+pile+',"'+fine.join('.')+'")';
      
  }
  return value;
}


function blogEval(xml,data) {
  var tags = xml.match(/<b:eval.*?>/);
  if (tags === null) return xml;
  
  var t = tags[0];
  var value = t.match('expr=.')[0];
  var punc = value[value.length-1];
  let reg = new RegExp(punc+'.*?'+punc,'g');
  value = t.match(reg)[0].replace(/&quot;/g,'"');
  
  value = value.substring(1,value.length-1).replace(/:/g,'.');
  value = checkLambda(value);
  value = checkValues(value,data);
  xml = xml.replace(t,value);
  return xml;
}


function blogWith(xml,data) {
  var tags = xml.match(/<b:with.*?>/);
  if (tags === null) return xml;
  
  var t = tags[0];
  var VAR = t.match('var=".*?"');
  var value = t.match('value=".*?"');
  value = value[0].substring(7,value[0].length-1).replace('data:','data.').replace(/&quot;/g,'"');
  value = eval(value);
  xml = xml.replace(t,'');
  VAR = VAR[0].substring(5,VAR[0].length-1);
  data[VAR] = value;
  

  var W = xml.match('<b:section.*?>|<b:widget.*?>|<b:eval.*?>|<b:with.*?>|<b:if.*?>|<b:loop.*?>|<data:.*?>| expr:');
  var w;
  while (W !== null)
  {
    var d = Object.assign({},data);
    w = W[0];
    if (w.indexOf(':section') > 0)
      xml = blogSection(xml);
    else if (w.indexOf(':widget') > 0)
      xml = blogWidget(xml,d);
    else if (w.indexOf(':if') > 0)
      xml = blogConditional(xml,d);
    else if (w.indexOf('<data:') >= 0)
      xml = blogData(xml,d);
    else if (w.indexOf('expr:') > 0)
      xml = blogExpr(xml,d);
    else if (w.indexOf(':eval') > 0)
      xml = blogEval(xml,d);
    else if (w.indexOf(':with') > 0)
      xml = blogWith(xml,d);
    W = xml.match('<b:section.*?>|<b:widget.*?>|<b:eval.*?>|<b:with.*?>|<b:if.*?>|<b:loop.*?>|<data:.*?>| expr:');
  }
  return xml;
}


var lateRender = [];
var totalLate = 0;
function blogData(xml,data) {
  var tags = xml.match(/<data:.*?>/);
  if (tags === null) return xml;
  
  var t = tags[0];
  var key = tags[0].replace('/','').split(':')[1].split('>')[0].split('.');
  var d = data[key[0]];
  if (d !== undefined)
  {
    for (var i=1; i<key.length; i++)
    {
      d = d[key[i]];
      if (d === undefined)
      {
        d = '';
        break;
      }
    }
  }
  else
    d = '';
    
  xml = xml.replace(t,'<DAT'+totalLate+'>');
  lateRender.push(d);
  totalLate++;

  return xml;
}

function checkValues(value,data)
{
  if (value.indexOf(' filter ') > 0)
  {
    var tmp = value.split(' filter ')
    var dat = eval(tmp[0]);
    var parent = tmp[1].split('.')[1].split(' ')[0];
    var child = tmp[1].split('.')[2].split(' ')[0];
    var search = tmp[1].split('== ')[1].split(')')[0];
    search = search.substring(1,search.length-1);
    return odin.filterData(search,dat,parent+'.'+child,'idxof')
  }
  else if (value.indexOf(' limit ') > 0)
  {
    var tmp = value.split(' limit ')
    var dat = eval(tmp[0]);
    var limit = tmp[1];
    
    return dat.slice(0,limit);
  }
  else if (value.indexOf(' snippet ') > 0)
  {
    var tmp = value.split(' snippet ')
    var dat = eval(tmp[0]);
    // var limit = tmp[1];
    
    return dat.split("<a name='more'></a>")[0].replace(/<p .*?>|<\/p>/g,'');
  }
  else if (value.indexOf(' where ') > 0)
  {
    return eval(checkLambda(value,'where'));
  }
  else if (value.indexOf(' any ') > 0)
  {
    return eval(checkLambda(value));
  }
  else
    return eval(value);
}

function blogLoop(xml,data) {
  var x = xml.match(/<b:loop.*?>(.|\n)*?<\/b:loop>/);
  if (x == null) return xml;
  
  xml = markLoop(xml,x[0]);

  var tags = xml.match(/<!b:loop.*?>(.|\n)*?<\/!b:loop>/g);
  var i=0,replace,oT,cT,c;
  var f = tags[0];
  var oT = f.match(/<!b:loop.*?>/)[0];

  var data = Object.assign({},data);
  
  c = f.match(/<!b:loop.*?>(.|\n)*?<\/!b:loop>/)[0].replace(/<!b:loop.*?>|<\/!b:loop>/g,'');
  var VAR = oT.match(/var=.*?>/g)[0];
  var cite = VAR.match(/var=./)[0].substr(-1);
  var VAR = VAR.split(cite)[1].split(cite)[0];
  var reg = new RegExp('values='+cite+'.*?'+cite,'g');
  // var values = oT.match(/values=.*?>/g)[0];
  var values = oT.match(reg)[0];
  
  var INDEX = oT.match(/index=".*?"/);
  var useIndex = false;
  if (INDEX !== null)
  {
    useIndex = true;
    INDEX = INDEX[0].split('"')[1].split('"')[0]
  }
  values = values.replace(/data:/g,'data.');
  values = values.substring(8,values.length-1);
  values = values.replace(/&quot;/g,'"');
  
  
  values = checkValues(values,data);
  
  var replace = '';
  var maxPosts = data.maxPosts;
  if (maxPosts == -1)
    maxPosts = values.length;
    
  if (values !==  undefined)
  {
    for (var i=0,loopData; i<maxPosts && i<values.length; i++)
    {
      loopData = Object.assign({},data);
      loopData[VAR] = values[i];
      if (useIndex)
        loopData[INDEX] = i;
      replace += widgetRender(c,loopData);
    }
  }
  else
    replace = '';
  
  xml = xml.replace(f,replace);
  
  return xml;
}

function blogConditional(xml,data) {
  var x1 = xml.match(/<b:if.*?>(.|\n)*?<\/b:if>/);
  if (x1 === null) return xml;
  x1 = x1[0];
  
  
  var open = x1.match(/<b:if.*?>/g).length;
  var close = x1.match(/<\/b:if>/g).length;
  var check;
  var regex = ['<b:if.*?>','<\/b:if>']
  while (open !== close)
  {
    regex.push('<\/b:if>');
    check = xml.match(new RegExp(regex.join('(.|\n)*?')));
    if (check !== null)
    {
      x1 = check[0];
      open = x1.match(/<b:if.*?>/g).length;
      close = x1.match(/<\/b:if>/g).length;
    }
    else
      break;
  }
  
  var x2 = x1.match(/<b:if.*?>|<b:elseif.*?>|<b:else>|<\/b:if>/g);
  var t1 = 0;
  var regex = [];
  var cond = [];
  var tmpCond = [];
  var tree = [];
  var deep = -1;
  
  let tmpx = x1;
  x2.forEach(function(t){
    if (t.indexOf('<b:if ') >= 0)
    {
      t1++;
      deep++;
      if (t1 === 1)
        cond.push(t.replace('<b:if','<'+deep+'b:if'));
    
        
      tmpCond.push('<'+deep+'b:if.*?>');
      tree.push(deep);
      tmpx = tmpx.replace('<b:if','<'+deep+'b:if');
    }
    else if (t.indexOf('<b:elseif ') >= 0)
    {
      tree.push(deep);
      tmpCond.push('<'+deep+'b:elseif.*?>');
      if (t1 === 1)
      {
        cond.push(t.replace('<b:elseif','<'+deep+'b:elseif'));
        regex.push(tmpCond.splice(0));
        tmpCond.push('<b:elseif.*?>');
      }
      
      tmpx = tmpx.replace('<b:elseif','<'+deep+'b:elseif');
    }
    else if (t.indexOf('<b:else>') >= 0)
    {
      tree.push(deep);
      tmpCond.push('<'+deep+'b:else>');
      if (t1 === 1)
      {
        cond.push(t.replace('<b:else','<'+deep+'b:else'));
        regex.push(tmpCond.splice(0));
        tmpCond.push('<b:else>');
      }
      
      tmpx = tmpx.replace('<b:else','<'+deep+'b:else');
    }
    else if (t.indexOf('</b:if>') >= 0)
    {
      tmpx = tmpx.replace('</b:if>','</'+deep+'b:if>');
      
      tree.push(deep);
      if (t1 === 1)
      {
        tmpCond.push('</'+deep+'b:if>$');
        regex.push(tmpCond.splice(0));
      }
      else
        tmpCond.push('</'+deep+'b:if>');
      t1 = Math.max(0,t1-1);
      deep--;
      
    }
  });
  
  
  var c,expr,replace;
  var meet = false;
  var meetX = false;
  for (var i=0; i<cond.length; i++)
  {
    c = cond[i];
    if (c == '<0b:else>')
    {
      meetX = true;
      meet = true;
      break;
    }
    
    expr = c.match(/cond='.*?'/);
    if (expr === null)
      expr = c.match(/cond=".*?"/);
      
    expr = expr[0].substring(6,expr[0].length-1);
    expr = expr.replace(/data:/g,'data.');
    expr = expr.replace(/&quot;/g,'"');
    expr = expr.replace(/ and /g,' && ');
    expr = expr.replace(/ or /g,' || ');
    expr = checkContains(expr);
    expr = checkLambda(expr);
    let res = eval(expr);
    
    if (Array.isArray(res))
    {
      if (res.length > 0)
      {
        meet = true;
        break
      }
    }
    else if (res)
    {
      meet = true;
      break;
    }
  }
  cond.push('</'+(deep+1)+'b:if>');
  
  
  if (meet)
  {
    if (meetX)
    {
  
      let join = [...regex[i]];
      join[0] = cond[i];
      join[join.length-1] = cond[i+1];
      
      let myReg = '';
      for (let j=0; j<join.length-1; j++)
      {
        if (j === 0)
          myReg += o.tame(join[j]);
        else
          myReg += join[j];
        if (j < join.length-1)
          myReg += '(.|\n)*?';
      }
      myReg += o.tame(join[join.length-1])
      
      replace = tmpx.match(myReg)[0];
      
      check = tmpx.match(new RegExp(join.join('(.|\n)*?')));
      while (check !== null)
      {
        replace = check[0].substr(1);
        check = replace.match(new RegExp(regex[i].join('(.|\n)*?')));
      }
    }
    else
    {
      let join = [...regex[i]];
      join[0] = cond[i];
      join[join.length-1] = cond[i+1];
      
      let myReg = '';
      for (let j=0; j<join.length-1; j++)
      {
        if (j === 0)
          myReg += o.tame(join[j]);
        else
          myReg += join[j];
        if (j < join.length-1)
          myReg += '(.|\n)*?';
      }
      myReg += o.tame(join[join.length-1])
      
      replace = tmpx.match(myReg)[0];
    }
      
    replace = replace.substring(cond[i].length,replace.length-cond[i+1].length)
    replace = replace.replace(/<[0-9]+b:/g,'<b:')
    replace = replace.replace(/<\/*[0-9]+b:/g,'</b:')
  }
  else
    replace = '';
  
  return xml.replace(x1,replace);
}

function widgetRender(xml,data) {
  var W = xml.match('<b:includable.*?>|<b:if.*?>|<b:class.*?>|<b:eval.*?>|<b:with.*?>|<b:loop.*?>|<data:.*?>| expr:');
  var w;
  var mo = 0;
  var max = 20;
  while (W !== null)
  {
    d = Object.assign({},data);
    w = W[0];
    if (w.indexOf(':if') > 0)
      xml = blogConditional(xml,d);
    else if (w.indexOf(':loop') > 0)
      xml = blogLoop(xml,d);
    else if (w.indexOf('<data:') >= 0)
      xml = blogData(xml,d);
    else if (w.indexOf(':includable') > 0)
      xml = xml.replace(/<b:includable.*?>|<\/b:includable>/g,'');
    else if (w.indexOf(':class') > 0)
    {
      var t = blogExpr(w,d);
      var value = t.match('name=".*?"');
      value = value[0].substring(6,value[0].length-1).replace(/:/g,'.').replace(/&quot;/g,'"');
      var before = xml.split(w)[0].match(/<.*?>/g);
      var tagPro = before[before.length-1];
      var tag;
      if (tagPro.indexOf('class=') < 0)
        tag = tagPro.replace(' ','class="'+value+'"');
      else
        tag = tagPro.replace('class="','class="'+value+' ');
      xml = xml.replace(tagPro,tag);
      xml = xml.replace(w,'');
    }
    else if (w.indexOf('expr:') > 0)
      xml = blogExpr(xml,d);
    else if (w.indexOf(':eval') > 0)
      xml = blogEval(xml,data);
    else if (w.indexOf(':with') > 0)
    {
      var t = w;
      var VAR = t.match('var=".*?"');
      var value = t.match('value=".*?"');
      value = value[0].substring(7,value[0].length-1).replace(':','.').replace(/&quot;/g,'"');
      value = eval(value);
      xml = xml.replace(t,'');
      VAR = VAR[0].substring(5,VAR[0].length-1);
      data[VAR] = value;
      
      xml = widgetRender(xml,data);
    }
    W = xml.match('<b:includable.*?>|<b:if.*?>|<b:oye.*?>|<b:eval.*?>|<b:with.*?>|<b:loop.*?>|<data:.*?>| expr:');
  }
  return xml;
}




function removeCloseTag(xml) {
  xml = xml.replace(/<\/(b:elseif|b:else|b:include|b:eval)>/g,'');
  return xml;
}

function closeDataTag(xml) {
  var datatags = xml.match(/<data:.*?>/g);
  if (datatags === null) return xml;
  for (var closer,i=0,dt,deleted=[]; i<datatags.length; i++)
  {
    dt = datatags[i];
    if (deleted.indexOf(dt) < 0)
    {
      closer = '<\\/'+dt.substr(1);
      xml = xml.replace(new RegExp(closer,'g'),'');
      if (dt.indexOf('/') < 0)
      xml = xml.replace(new RegExp(dt,'g'),dt.substr(0,dt.length-1)+'/>');
      deleted.push(dt);
    }
  }
  
  var tags = ['b:else','b:include ','b:class','b:eval'];
  for (var i=0,tag; i<tags.length; i++)
  {
    tag = xml.match(new RegExp('<'+tags[i]+'.*?>','g'));
    if (tag === null) continue;
    for(var j=0; j<tag.length; j++)
    {
      xml = xml.replace(tag[j],(tag[j].substr(0,tag[j].length-1)+'/>').replace('//>','/>'));
    }
  }
  return xml;
}


function replaceData(xml) {
  for (var i=0; i<lateRender.length; i++)
    xml = xml.replace('<DAT'+i+'>',lateRender[i]);
  return xml;
}
 

function blogTamer(xml) {
  
  var T,tamedJS;
  var js = xml.match(/<script>(.|\n)*?<\/script>/g);
  
  if (js !== null)
  js.forEach((j) => {
    while (j.match(/<script>/g).length !== j.match(/<\/script>/g).length)
      j = xml.match(new RegExp(o.tame(j)+'(.|\n)*?'))[0];
    
    xml = xml.replace(j,'<cursed>');
    
    T = (j.match(/while ?\(.*?\)/g));
    if (T !== null)
    T.forEach((cond,i) => {
      while (cond.match(/\(/g).length !== cond.match(/\)/g).length)
        cond = j.match(new RegExp(o.tame(cond)+'.*?\\)'))[0];

      j = j.replace(cond, cond.replace(/</g,'&lt;'));
    });
    
    
    T = (j.match(/if ?\(.*?\)/g));
    if (T !== null)
    T.forEach((cond,i) => {
      while (cond.match(/\(/g).length !== cond.match(/\)/g).length)
        cond = j.match(new RegExp(o.tame(cond)+'.*?\\)'))[0];

      j = j.replace(cond, cond.replace(/</g,'&lt;'));
    });
    
    T = (j.match(/(return|=) ?\(.*?\) ?\?/g));
    if (T !== null)
    T.forEach((cond,i) => {
      while (cond.match(/\(/g).length !== cond.match(/\)/g).length)
        cond = j.match(new RegExp(o.tame(cond)+'.*?\\)'))[0];

      j = j.replace(cond, cond.replace(/</g,'&lt;'));
    });
    
    
    T = (j.match(/for ?\(.*?;.*?;.*?\)/g));
    if (T !== null)
    T.forEach((cond,i) => {
      while (cond.match(/\(/g).length !== cond.match(/\)/g).length)
        cond = j.match(new RegExp(o.tame(cond)+'.*?\\)'))[0];

      j = j.replace(cond, cond.replace(/</g,'&lt;'));
    });

    
    var wild = j.match(/'.*?&.*?'/g)
    if (wild !== null)
    wild.forEach((w) => {
      j = j.replace(w,w.replace(/&/g,'&amp;'))
    })
    tamedJS = j.replace(/&&/g,'&amp;&amp;');
    
    
    xml = xml.replace('<cursed>', tamedJS);
  })
  
  L(xml);
  return xml;
}


function closeHTML(html) {
  var tags = ['img','input','link','meta'];
  
  for (var i=0,tag; i<tags.length; i++)
  {
    tag = html.match(new RegExp('<'+tags[i]+'.*?>','g'));
    if (tag === null) continue;
    for(var j=0; j<tag.length; j++)
    {
      if (tag[j].indexOf('/>') < 0)
        html = html.replace(tag[j],tag[j].substr(0,tag[j].length-1)+'/>');
    }
  }
  
  html = html.replace(/<hr>/g,'<hr/>');
  html = html.replace(/<br>/g,'<br/>');
  
  return html;
}


function repairDataTag(html) {
  html = html.replace(/author.authorphoto/g,'author.authorPhoto');
  html = html.replace(/post.featuredimage/g,'post.featuredImage');
  html = html.replace(/post.numberofcomments/g,'post.numberOfComments');
  html = html.replace(/blog.blogid/g,'blog.blogId');
  html = html.replace(/blog.searchurl/g,'blog.searchUrl');
  html = html.replace(/blog.searchquery/g,'blog.searchQuery');
  html = html.replace(/blog.homepageurl/g,'blog.homepageUrl');
  html = html.replace(/olderpageurl/g,'olderPageUrl');
  html = html.replace(/newerpageurl/g,'newerPageUrl');
  html = html.replace(/view.search.resultsmessagehtml/g,'view.search.resultsMessageHtml');
  return html;
}


function fixJS(xml) {
  xml = xml.replace(/\&/g,'&amp;')
  xml = xml.replace(/<br>/g,'<br/>')
  
  var s = xml.match(/<script>(.|\n)*?<\/script>/g);
  if (s === null) return xml;
  
  for (x of s)
  {
    var lines = x.split('\n');
    var i = 0;
    for (let l of lines)
    {
      if (l.trim().substring(0,2) == '//' || l.trim().substring(0,2) == '/*')
      {
        lines[i] = l.replace(/</g,'&lt;');
      }
      i++;
    }

    lines = lines.join('\n');
    xml = xml.replace(x,lines)
  }
  return xml
}



function checkParam() {
  if (core === undefined) return;
  
  data.blog.title = core.data.blog.title;
  data.blog.blogId = core.data.blog.blogId;
  data.view.isHomepage = false;
  data.view.isLabelSearch = false
  data.view.isMultipleItems = false;
  data.view.isSearch = false;
  data.view.isSingleItem = false;
  data.view.search = {
    resultsMessageHtml: '',
    query:''
  }
    
  if (param('q') !== undefined)
  {
    data.view.isSearch = true;
    data.view.isMultipleItems = true;
    data.view.title = 'Search: '+param('q');
    data.blog.title = 'Search: '+param('q');
    data.blog.searchQuery = param('q');
    data.maxPosts = 10;
    let label = param('label',':'); // unofficial data
    data.blog.searchLabel = label.substring(1,label.length-1);

    data.view.search.query = 'label:"'+data.blog.searchLabel+'"';
    data.view.search.resultsMessageHtml = 'Showing posts matching the search for label:"'+data.blog.searchLabel+'"'
  }
  else if (param('postID') !== undefined)
  {
    data.view.isSingleItem = true;
    var idx = odin.idxOf(param('postID'),core.data.posts,'id');
    if (core.data.posts[idx] === undefined)
      data.view.title = core.data.blog.title;
    else
      data.view.title = core.data.posts[idx].title;
  }
  else
  {
    data.view.isHomepage = true;
    data.view.title = core.data.blog.title;
  }
}


function format(date,format) {
  var form = {
    HH:format.indexOf('HH'),
    H:format.indexOf('H'),
    hh:format.indexOf('hh'),
    h:format.indexOf('h'),
    
    mm:format.indexOf('mm'),
    m:format.indexOf('m'),
    
    dd:format.indexOf('dd'),
    d:format.indexOf('d'),
    EEEE:format.indexOf('EEEE'),
    EEE:format.indexOf('EEE'),
    MMMM:format.indexOf('MMMM'),
    MMM:format.indexOf('MMM'),
    MM:format.indexOf('MM'),
    M:format.indexOf('M'),
    YYYY:format.indexOf('YYYY'),
  };
  
  var date = new Date(date);
  var replace,code;
  var tmp = [];
  for (var i in form)
  {
    if (form[i] >= 0)
    {
      switch (i)
      {
        case 'HH':
          replace = date.toLocaleTimeString('en-US',{hour:'2-digit',hour12:false});
          code = 'tp1'
          break;
        case 'H':
          replace = date.toLocaleTimeString('en-US',{hour:'numeric',hour12:false})
          code = 'tp2'
          break;
        case 'hh':
          replace = date.toLocaleTimeString('en-US',{hour:'2-digit',hour12:true})
          code = 'tp3'
          break;
        case 'h':
          replace = date.toLocaleTimeString('en-US',{hour:'numeric',hour12:true})
          code = 'tp4'
          break;
          
        case 'mm':
          replace = date.toLocaleTimeString('en-US',{minute:'2-digit'})
          code = 'tp5'
          break;
        case 'm':
          replace = date.toLocaleTimeString('en-US',{minute:'numeric'})
          code = 'tp6'
          break;
          
        case 'EEEE':
          replace = date.toLocaleDateString('en-US',{weekday:'long'})
          code = 'tp7'
          break;
        case 'EEE':
          replace = date.toLocaleDateString('en-US',{weekday:'short'})
          code = 'tp8'
          break;
        case 'dd':
          replace = date.toLocaleDateString('en-US',{day:'2-digit'})
          code = 'tp9'
          break;
        case 'd':
          replace = date.toLocaleDateString('en-US',{day:'numeric'})
          code = 'tpa'
          break;
        case 'MMMM':
          replace = date.toLocaleDateString('en-US',{month:'long'})
          code = 'tpb'
          break;
        case 'MMM':
          replace = date.toLocaleDateString('en-US',{month:'short'})
          code = 'tpc'
          break;
        case 'MM':
          replace = date.toLocaleDateString('en-US',{month:'2-digit'})
          code = 'tpf'
          break;
        case 'M':
          replace = date.toLocaleDateString('en-US',{month:'numeric'})
          code = 'tpg'
          break;
        case 'YYYY':
          replace = date.toLocaleDateString('en-US',{year:'numeric'})
          code = 'tph'
          break;
      }
      tmp.push({code:code,replace:replace});
      format = format.replace(i,code)
    }
    else
      format = format.replace(i,'');
  }
  
  for (let t of tmp)
    format = format.replace(t.code,t.replace);
  
  return format.trim();
}



function lockRender(self, fid, name) {
  for (let el of $('.btn-lock'))
    el.classList.toggle('w3-text-purple', false)
  
  if (locked !== fid)
  {
    locked = fid;
    self.classList.toggle('w3-text-purple')
  }
  else
    locked = -1;
}


function resizeImage(url,size)
{
  return url;
}