# Codetmp
Codetmp is all about :
1. Quick HTML, CSS, and JS sandboxing
2. Autosync with Google Drive / OS-like file management
3. Lightweight
4. Mobile friendly

![Codetmp on mobile](https://1.bp.blogspot.com/-qHzR_-01sKs/X0DndkG-apI/AAAAAAAANR8/I2kG5Ql1eoEP0P5UaAl7pCOjPQUfWu1fwCLcBGAsYHQ/s440/1.png)

## The Mechanism
Codetmp is replacing all of :
- `<script src="*location*"></script>` with `<script> *... code ...* </script>`
- `<link href="*location*" rel="stylesheet"/>` with `<style> *... style ...* </style>`
- Divless, nameless close tag HTML with HTML tags.
- special HTML template code (TBA)

All in all, it's just bunch of regex working behind the scene.

## Official Website
[http://codetmp.web.app](http://codetmp.web.app)

## Divless, nameless close tag HTML
This feature allows you to write quickly for sandboxing activity (pron to error) :
1. write HTML tags with minimum amount of brackets
2. write div tag without a name
3. nameless close tag, just don't forget the ] to close the tag
4. write ID with @ prefix
5. write class with . (dot) prefix
6. write inline styles within {} e.g. {background:red;padding:8px 16px}
7. write other attributes as usual
8. write element textContent with "" or ''

You can write 5 and 6 at random order and they will appear as one style/class attribue from left to right occurrences.

### FAST!
It's colorless and difficult to track unclosed tag, but you will soon realize the speed you've gain from typing this type of HTML tag. At the time I update this readme, I've written for more than 2 years of divless HTML tag and it's awesome!

<img src="https://1.bp.blogspot.com/-lj3s6crbuNA/XtNeSUSPT4I/AAAAAAAAMR8/Ky9au6E2NQoys7mKxBkngrpnv0wTDVdQACK4BGAsYHg/s820/Screenshot%2B2020-05-31%2Bat%2B2.34.38%2BPM.png">

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
  This is also content, but without quotes and extra spaces for readability
]

Advanced writing
[ .class-1 @element-id .class-2 {background:red} contenteditable="true" "This is the content" .class-3 {padding:8px}]
```

## HTML Shortname
| HTML Tag | Shortname |
| --- | --- |
| div	 |  |
| video	 | v |
| a	 | a |
| audio	 | au |
| button	 | btn |
| canvas	 | can |
| input	 | in |
| span	 | s |
| label	 | l |
| textarea	 | t |
| select	 | sel |
| option	 | opt |

## CSS Shortname
| CSS Property | Shortname |
| --- | --- |
| padding	 | p |
| padding-left	 | pl |
| padding-top	 | pt |
| padding-right	 | pr |
| padding-bottom	 | pb |
| margin	 | m |
| margin-left	 | ml |
| margin-top	 | mt |
| margin-right	 | mr |
| margin-bottom	 | mb |
| text-decoration	 | td |
| text-transform	 | tt |
| font-family	 | ff |
| font-size	 | fs |
| font-style	 | ft |
| font-weight	 | fw |
| text-align	 | ta |
| white-space	 | ws |
| float	 | f |
| overflow	 | ov |
| min-width	 | mw |
| min-height	 | mh |
| max-width	 | Mw |
| max-height	 | Mh |
| width	 | w |
| height	 | h |
| display	 | d |
| visibility	 | vis |
| opacity	 | op |
| grid-template-rows	 | rows |
| grid-template-columns	 | cols |
| grid-gap	 | gap |
| grid-column-start	 | col-start |
| grid-column-end	 | col-end |
| grid-row-start	 | row-start |
| grid-row-end	 | row-end |
| color	 | col |
| background	 | bg |
| border-radius	 | rad |
| border	 | bor |
| position	 | pos |
| z-index	 | z |
| top	 | t |
| left	 | l |
| right	 | r |
| bottom	 | b |
| line-height	 | lh |


## Contribute
You can just grab a clone of this repo and open `codetmp/index.html` without local server.

### Google Drive Sync
The token is obtained by codetmp/require/auth0.js, everything else about synchronization is on codetmp/js/drive.js.

### Preview a File
codetmp/js/preview.js, can't explain more right now.

### File and Folder Management
codetmp/js/file-manager.js and codetmp/js/ux.js is probably all you care about.

### Code Editor shortcut or others (Ace editor)
See initEditor() method on codetmp/js/ux.js. Ace editor by Ajax.org Cloud9 Editor.
