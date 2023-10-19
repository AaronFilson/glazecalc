module.exports = exports = function(id, res) {
  console.log('DB error : ' + id);
//  console.dir(res);
  return res.status(500).json({ msg: 'Server Error' });
};
