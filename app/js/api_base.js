// The API server listens on port 4000 of whichever host served the page, so the
// same build works on localhost and in production.
module.exports = exports = window.location.protocol + '//' + window.location.hostname + ':4000';
