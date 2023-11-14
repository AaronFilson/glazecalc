const express = require('express');
var clientPort = process.env.CLIENTPORT || 4001;
express().use(express.static(__dirname + '/build'))
  .listen(, () => console.log('Client server up on port' + clientPort + '.'));
