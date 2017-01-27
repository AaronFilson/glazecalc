const express = require('express');

express().use(express.static(__dirname + '/build'))
  .listen(6000, () => console.log('Client server up on port 6000.'));
