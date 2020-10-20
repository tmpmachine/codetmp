/* v0.0321 -- 7 April 2020 | git@tmpmachine/_web */
(function(){let keyboardShortcut=[];let alfa='1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');let keys=['[',']','}','{','-','+',',','.','<','>','Escape','Delete','Enter','Backspace','Right','Left','Up','Down','Space'];let keyCode=[219,221,221,219,189,187,188,190,188,190,27,46,13,8,39,37,38,40,32];for(let char of alfa){keys.push(char);keyCode.push(char.charCodeAt(0))}
const keyboard={keylogger:!1,Alt:!1,Shift:!1,Control:!1,listen:function(shortcut,isPreventDefault=!1){initKeyboardShortcut(shortcut,isPreventDefault);window.addEventListener('keydown',keyHandle);window.addEventListener('keyup',keyHandle);window.addEventListener('blur',keyHandle)}};function keyUpHandler(e){switch(e.keyCode){case 16:case 17:case 18:keyboard[e.key]=!1;break}}
function keyDownHandler(e){if(keyboard.keylogger)
console.log(e.keyCode,e);switch(e.keyCode){case 16:case 17:case 18:keyboard[e.key]=!0;break}
for(let shortcut of keyboardShortcut){if(shortcut&&shortcut.keyCode==e.keyCode&&shortcut.Alt==keyboard.Alt&&shortcut.Control==keyboard.Control&&shortcut.Shift==keyboard.Shift){if(shortcut.isPreventDefault)
event.preventDefault();shortcut.callback();break}}}
function keyCodeOf(key){return keyCode[keys.indexOf(key)]}
function initKeyboardShortcut(shortcuts,isPreventDefault){for(let i in shortcuts){let shortcut={Alt:i.includes('Alt+'),Control:i.includes('Ctrl+'),Shift:i.includes('Shift+'),callback:null};shortcut.key=i;shortcut.keyCode=keyCodeOf(i.replace(/Alt\+|Ctrl\+|Shift\+/g,''));shortcut.callback=shortcuts[i];if('<>{}'.includes(i))
shortcut.Shift=!0;shortcut.isPreventDefault=isPreventDefault;keyboardShortcut.push(shortcut)}}
function keyHandle(event){if(event.type=='blur'){keyboard.Shift=!1;keyboard.Control=!1;keyboard.Alt=!1}else if(event.type=='keyup'){keyUpHandler(event)}else if(event.type=='keydown'){keyDownHandler(event)}}
if(window.keyboard===undefined)
window.keyboard=keyboard;else console.error('keyboard.js:','Failed to initialize. Duplicate variable exists.')})();