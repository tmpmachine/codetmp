// var opn = require('open');

// opens the url in the default browser
// opn('http://sindresorhus.com');

// specify the app to open in
// console.log(require('os').type())
// opn('http://sindresorhus.com', {app: 'chrome'});
l = require('child_process').spawn('builder.js')
L = console.log
L(l)
// .spawn('../index.html');
// require('child_process').spawn('browser', ['https://google.com']);
// require("openurl").open("http://stackoverflow.com/questions/8500326/how-to-use-nodejs-to-open-default-browser-and-navigate-to-a-specific-url")