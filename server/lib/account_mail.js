'use strict';

// The text of the emails about an account's password.
const mailer = require(__dirname + '/mailer');

const signature = () => '\n-- \nGlazecalc, ' + mailer.appUrl() + '\n';

exports.sendReset = (to, token, minutes) => mailer.send({
  to,
  subject: 'Reset your Glazecalc password',
  text: 'Someone (hopefully you) asked to reset the password for the Glazecalc account ' + to + '.\n\n' +
    'To choose a new password, open this link within ' + minutes + ' minutes:\n\n' +
    // The token is after the #, so it stays in the browser: it never reaches
    // the server's logs or another site's Referer header.
    mailer.appUrl() + '/#/reset?token=' + token + '\n\n' +
    'The link works once. If you did not ask for this, ignore this email; your password stays the same.\n' +
    signature()
});

exports.sendChanged = (to) => mailer.send({
  to,
  subject: 'Your Glazecalc password was changed',
  text: 'The password for the Glazecalc account ' + to + ' was just changed, and every device that was ' +
    'signed in has been signed out.\n\n' +
    'If this was you, there is nothing else to do. If not, reset your password right away at ' +
    mailer.appUrl() + '/#/forgot\n' +
    signature()
});
