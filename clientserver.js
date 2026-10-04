const express = require('express');
var clientPort = process.env.CLIENTPORT || 3000;
// Serves the Angular build from 'npm run build'.
express().use(express.static(__dirname + '/dist/glazecalc/browser'))
  .listen(clientPort, () => console.log('Client server up on port ' + clientPort + '.'));
