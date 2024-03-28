const express = require('express');

let servers = [
  { port: 8000, dir: 'codetmp/', },
  { port: 8001, dir: 'cpreview/', },
  { port: 8002, dir: 'cpreview/', }, // alternative, can be used to test serve production PWA
  { port: 8003, dir: 'deploy/codetmp/', }, // minified build files
];

// Start servers
console.log('Servers running at:');
for (let server of servers) {
  let {port, dir} = server;
  let app = express();
  app.use(express.static(dir));
  app.listen(port, () => {
    console.log(`${dir}: http://localhost:${port}/`);
  });
}