const express = require('express');

let servers = [
  { port: 8201, dir: 'codetmp/', },
  { port: 8202, dir: 'cpreview/', },
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