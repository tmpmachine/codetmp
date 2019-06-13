# TMPmachine
A simple development environment for those who loves web apps prototyping and need high mobility.

# Official Site
[https://tmpmachine.web.app/][tmpmachine]

# Everything You Need To Know
## Keyboard Shortcut
Basic and supported keyboard shortcut :

| Name                    | Description            | Active menu  |
| :-------                | :----------------      | :-----------          
| Ctrl + Enter            | Preview                | All          |        
| Ctrl + S                | Save current file      | All          |        
| Ctrl + R                | Preview                | All          |
| Alt + D                 | Open snippets console  | Editor       |
| Ctrl + C                | Copy file/folder       | My Files     |
| Ctrl + V                | Paste file/folder      | My Files     |

## Plate-HTML
You can write HTML tags in Plate-HTML (P-HTML) format 
```html
Basic tag writing
[ ]        is equal to     <div></div>
[table ]   is equal to     <table></table>

Basic attributes and content writing
[ .my-class]
[ @element-id]
[ {background:red}]
[ "This is the content of the div"]
[
  This is also content, but without quotes
]

Advanced writing
[ .some-class @element-id .another class {
  background: red;
  padding: 1em;
} .yet-another-class {
  margin-top: 1em;
} contenteditable="true"
  This is my div
]
```

## Supported File Format
ACE editor supported file format on B-THOR : 
.js, .html, .php, .css, and .json

## Deploying
You can deploy your web app directly to your blog account hosted on Blogger :

1. Open a saved file (Yes, you need to re-open it for now)
2. Preview it once (after all dependencies are loaded)
3. Open File Info menu
4. Fill your blog name and entry ID (e.g. pacolemon, 890222087503965875)
5. Deploy (wait until you see notification "File deployed")

[tmpmachine]: http://tmpmachine.web.app
