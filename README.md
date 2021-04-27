# Codetmp
Codetmp helps you develop JavaScript applications in the browser.

## Official Website
[https://codetmp.web.app](https://codetmp.web.app)

## Key Features
1. Lightweight.
2. Mobile friendly.
3. Files synced with Google Drive.
4. Quick prototyping with [divless-HTML](#divless-html).
5. Editing local system files (require browser that support File System Access API)

![Codetmp File Manager on mobile](https://1.bp.blogspot.com/-bM8R0mX84rA/YIeA3ogISfI/AAAAAAAAPRg/QG5wtnQ5eYAjgnrW74A60-HeJDpE-I3OQCLcBGAsYHQ/s500/Screenshot_20210427-100439_Chrome.jpg)
![Codetmp Editor on mobile](https://1.bp.blogspot.com/-kDwpmyNKc9Y/YIeA3VpH3xI/AAAAAAAAPRY/2fazV8o3ccAv0eLE-SEizEgfHectiAzvQCLcBGAsYHQ/s500/Screenshot_20210427-100505_Chrome.jpg)

## Divless-HTML
**Divless, nameless close tag HTML** allows you to write HTML tag quickly for sandboxing activity.

<img src="https://1.bp.blogspot.com/-OTa_v77-Vdw/YIeA3tvJaaI/AAAAAAAAPRc/9hjd_-QPICoq8ljdGJDp3VvO3CZ1VfoqwCLcBGAsYHQ/s800/Untitled.png">

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


## Aknowledgements
Thanks to BrowserStack (https://www.browserstack.com/) for providing free Open source sponsorship that helps development of Codetmp.
