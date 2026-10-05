// Password reset by email, and changing the password while signed in.
//
//   POST /api/password/forgot  { email }            emails a reset link
//   POST /api/password/reset   { token, password }  sets a new password from the link
//   PUT  /api/password         { current, password } (signed in) changes it
//
// A new password signs out every device (the user's tokenVersion goes up) and
// sends a notice to the account's address.
const crypto = require('crypto');
const express = require('express');
const jsonParser = express.json();
const email = require(__dirname + '/../lib/email');
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');
const accountMail = require(__dirname + '/../lib/account_mail');
const mailer = require(__dirname + '/../lib/mailer');
const password = require(__dirname + '/../lib/password');
const limits = require(__dirname + '/../lib/rate_limit');
const PasswordReset = require(__dirname + '/../models/password_reset');
const User = require(__dirname + '/../models/user');

const RESET_MINUTES = 30;
// Requests per account per hour, on top of the per-address rate limit.
const RESETS_PER_HOUR = 3;
const SENT = 'If an account uses that email, we have sent it a link to reset the password. ' +
  'The link works for ' + RESET_MINUTES + ' minutes.';
const BAD_LINK = 'This reset link is not valid or has expired. Please ask for a new one.';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
// Mail goes out after the reply, so it never delays or fails a request.
const logMailError = (what) => (err) => console.log('Could not send the ' + what + ' email: ' + err.message);

const passwordRouter = module.exports = exports = express.Router();

passwordRouter.post('/forgot', limits.forgotPassword, jsonParser, (req, res) => {
  if (!mailer.available()) {
    return res.status(503).json({ msg: 'Password reset by email is not available yet.' });
  }
  var address = email.normalize((req.body || {}).email);
  if (!email.isValid(address)) return res.status(400).json({ msg: 'Please enter an email' });

  // The same reply whether or not the account exists, sent before looking.
  res.status(200).json({ msg: SENT });

  User.findOne({ email: address }).collation(email.collation).then((user) => {
    if (!user) return;
    var hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return PasswordReset.countDocuments({ userId: user._id, createdAt: { $gt: hourAgo } }).then((recent) => {
      if (recent >= RESETS_PER_HOUR) return;
      var token = crypto.randomBytes(32).toString('base64url');
      // Only the newest link works. Older ones are marked used rather than
      // deleted, so they still count towards the hourly limit until they expire.
      return cancelLinks(user._id)
        .then(() => PasswordReset.create({
          userId: user._id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000)
        }))
        .then(() => accountMail.sendReset(user.email, token, RESET_MINUTES));
    });
  }).catch(logMailError('password reset'));
});

passwordRouter.post('/reset', limits.resetPassword, jsonParser, (req, res) => {
  var body = req.body || {};
  if (typeof body.token !== 'string' || !body.token) return res.status(400).json({ msg: BAD_LINK });
  var problem = password.problem(body.password);
  if (problem) return res.status(400).json({ msg: problem });

  // Marking the request used in the same step makes each link work only once.
  var now = new Date();
  PasswordReset.findOneAndUpdate(
    { tokenHash: hashToken(body.token), usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } }
  ).then((reset) => {
    if (!reset) return res.status(400).json({ msg: BAD_LINK });
    return User.findById(reset.userId).then((user) => {
      if (!user) return res.status(400).json({ msg: BAD_LINK });
      return setPassword(user, body.password).then(() => {
        res.status(200).json({ msg: 'Your password has been changed. Please sign in with your new password.' });
      });
    });
  }).catch((err) => handleDBError(err, res));
});

passwordRouter.put('/', limits.changePassword, jwtAuth, jsonParser, (req, res) => {
  var body = req.body || {};
  var problem = password.problem(body.password);
  if (problem) return res.status(400).json({ msg: problem });

  User.findById(req.user._id).then((user) => {
    if (!user) return res.status(404).json({ msg: 'No user with that id' });
    return password.matches(body.current, user.password).then((ok) => {
      // 400 rather than 401: the user is signed in, and a 401 would sign them out.
      if (!ok) return res.status(400).json({ msg: 'Your current password is not correct.' });
      return setPassword(user, body.password).then(() => {
        // A new token keeps this device signed in; every other one is signed out.
        res.status(200).json({ msg: 'Your password has been changed.', token: user.generateToken(), email: user.email });
      });
    });
  }).catch((err) => handleDBError(err, res));
});

// Saves a new password, signs out every device, cancels open reset links and
// tells the account's owner.
function setPassword(user, newPassword) {
  return password.hash(newPassword).then((hash) => {
    user.password = hash;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    return user.save();
  }).then(() => cancelLinks(user._id)).then(() => {
    accountMail.sendChanged(user.email).catch(logMailError('password changed'));
  });
}

function cancelLinks(userId) {
  return PasswordReset.updateMany({ userId, usedAt: null }, { $set: { usedAt: new Date() } });
}
