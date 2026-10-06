// Sends the app's email. MAIL_TRANSPORT picks how:
//   smtp  to SMTP_URL: smtps://USER:PASS@email-smtp.us-west-2.amazonaws.com:465
//         in production (Amazon SES), or smtp://localhost:1025 for Mailpit
//   file  each message as a JSON file in MAIL_DIR (the test suites read these)
//   log   printed to the console; the default outside production
// In production email is off until MAIL_TRANSPORT is set, and the routes say so.
// Settings are read when used, so tests can change them.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';
import { isGuestAddress } from './email.ts';

export interface Message {
  to: string;
  subject: string;
  text: string;
}

let smtp: Transporter | null = null;
let smtpUrl: string | undefined;

const transport = (): string | null =>
  process.env.MAIL_TRANSPORT || (process.env.NODE_ENV === 'production' ? null : 'log');

export const available = (): boolean => ['smtp', 'file', 'log'].includes(transport() ?? '');

/** Where links in emails point: the site's address, never the request's Host header. */
export const appUrl = (): string =>
  (
    process.env.APP_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://glazecalcapp.com' : 'http://localhost:3000')
  ).replace(/\/+$/, '');

/** Sends a plain-text email. Resolves once the message has been handed over. */
export const send = async ({ to, subject, text }: Message): Promise<void> => {
  // Trials' placeholder addresses can never receive mail; a bounce would only
  // hurt the site's standing with its mail service.
  if (isGuestAddress(to)) throw new Error('Not sending email to a trial account');
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
      if (!dir) throw new Error('MAIL_DIR is not set');
      await fs.promises.mkdir(dir, { recursive: true });
      const file = path.join(dir, Date.now() + '-' + crypto.randomBytes(4).toString('hex'));
      // Renamed into place once written, so readers never see half a message.
      await fs.promises.writeFile(file + '.tmp', JSON.stringify({ ...message, date: new Date() }));
      await fs.promises.rename(file + '.tmp', file + '.json');
      return;
    }
    case 'log':
      // The whole message, so a developer can follow a reset link.
      console.log('Email to ' + to + ': ' + subject + '\n' + text);
      return;
    default:
      throw new Error('Email is not set up (MAIL_TRANSPORT)');
  }
};
