# TMPmachine
A simple web development environment for those who loves prototyping with high mobility.

## Official Website
[http://tmpmachine.web.app](http://tmpmachine.web.app)

## Divless/Close tagless-HTML
The main reason TMPmachine exists is that I personally hate the way HTML tag is written, especially the div tag. Here, you can write HTML tags without the closing tag. Keep in mind that it will be difficult to tract unclosed tag. 
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
  This is also content, but without quotes and extra spaces
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
