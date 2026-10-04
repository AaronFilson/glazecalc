const zeroBuffer = require(__dirname + '/zero_buffer');

module.exports = exports = (req, res, next) => {
  try {
    var authString = req.headers.authorization;
    var base64String = authString.split(' ')[1];
    var authBuf = Buffer.from(base64String, 'base64');
    var utf8AuthString = authBuf.toString();
    zeroBuffer(authBuf);

    // Only the first colon separates the email; passwords may contain colons.
    var colon = utf8AuthString.indexOf(':');
    var email = utf8AuthString.slice(0, colon);
    var password = utf8AuthString.slice(colon + 1);
    if (colon > 0 && password.length) {
      req.basicHTTP = { email: email, password: password };
      return next();
    }
  } catch (e) {
    // A missing or malformed header falls through to the 401 below.
  }
  return res.status(401).json({ msg: 'could not authenticate user' });
};
