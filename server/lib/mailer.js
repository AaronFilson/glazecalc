'use strict';

// Sends the app's email. MAIL_TRANSPORT picks how:
//   smtp  to SMTP_URL: smtps://USER:PASS@email-smtp.us-west-2.amazonaws.com:465
//         in production (Amazon SES), or smtp://localhost:1025 for Mailpit
//   file  each message as a JSON file in MAIL_DIR (the test suites read these)
//   log   printed to the console; the default outside production
// In production email is off until MAIL_TRANSPORT is set, and the routes say so.
// Settings are read when used, so tests can change them.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

let smtp = null;
let smtpUrl = null;

const transport = () => process.env.MAIL_TRANSPORT ||
  (process.env.NODE_ENV === 'production' ? null : 'log');

exports.available = () => ['smtp', 'file', 'log'].includes(transport());

/** Where links in emails point: the site's address, never the request's Host header. */
exports.appUrl = () => (process.env.APP_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://glazecalcapp.com' : 'http://localhost:3000')).replace(/\/+$/, '');

/** Sends a plain-text email. Resolves once the message has been handed over. */
exports.send = async ({ to, subject, text }) => {
  const from = process.env.MAIL_FROM || 'Glazecalc <no-reply@glazecalcapp.com>';
  const message = { from, to, subject, text };
  switch (transport()) {
  case 'smtp':
    if (!smtp || smtpUrl !== process.env.SMTP_URL) {
      smtpUrl = process.env.SMTP_URL;
      smtp = nodemailer.createTransport(smtpUrl);
    }
    await smtp.sendMail(message);
    return;
  case 'file': {
    const dir = process.env.MAIL_DIR;
    await fs.promises.mkdir(dir, { recursive: true });
    const file = path.join(dir, Date.now() + '-' + crypto.randomBytes(4).toString('hex'));
    // Renamed into place once written, so readers never see half a message.
    await fs.promises.writeFile(file + '.tmp', JSON.stringify({ ...message, date: new Date() }));
    await fs.promises.rename(file + '.tmp', file + '.json');
    return;
  }
  case 'log':
    console.log('Email to ' + to + ': ' + subject + '\n' + text);
    return;
  default:
    throw new Error('Email is not set up (MAIL_TRANSPORT)');
  }
};
