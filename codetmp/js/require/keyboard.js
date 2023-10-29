/* keytrapper@v0.4 */
let KeyTrapper = (function () {
  
    let keyboardShortcut = [];
      
    let alfa = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let keys = ['[',']','}','{','-','+',',','.','<','>','Escape','Delete','Enter','Backspace','Right','Left','Up','Down','Space'];
    let keyCode = [219,221,221,219,189,187,188,190,188,190,27,46,13,8,39,37,38,40,32];
    for (let char of alfa) {
      keys.push(char);
      keyCode.push(char.charCodeAt(0));
    }
    
    const KeyTrapper = function() {
      let self = {
        keylogger: false,
        Alt: false,
        Shift: false,
        Control: false,
        isBlocked: function() { return false },
        listen: function (shortcut, eventType = 'keydown', isPreventDefault = false) {
          initKeyboardShortcut(shortcut, eventType, isPreventDefault);
        },
        isPressed: function(keyCode) {
          return keyboard[keyCode];
        }
      };
      
      window.addEventListener('keydown', (event) => keyHandle(event, self));
      window.addEventListener('keyup', (event) => keyHandle(event, self));
      window.addEventListener('blur', (event) => keyHandle(event, self));
      
      return self;
    };
    
    function callback(eventType, e, self) {
      for (let shortcut of keyboardShortcut) {
        if (shortcut && shortcut.keyCode == e.keyCode && shortcut.Alt == self.Alt && shortcut.Control == self.Control && shortcut.Shift == self.Shift) {
          if (shortcut.isPreventDefault)
            e.preventDefault();
          if (shortcut.eventType == eventType && shortcut.callback) {
            if (!self.isBlocked()) {
              shortcut.callback(e);
            }
          }
          break;
        }
      }
    }
    
    function keyUpHandler(e, self) {
      if ([16,17,18].includes(e.keyCode))
          self[e.key] = false;
        else
          self[e.keyCode] = false;
      callback('keyup', e, self);
    }
    
    function keyDownHandler(e, self) {
      if (self.keylogger)
        console.log(e.keyCode, e);
        if ([16,17,18].includes(e.keyCode))
          self[e.key] = true;
        else
          self[e.keyCode] = true;
      callback('keydown', e, self);
    }
    
    function keyCodeOf(key) {
      return keyCode[keys.indexOf(key)];
    }
    
    function initKeyboardShortcut(shortcuts, eventType, isPreventDefault) {
      for (let i in shortcuts) {
  
        let shortcut = {
          eventType,
          Alt: i.includes('Alt+'),
          Control: i.includes('Ctrl+'),
          Shift: i.includes('Shift+'),
          callback: null,
        };
  
        shortcut.key = i;
        shortcut.keyCode = keyCodeOf(i.replace(/Alt\+|Ctrl\+|Shift\+/g,''));
        shortcut.callback = shortcuts[i];
        if ('<>{}'.includes(i))
          shortcut.Shift = true;
        shortcut.isPreventDefault = isPreventDefault;
        
        keyboardShortcut.push(shortcut);
      }
    }
    
    function keyHandle(event, self) {
        if (event.type == 'blur') {
          self.Shift = false;
          self.Control = false;
          self.Alt = false;
        } else if (event.type == 'keyup') {
          self.Shift = event.shiftKey;
          self.Control = event.ctrlKey;
          self.Alt = event.altKey;
          keyUpHandler(event, self);
        } else if (event.type == 'keydown') {
          self.Shift = event.shiftKey;
          self.Control = event.ctrlKey;
          self.Alt = event.altKey;
          keyDownHandler(event, self);
        }
    }
    
    return KeyTrapper;
    
  })();