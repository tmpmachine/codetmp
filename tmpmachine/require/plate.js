/*
1.33 : 18 sep 19 -- fix tag skips include error for Blogsphere, function encapsulation, unclose attribute handler, style without break handler
1.32 : 7 sep 19 -- encapsulation
1.31 - 29 July 19 - clear plate element
1.30 - 22 May 19 - added more css shorthand
1.29 - 2 May 19 - added skips for php
1.28 - 11 Apr 19 - reduced code from 922 to 757 line
1.27 - 2 Apr 19 - removing empty space after cook, rollback from let to var and const
1.26 - 29 Mar 19 - center, form, table, tr, td, th htmlshorthand
1.25 - 27 Mar 19 - removing default w3-row class for div
1.24 - 6 Mar 19 - added ul and li tag
*/

(function () {
  
  function clearPlate(meat) {
      
    let regex = new RegExp('<template id=("|\')plate-.*?("|\')>(.|\n)*?<\/template>');
    let match = meat.match(regex);
    if (match) {
      let open = match[0].match(/<template/g).length;
      let close = match[0].match(/<\/template/g).length;
      regex = '<template id=("|\')plate-.*?("|\')>(.|\n)*?<\/template>';
      while (close < open)
      {
        regex += '(.|\n)*?<\/template>';
        match = meat.match(new RegExp(regex));
        open = match[0].match(/<template/g).length;
        close = match[0].match(/<\/template/g).length;
      }
      
      meat = clearPlate(meat.replace(match[0], ''));
    }
    
    return meat;
  }
  
  function generateAttributes(attributes) {
    const atts = [];
  
    if (attributes.id.length > 0)
      atts.push('id="'+attributes.id.join('')+'"');
    if (attributes.class.length > 0)
      atts.push('class="'+attributes.class.join(' ')+'"');
    if (attributes.attribute.length > 0)
      atts.push(attributes.attribute.join(' '));
    if (attributes.style.length > 0) {
      for (let i in attributes.style)
        if (!attributes.style[i].endsWith(';'))
          attributes.style[i] += ';';
      atts.push('style="'+attributes.style.join('')+'"');
    }
    
    attributes.id.length = 0;
    attributes.class.length = 0;
    attributes.attribute.length = 0;
    attributes.style.length = 0;
    attributes.innerHTML.length = 0;
    
    if (atts.length > 0)
      return ' '+atts.join(' ');
    else
      return atts.join(' ');
  }
    
  function getDish(id, fullContent) {
    if (document.getElementById('plate-'+id)) {
      return document.getElementById('plate-'+id).innerHTML;
    } else {
      var regex = new RegExp('<template id=("|\')plate-'+id+'("|\')>(.|\n)*?<\/template>');
      var match = fullContent.match(regex);
      if (match) {
        var open = match[0].match(/<template/g).length;
        var close = match[0].match(/<\/template/g).length;
        regex = '<template id=("|\')plate-'+id+'("|\')>(.|\n)*?<\/template>'
        while (close < open) {
          regex += '(.|\n)*?<\/template>'
          match = fullContent.match(new RegExp(regex))
          open = match[0].match(/<template/g).length;
          close = match[0].match(/<\/template/g).length;
        }
        
        return match[0].substring(22+id.length,match[0].length-11);
      } else {
        return '';
      }
    }
  }
  
  let htmlShorthand = [
    [' '  ,'div'      ,true ,''],
    ['v'  ,'video'    ,true ,''],
    ['a'  ,'a'        ,true ,''],
    ['au' ,'audio'    ,true ,''],
    ['pre','pre'      ,true ,''],
    ['p'  ,'p'        ,true ,''],
    ['btn','button'   ,true ,''],
    ['can','canvas'   ,true ,''],
    ['img','img'      ,false,''],
    ['in' ,'input'    ,false,''],
    ['i'  ,'i'        ,true ,''],
    ['b'  ,'b'        ,true ,''],
    ['s'  ,'span'     ,true ,''],
    ['l'  ,'label'    ,true ,''],
    ['t'  ,'textarea' ,true ,''],
    ['hr' ,'hr'       ,false,''],
    ['br' ,'br'       ,false,''],
    
    ['h1' ,'h1'       ,true ,''],
    ['h2' ,'h2'       ,true ,''],
    ['h3' ,'h3'       ,true ,''],
    ['h4' ,'h4'       ,true ,''],
    ['h5' ,'h5'       ,true ,''],
    ['h6' ,'h6'       ,true ,''],
    
    ['sel','select'   ,true ,''],
    ['opt','option'   ,true ,''],
    ['M'  ,'i'        ,true ,'material-icons'],
    ['ul' ,'ul'       ,true ,''],
    ['li' ,'li'       ,true ,''],
    ['c'  ,'div'      ,true ,'w3-col'],
    ['x'  ,'div'      ,true ,'w3-rest'],
    ['tab','table'    ,true ,''],
    ['tr' ,'tr'       ,true ,''],
    ['th' ,'th'       ,true ,''],
    ['td' ,'td'       ,true ,''],
    ['f'  ,'form'     ,true ,''],
    ['cen','center'   ,true ,'']
  ];
  let cssShorthand = [
    ['p:','padding:'],
    ['pl:','padding-left:'],
    ['pt:','padding-top:'],
    ['pr:','padding-right:'],
    ['pb:','padding-bottom:'],
    
    ['m:','margin:'],
    ['ml:','margin-left:'],
    ['mt:','margin-top:'],
    ['mr:','margin-right:'],
    ['mb:','margin-bottom:'],
    
    ['td:','text-decoration:'],
    ['tt:','text-transform:'],
    ['ff:','font-family:'],
    ['fs:','font-size:'],
    ['ft:','font-style:'],
    ['fw:','font-weight:'],
    
    ['ta:','text-align:'],
    ['ws:','white-space:'],
    
    ['fl:','float:left;'],
    ['fr:','float:right;'],
    ['f:','float:'],
    ['o:','outline:'],
    ['ov:','overflow:'],
    ['ov-y:','overflow-y:'],
    ['ov-x:','overflow-x:'],
    
    ['mw:','min-width:'],
    ['mh:','min-height:'],
    ['Mw:','max-width:'],
    ['Mh:','max-height:'],
    ['w:','width:'],
    ['h:','height:'],
    
    ['dis:','display:'],
    ['vis:','visibility:'],
    ['op:','opacity:'],
    
    ['col:','color:'],
    ['bg:','background:'],
    ['bg-p:','background-position:'],
    ['bg-r:','background-repeat:'],
    ['bg-a:','background-attachment:'],
    ['bg-s:','background-size:'],
    
    ['ts:','transition:'],
    ['tr:','transform:'],
    
    ['rad:','border-radius:'],
    
    ['bor:','border:'],
    ['bor-l:','border-left:'],
    ['bor-t:','border-top:'],
    ['bor-r:','border-right:'],
    ['bor-b:','border-bottom:'],
    ['bor-w:','border-width:'],
    ['bor-c:','border-color:'],
    
    ['posr:','position:relative;'],
    ['posa:','position:absolute;'],
    ['posf:','position:fixed;'],
    ['pos:','position:'],
    ['z:','z-index:'],
    ['t0:','top:0;'],
    ['l0:','left:0;'],
    ['r0:','right:0;'],
    ['b0:','bottom:0;'],
    ['t:','top:'],
    ['l:','left:'],
    ['r:','right:'],
    ['b:','bottom:'],
    
    ['lh:','line-height:'],
    ['ls:','line-spacing:'],
    ['lts:','letter-spacing:']
  ];
  
  function grill(meat, attributes) {
    
    const lt = String.fromCharCode(60);
    const gt = String.fromCharCode(62);
      
    const settings = {
      tag: [],
      class: [
        {short: '.', prefix: ''},
        {short: '+', prefix: 'w3-'}
      ],
      attributes: [
        {open: '{', close: '}', name: 'style'},
        {open: '"', close: '"', name: 'innerHTML'},
        {open: "'", close: "'", name: 'innerHTML'},
        {open: '@', close: ' ', name: 'id'},
      ]
    };
    
    const skips = [
      {open:'<'+'?php', close:'?>', destroyTag: false},
      {open:'<'+'code>', close:'<'+'/code'+'>', destroyTag: false},
      {open:'<'+'style>', close:'<'+'/style'+'>', destroyTag: false},
      {open:'<'+'script', close:'<'+'/script'+'>', destroyTag: false},
      {open:'<'+'!--', close:'--'+'>', destroyTag: true, callback: getDish, record: true}
    ];
    
    for (const tag of htmlShorthand)
    {
      settings.tag.push({
        short: tag[0],
        tag: tag[1],
        close: tag[2],
        attributes: { class: tag[3] }
      });
    }
      
    plate.tag.forEach(function(t) {

      settings.tag.forEach(function(s) {
        
        if (s.short === t.short)
          s.attributes.class = t.attributes.class;
        
      });
    });
    
    const shortHandStack = [];
    var shortHandPointer = 0;
    const shortHandCheck = [];
    var waitImportant = false;
    
    var dontClose = 0;
    const listen = [];
    var pointer = 0;
    const ht = [];
    const stack = [];
    var openingClose = '';
    const closeTag = [];
    var scanType = '';
    
    var spaceOne = false;
    var typeLock = false;
    
    var tagStack = [];
    var unClose = 0;
    const attStack = [];
    var attMode = '';
    var lock = '';
    var innerLock = '';
  
    var waitSkip = '';
    var waitRecord = false;
    var waitDestroy = false;
    var waitCallback;
    const newMatch = [];
    var charBypass = '';
    var mode = '';
    
    function finishTag() {
      var tagName = tagStack.join('');
      var choosenTag = {
        tag: tagName,
        close: true,
        attributes: { class: '' }
      };
          
      if (tagStack.length === 0)
        choosenTag = settings.tag[0];
      
      settings.tag.forEach(function(tag) {
        if (tag.short === tagName)
          choosenTag = tag;
      });
      
      ht.push(choosenTag.tag);
      if (choosenTag.close) {
        openingClose = gt;
        closeTag.push(lt+'/'+choosenTag.tag+gt);
      } else {
        unClose--;
        openingClose = '';
        closeTag.push('/'+gt);
      }
      mode = 'scanTag';
      tagStack.length = 0;
      attributes.class = choosenTag.attributes.class.split(' ');
      if (attributes.class[0].length === 0)
        attributes.class.length = 0;
    }
    
    function stopRender(char) {
      if (dontClose > 0) {
        ht.push(char);
        dontClose--;
        return;
      }
      
      if (mode == 'getTagName')
        finishTag();
        
      if (mode == 'scanTag' || mode == 'scanAtt' || unClose > 0) {
        if (scanType == 'class') {
          attributes.class.push(stack.join(''));
          stack.length = 0;
        } else if (scanType == 'id') {
          attributes.id.push(stack.join(''));
          stack.length = 0;
        } else if (scanType == 'innerHTML') {
          attributes.innerHTML.push(stack.join(''));
          stack.length = 0;
        }
        
        
        if (attStack.length > 0)
          attributes.attribute.push(attStack.join(''));
        
        const innerHTML = attributes.innerHTML.join('');
        const newAtt = generateAttributes(attributes);
        
        if (char == ']') {
          stack.push(newAtt+openingClose+innerHTML+closeTag[closeTag.length-1]);
          closeTag.pop();
        } else {
          stack.push(newAtt+openingClose+innerHTML+'\n');
        }
        
        if (newAtt.length === 0) {
          for (const xs of stack)
            ht.push(xs);
        } else {
          for (const xs of stack)
            ht.push(xs);
        }
        
        attStack.length = 0;
        spaceOne = false;
        openingClose = '';
        stack.length = 0;
        mode = ''
        scanType = '';
      } else {
        ht.push(char);
      }
    }
    
    
    for (var char of meat) {
      if (mode == 'open' || mode == 'skip') {
        stack.push(char);
        var match = false;
        var done = false;
        
        if (mode == 'open') {
          for (const skip of skips) {
            var search = skip.open;
            
            if (search[pointer] == char) {
              match = true;
              
              if (search.length == pointer+1) {
                mode = 'skip';
                waitSkip = skip.close;
                waitRecord = skip.record;
                waitCallback = skip.callback;
                waitDestroy = skip.destroyTag;

                done = true;
                pointer = 0;
                
                if (!skip.destroyTag) {
                  for (const xs of stack)
                    ht.push(xs);
                }
                  
                stack.length = 0;
                break;
              }
            }
          }
        } else if (mode =='skip') {
          if (waitSkip[pointer] == char) {
            match = true;
            
            if (waitSkip.length == pointer+1) {
              mode = '';

              var content = stack.splice(0,stack.length-waitSkip.length);
              if (waitCallback) {
                content = content.join('');
                if (content.startsWith('plate-')) {
                  content = waitCallback(content.substring(6),meat);
                  content = plate.cook(content);
                } else {
                  content = '<!--'+plate.cook(content)+'-->';
                }
                for (const c of content)
                  ht.push(c);
              }
              
              done = true;
              pointer = 0;
              
              if (!waitDestroy) {
                for (const xs of stack)
                  ht.push(xs);
              }
              
                
              waitSkip = '';
              waitCallback = null;
              waitRecord = false;
              waitDestroy = false;
              stack.length = 0;
            }
          }
        }
        
        if (match) {
          if (done) continue;
          pointer++;
        } else {
          if (mode == 'open')
            mode = '';
          else
            pointer = 0;
          
          if (!waitRecord) {
            for (const xs of stack)
              ht.push(xs)
          }
          
          if (!waitRecord)
            stack.length = 0;
        }
      } else {
        if (scanType == 'attribute' || attMode == 'lock') {
          charBypass = char
          char = 'a';
        }
        
        if (scanType == 'innerHTML') {
          if (char != innerLock) {
            stack.push(char);
            continue;
          } else {
            innerLock = '';
          }
        }

        switch (char) {
          case lt:
            
            stack.push(char);
            pointer = 1;
            if (mode === '')
              mode = 'open';
              
            break;
          case '[':
            
            attMode = '';
            unClose++;
            ht.push(lt);
            mode = 'getTagName';
            
            break;
          case ']':
          case '\n':

            stopRender(char);
            
            break;
          default:
            
            if (charBypass != '') {
              char = charBypass;
              charBypass = '';
            }
            
            if (char === ' ' && mode === 'getTagName') {
              finishTag();
            } else if (mode == 'scanTag') {
              var match = false;
              if (attMode == '') {
                for (const cls of settings.class) {
                  if (cls.short == char) {
                    match = true;
                    mode = 'scanAtt';
                    scanType = 'class';
                    stack.push(cls.prefix);
                    break;
                  }
                }
              }
              
              if (!match) {
                
                if (attMode == '') {
                  for (const attribute of settings.attributes) {
                    if (attribute.open == char) {
                      match = true;
                      mode = 'scanAtt';
                      
                      switch (attribute.open) {
                        case '@':
                          scanType = 'id';
                        break;
                        case '"':
                          scanType = 'innerHTML';
                          innerLock = '"'
                        break;
                        case "'":
                          scanType = 'innerHTML';
                          innerLock = "'"
                        break;
                        default:
                          scanType = 'attribute';
                      }
                      
                      for (const xs of cssShorthand.keys())
                        shortHandCheck.push(xs);
                      break;
                    }
                  }
                }
                
                if (!match) {
                  if (attMode == 'value') {
                    attStack.push(char)
                    attMode = 'lock'
                    
                    if (char == '"' || char == "'")
                      lock = char;
                    else
                      lock = ' '
                  } else if (attMode == 'lock') {
                    if (lock == ' ' && (char == '\n' || char == ']')) {
                      attributes.attribute.push(attStack.join(''));
                      attMode = '';
                      lock = '';
                      attStack.length = 0;
                      stopRender(char)
                    } else if (char == lock) {
                      if (lock != ' ')
                        attStack.push(char)
                      attributes.attribute.push(attStack.join(''));
                      
                      attMode = '';
                      lock = '';
                      attStack.length = 0;
                    } else {
                      attStack.push(char);
                    }
                      
                  } else {
                    if (char == ' ') {
                      if (attMode == 'waitForValue') {
                        attributes.attribute.push(attStack.join(''));
                        attMode = '';
                        attStack.length = 0;
                      } else {
                        if (!spaceOne)
                          spaceOne = true;
                      }
                    } else {
                      attStack.push(char);
                      
                      if (char == '=')
                        attMode = 'value';
                      else
                        attMode = 'waitForValue'
                    }
                  }
                }
              }
            } else if (mode == 'scanAtt') {
              if ((char == ' ' && scanType != 'attribute') || char == '}' || char == '"' && scanType != 'attribute' || char == "'" && scanType != 'attribute') {
                if (scanType == 'class') {
                  attributes.class.push(stack.join(''));
                } else if (scanType == 'innerHTML') {
                  attributes.innerHTML.push(stack.join(''));
                } else if (scanType == 'id') {
                  attributes.id.push(stack.join(''));
                } else if (scanType == 'attribute') {
                  attributes.style.push(shortHandStack.join(''))
                  shortHandStack.length = 0;
                  shortHandPointer = 0;
                }
  
                stack.length = 0;
                mode = 'scanTag'
                scanType = ''
              } else {
                if (scanType == 'attribute') {
                  var match = false;
                  for (var i = 0; i < shortHandCheck.length; i++) {
                    if (cssShorthand[shortHandCheck[i]][0][shortHandPointer] == char)
                      match = true;
                    else {
                      shortHandCheck.splice(i,1);
                      i -= 1;
                    }
                  }
                  
                  if (match) {
                    shortHandStack.push(char);
                    shortHandPointer++;
                    if (char == ':') {
                      const start = shortHandStack.length-shortHandPointer;
                      const end = shortHandPointer;
                      shortHandStack.splice(start,end);
                      
                      for (const xs of cssShorthand[shortHandCheck[0]][1].split(''))
                        shortHandStack.push(xs);
                    }
                  } else {
                    if (char == '!') {
                      waitImportant = true;
                    } else if (char == ';' || char == ' ') {
                      if (char == ';' && waitImportant) {
                        char = 'important;'
                        waitImportant = false;
                      }
                      
                      shortHandPointer = 0;
                      for (const key of cssShorthand.keys())
                        shortHandCheck.push(key);
                    }
                    
                    shortHandStack.push(char);
                  }
                } else {
                  stack.push(char);
                }
              }
            } else if (mode == 'getTagName') {
              tagStack.push(char);
            } else {
              ht.push(char)
            }
          
          // end of default
        }
      }
    }
    
    return ht.join('');
  }
  
  
  const plate = {
    tag: [],
    cook: function(meat, callback) {
      const attributes = {
        class: [],
        attribute: [],
        style: [],
        id: [],
        innerHTML: []
      };
      
      var farm = false;
      if (meat === undefined || meat === null) {
        if (!document.body) return meat;
        meat = document.body.innerHTML;
      }
      else
        farm = true;
    
      meat = grill(meat, attributes);
      
      if (!farm)
        document.body.innerHTML = meat;
      
      if (callback)
        callback();
      
      return clearPlate(meat);
    },
  }
  
  if (window.plate === undefined)
    window.plate = plate;
  else
    console.error('aww.js:', 'Failed to initialize. Duplicate variable exists.');
})();