# Codetmp
Codetmp helps you develop JavaScript applications in the browser.

## Official Website
[http://codetmp.web.app](http://codetmp.web.app)

## Key Features
1. Lightweight.
2. Mobile friendly.
3. Files synced with Google Drive.
4. Quick prototyping with [divless-HTML](#divless-html).
5. Editing local system files (require browser that support File System Access API)

![Codetmp on mobile](https://1.bp.blogspot.com/-qHzR_-01sKs/X0DndkG-apI/AAAAAAAANR8/I2kG5Ql1eoEP0P5UaAl7pCOjPQUfWu1fwCLcBGAsYHQ/s440/1.png)

## Divless-HTML
**Divless, nameless close tag HTML** allows you to write HTML tag quickly for sandboxing activity.

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

For available HTML & CSS shortnames, read more on https://github.com/tmpmachine/divless-html.


## Contribute
You can just grab a clone of this repo and open `codetmp/index.html` without local server. You will need a local server and set your own Google Project Id to use Google products API.

### Google Drive & Blogger API
See files below :
1. codetmp/js/drive.js
2. codetmp/require/oblog.js

### Preview a File
codetmp/js/preview.js, can't explain more right now.

### File and Folder Management
codetmp/js/file-manager.js and codetmp/js/ux.js is probably all you care about.

### Code Editor shortcut or others (Ace editor)
See initEditor() method on codetmp/js/ux.js. Ace editor by Ajax.org Cloud9 Editor.
