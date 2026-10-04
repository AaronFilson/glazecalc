const path = require('path');

// Production bundle: webpack minifies in production mode.
module.exports = {
  mode: 'production',
  entry: './app/js/client.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js'
  }
};
