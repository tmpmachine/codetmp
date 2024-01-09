# Codetmp
Web IDE for serverless plain HTML, CSS, and JavaScript development.

## Core Features
1. Built-in [divless-HTML](#divless-html-format) format converter, write less `<div>` tags.
2. Local files editing (requires browser that supports the **File System Access API**).
3. Files stays on your browser or can synced to Google Drive. A folder title **Codetmp** will be created in your Google Drive account to store all Codetmp7 files.

![Codetmp File Manager on mobile](https://1.bp.blogspot.com/-bM8R0mX84rA/YIeA3ogISfI/AAAAAAAAPRg/QG5wtnQ5eYAjgnrW74A60-HeJDpE-I3OQCLcBGAsYHQ/s500/Screenshot_20210427-100439_Chrome.jpg)
![Codetmp Editor on mobile](https://1.bp.blogspot.com/-kDwpmyNKc9Y/YIeA3VpH3xI/AAAAAAAAPRY/2fazV8o3ccAv0eLE-SEizEgfHectiAzvQCLcBGAsYHQ/s500/Screenshot_20210427-100505_Chrome.jpg)

## Divless HTML Format 
Built-in **divless HTML** format converter. Basically it's like writing HTML tag using square brackets and without div tags. You can mix it with regular HTML.

**Enabled by default**, can be disabled from **Settings** menu.

<img src="https://1.bp.blogspot.com/-OTa_v77-Vdw/YIeA3tvJaaI/AAAAAAAAPRc/9hjd_-QPICoq8ljdGJDp3VvO3CZ1VfoqwCLcBGAsYHQ/s800/Untitled.png">

HTML tags :
```html
[]         is equal to     <div></div>
[table]    is equal to     <table></table>
[t]        is equal to     <table></table>    (shortname)
```

Attributes :
```html
[ .element-class]       <div class="element-class"></div>
[ #element-id]          <div id="element-id"></div>
[ {background:red}]     <div style="background:red;"></div>
[ {bg:red}]             <div style="background:red;"></div>   (shortname)

Note : 
Single whitespace character at the beginning is required for <div> tag.
```
HTML content :
```
[ "This is the content of the div"]
[ 'This is the content of the div']
[
  This is the content of the div
]
```
Mixed writing :

```html
[ .class-1 #element-id .class-2 {bg:red} contenteditable="true" "This is the content" .class-3 {padding:8px}
  This is the content of the div
  <small> (mixed with HTML) </small>
]

Note :
Both classes and inline styles will be concatenated into single attribute (class and style).
```

Read more at https://github.com/tmpmachine/divless-html.

## Development
There are two main directories : `/codetmp` for the IDE, and `/cpreview` for file preview (works like file hosting).

For editor-only development (`/codetmp`), simply grab a clone of this repo and open `codetmp/index.html` without local server. 

You will need local server to test file preview and accessing 3rd party APIs (Google Drive sync, deploy Firebase Hosting, Git clone). 

Developing `/cpreview` requires both projects to run on the same host or domain. The communication is done through iframes by claiming service worker registration client.

### Running and Building The Project
1. Install dependencies.
```
npm install
```
2. Serving the projects. I use `firebase-tools`, but you can use any local web server just fine. Open `firebase.dev.json` for firebase hosting configuration.
```
npm run dev
```
3. Deploying the projects to firebase (see configuration at `firebase.prod.json`) :
```
npm run deploy
```

#### Minimized Build
To build minimized files for `/codetmp` project, run :
```
node build
```
Minimized files are stored in `codetmp/deploy`.

### Features Development

#### Google Drive Synchronization
See `codetmp/js/drive.js`.

#### File Preview
See `codetmp/js/preview.js`. Codetmp7 editor use communication API and workers client claiming to allow serving `codetmp` storage files requested by `cpreview` project.

Due to recent policy updates on browser storage partitioning, this communication only possible if both `codetmp` and `cpreview` project hosted in the same domain.

#### File and Folder Management
See `codetmp/js/file-manager.js`.

#### ACE Editor
See `compoEditor.Init()`. Ace editor by Ajax.org Cloud9 Editor.


## Aknowledgements
Thanks to BrowserStack (https://www.browserstack.com/) for providing free Open source sponsorship, facilitating testing in various browsers.