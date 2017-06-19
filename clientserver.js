const express = require('express');

express().use(express.static(__dirname + '/build'))
  .listen(80, () => console.log('Client server up on port 80.'));
