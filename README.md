# TMPmachine
A simple web development environment for those who loves prototyping with high mobility.

## Official Website
[http://tmpmachine.web.app](http://tmpmachine.web.app)


## Environment Keyboard shortcut

| Command       | Description |
| ---           | --- |
| Alt + N       | New tab |
| Alt + <       | Previous tab |
| Alt + >       | Next tab |
| Alt + D       | Toggle snippet |
| Alt + M       | Toggle my files |
| Ctrl + Enter  | Render active file tab or locked file |
| Ctrl + S      | Save current file |
| Alt + Enter   | Deploy active file tab |

## My Files Keyboard shortcut
| Command       | Description |
| ---           | --- |
| Ctrl + C      | Copy file/folder       |
| Ctrl + V      | Paste file/folder      |



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