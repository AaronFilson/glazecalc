module.exports = exports = function(err, res) {
  // Values of the wrong type or shape (Mongoose could not cast or validate
  // them) are the request's fault, not the server's.
  if (err && (err.name === 'ValidationError' || err.name === 'CastError')) {
    return res.status(400).json({ msg: 'Some of the information sent is not valid.' });
  }
  console.log('DB error : ' + err);
  return res.status(500).json({ msg: 'Server Error' });
};
