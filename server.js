const http = require('http');
const fs = require('fs');

http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><img src="/img" style="max-width: 100%;" /></body></html>');
  } else if (req.url === '/img') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(fs.readFileSync('attached_assets/figma_v3/AI Home Screen.png'));
  }
}).listen(8080);
console.log("Listening on 8080");
