const express = require('express');
var clientPort = process.env.CLIENTPORT || 3000;
express().use(express.static(__dirname + '/build'))
  .listen(clientPort, () => console.log('Client server up on port' + clientPort + '.'));
