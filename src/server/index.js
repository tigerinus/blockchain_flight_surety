
const http = require('http');
const app = require('./server');

const server = http.createServer(app)
let currentApp = app

if (module.hot) {
 module.hot.accept('./server', () => {
  server.removeListener('request', currentApp)
  server.on('request', app)
  currentApp = app
 })
}
