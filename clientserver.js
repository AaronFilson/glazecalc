const express = require('express');

express().use(express.static(__dirname + '/build'))
  .listen(4001, () => console.log('Client server up on port 4001.'));
