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

### Building and Running The Project
I host the project in firebase hosting, but you can run the project just fine without installing [firebase-tools](https://www.npmjs.com/package/firebase-tools). I've prepared a server setup using [express](https://www.npmjs.com/package/express).

Run below commands for initial setup and running the servers :
```
npm i
npm run setup
npm run dev
```

You should get the following:
```
Servers running at:
codetmp: http://localhost:8000/
cpreview: http://localhost:8001/
cpreview: http://localhost:8002/
```
The second cpreview server is used to preview files with a different domain. This helps with Progressive Web App (PWA) development where you may want to install the PWA in one host - meaning caching the files for offline access - while at the same time keep it available for development.

### Publishing The Project

Both **codetmp** and **cpreview** utilize service worker to enable offline access. You'll need to update the cache counter on both service workers to trigger application update on end user, otherwise they'll need to manually clear the app cache.

1. codetmp/sw.js : increase **unique numer** counter by +1 on each update on codetmp.
2. cpreview/sw.js : increase `cacheVersion` by +1 on each update on cpreview.

> Notes : Codetmp7 editor has an option to clear and update application cache in **Settings** menu.

#### Building Minimized Project

If you need a minimized version of **codetmp**, run the following :
```
npm run build
```
Minimized files are stored in `codetmp/deploy`.

**cpreview** project doesn't have minimized build, so you can publish it as is.

### Features Development
Below is the file tree that you'll most likely be working on when developing a new feature.
```
/codetmp
  /js
    /components           -> components
    /uis                  -> components UI
    /require              -> libraries
    dom-events.js         -> global events mapping
    ui.js                 -> global UI
    view-states-map.js    -> view states mapping
  environment.js
  index.js                -> main app entry
  manifest-cache.json     -> chache index
```

### How Previewing Files Works
Codetmp7 editor use communication API and workers client claiming to allow serving **codetmp** storage files requested by **cpreview** project.

Due to recent policy updates on browser storage partitioning, this communication is only possible if both **codetmp** and **cpreview** project hosted in the same domain.


## Aknowledgements
Thanks to BrowserStack (https://www.browserstack.com/) for providing free Open source sponsorship, facilitating testing in various browsers.