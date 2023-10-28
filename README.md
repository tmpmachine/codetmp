# Codetmp
Web IDE for serverless plain HTML, CSS, and JavaScript development.

## Core Features
1. Built-in [divless-HTML](#divless-html) format converter, write less `<div>` tags.
2. File synced to Google Drive (optional). A folder title `Codetmp` will be created in your Drive upon logged in. All codetmp7 editor files goes here. It's like a second storage.
3. Editing local files (experimental). Require browser that support File System Access API.

![Codetmp File Manager on mobile](https://1.bp.blogspot.com/-bM8R0mX84rA/YIeA3ogISfI/AAAAAAAAPRg/QG5wtnQ5eYAjgnrW74A60-HeJDpE-I3OQCLcBGAsYHQ/s500/Screenshot_20210427-100439_Chrome.jpg)
![Codetmp Editor on mobile](https://1.bp.blogspot.com/-kDwpmyNKc9Y/YIeA3VpH3xI/AAAAAAAAPRY/2fazV8o3ccAv0eLE-SEizEgfHectiAzvQCLcBGAsYHQ/s500/Screenshot_20210427-100505_Chrome.jpg)

## Divless HTML Format 
Built-in **divless HTML** format converter. Basically it's like writing HTML tag using square brackets and without div tags. You can mix it with regular HTML.

**Enabled by default**, can be disabled from **Settings** menu.

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
  This is also content, but without quotes and use extra spaces for readability
]

All together now :
[ .class-1 @element-id .class-2 {background:red} contenteditable="true" "This is the content" .class-3 {padding:8px}]
```

For available HTML & CSS shortnames, read more at https://github.com/tmpmachine/divless-html.

Documentation : https://github.com/tmpmachine/codetmp/wiki/Divless,-nameless-close-HTML-tag.

## Development
There are two main projects : `codetmp` for the IDE, and `cpreview` for previewing the Codetmp7 editor storage files.

For editor only development, you can simply grab a clone of this repo and open `codetmp/index.html` without local server. 

You will need local server when tinkering with 3rd party APIs. 

Testing `cpreview` project requires both project to run on the same host or domain. It's simpler to edit online using GitHub Codespaces.

### Running and Building The Project
I use Firebase hosting but you can use local server just fine. You will need to install `firebase-tools` and login using your Firebase account to deploy to Firebase hosting.
```
npm install
```
Serving `codetmp` project only (see `firebase.dev.json`) :
```
npm run dev
```
Deploying `codetmp` project only (see `firebase.prod.json`) :
```
npm run deploy
```

#### Minimized Build
To build minimize `codetmp` project, run :
```
node build
```
Minimized files are stored in `codetmp/deploy`.

### Core Features

#### Google Drive Synchronization
See `codetmp/js/drive.js`.

#### Previewing a File
See `codetmp/js/preview.js`. Codetmp7 editor use communication API and workers claiming to allow serving `codetmp` storage files requested by `cpreview` project.

Due to recent policy updates on browser storage partitioning, this communication only possible if both `codetmp` and `cpreview` project hosted in the same domain.

#### File and Folder Management
`codetmp/js/file-manager.js` and `codetmp/js/ux.js` is probably all you care about.

#### ACE Editor
See `initEditor()` method on `codetmp/js/ux.js`. Ace editor by Ajax.org Cloud9 Editor.


## Aknowledgements
Thanks to BrowserStack (https://www.browserstack.com/) for providing free Open source sponsorship that helps tseting Codetmp7 editor on Safari browser.