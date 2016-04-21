'use strict';

require('localenv');

let log = require('debug')('canvas-music:server');
let express = require('express');
let path = require('path');

let server;
let app = express();

app.use('*', (req, res, next) => {
  log(`[${req.method}] => ${req.originalUrl}`);
  next();
});
app.use(express.static(path.resolve(__dirname, '../public')));

server = app.listen(process.env.HTTP_PORT, () => {
  log(`http up on port ${process.env.HTTP_PORT}`);
});