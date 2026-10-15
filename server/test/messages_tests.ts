import { MESSAGES, type MessageCode, say, textOf } from '../lib/messages.ts';
import { expect } from './support/app.ts';

// What the server tells people: a code the app can translate, and English text.
describe('messages', () => {
  it('should give every code English text, with its values filled in', () => {
    const params = { minutes: 30, hours: 24, limit: 25, label: 'recipe', palettes: 'tenmoku, ash', most: 500 };
    for (const code of Object.keys(MESSAGES) as MessageCode[]) {
      const text = textOf(code, params);
      expect(text, code).to.be.a('string').and.not.equal('');
      expect(text, code).not.to.include('undefined');
    }
  });

  it('should send the code, the text and any values', () => {
    expect(say('trial-limit', { limit: 25, label: 'recipe' })).to.eql({
      code: 'trial-limit',
      msg: 'A trial can keep up to 25 recipes. Create a free account to save more.',
      params: { limit: 25, label: 'recipe' }
    });
    // The kind of record is a code, which each message words its own way.
    expect(say('record-not-found', { label: 'firing' }).msg).to.equal('No firing with that id');
    expect(say('trial-limit', { limit: 25, label: 'trash' }).msg).to.equal(
      'A trial can keep up to 25 items in the trash. Create a free account to save more.'
    );
    expect(say('email-required', undefined, { field: 'email' })).to.eql({
      code: 'email-required',
      msg: 'Please enter an email',
      field: 'email'
    });
  });
});

describe('account emails', () => {
  it('should write in the account language, and in English where there is no translation', async () => {
    const accountMail = await import('../lib/account_mail.ts');
    const mail = await import('./support/mail.ts');
    const address = 'language-' + Date.now() + '@test.com';
    await accountMail.sendReset(address, 'abc123', 30, 'xx');
    await accountMail.sendChanged(address);
    const [reset, changed] = await mail.waitFor(address, 2);
    expect(reset!.subject).to.equal('Reset your Glazecalc password');
    expect(reset!.text).to.include('open this link within 30 minutes');
    expect(mail.tokenIn(reset!)).to.equal('abc123');
    expect(changed!.subject).to.equal('Your Glazecalc password was changed');
    expect(changed!.text).to.include('/forgot');
  });

  it('should write to an account in its own language, linking its pages in that language', async () => {
    const accountMail = await import('../lib/account_mail.ts');
    const mail = await import('./support/mail.ts');
    const address = 'deutsch-' + Date.now() + '@test.com';
    await accountMail.sendReset(address, 'abc123', 30, 'de');
    await accountMail.sendChanged(address, 'pt-PT');
    const [reset, changed] = await mail.waitFor(address, 2);
    expect(reset!.subject).to.equal('Passwort für Glazecalc zurücksetzen');
    expect(reset!.text).to.include('innerhalb von 30 Minuten');
    expect(reset!.text).to.include('/de/reset#token=abc123');
    expect(changed!.subject).to.equal('A sua palavra-passe do Glazecalc foi alterada');
    expect(changed!.text).to.include('/pt-PT/forgot');
  });

  it('should keep emails in the order they were sent, even within a millisecond', async () => {
    const mailer = await import('../lib/mailer.ts');
    const mail = await import('./support/mail.ts');
    const address = 'order-' + Date.now() + '@test.com';
    const subjects = [...Array(20).keys()].map((i) => 'Message ' + i);
    // Started together, so they share a millisecond however fast the disk is.
    await Promise.all(subjects.map((subject) => mailer.send({ to: address, subject, text: '' })));
    const sent = await mail.waitFor(address, subjects.length);
    expect(sent.map((message) => message.subject)).to.eql(subjects);
  });

  it('should give every translation the values and signature of the English', async () => {
    const { RESET, CHANGED, DELETED } = await import('../lib/account_mail.ts');
    const values = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const emails of [RESET, CHANGED, DELETED]) {
      for (const [language, email] of Object.entries(emails)) {
        expect(values(email.text), language).to.eql(values(emails['en']!.text));
        expect(email.text, language).to.match(/\n-- \nGlazecalc, \{app\}\n$/);
        expect(email.subject, language).to.include('Glazecalc');
      }
    }
  });

  it('should have translations made from the English as it is', async () => {
    // Changed the English of an email? Have it translated again in every
    // language (docs/translations/README.md), then put its new fingerprint here.
    const { RESET, CHANGED, DELETED } = await import('../lib/account_mail.ts');
    const { fingerprint } = await import('../../scripts/i18n-fingerprints.mjs');
    expect(fingerprint(JSON.stringify([RESET['en'], CHANGED['en']]))).to.equal('xj1yoc');
    // English only so far: the next translation wave adds the others.
    expect(fingerprint(JSON.stringify(DELETED['en']))).to.equal('13s4itm');
  });

  it('should give the two-step sign-in notices their values and signature', async () => {
    const { MFA_ADDED, MFA_REMOVED, RECOVERY_USED, RECOVERY_NEW, MFA_OFF, MFA_CLEAR_NOTICE } =
      await import('../lib/account_mail.ts');
    const values = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
    expect(values(MFA_ADDED['en']!.text)).to.eql(['account', 'app', 'forgot', 'method']);
    expect(values(MFA_REMOVED['en']!.text)).to.eql(['account', 'app', 'forgot', 'method']);
    expect(values(RECOVERY_USED['en']!.text)).to.eql(['account', 'app', 'forgot', 'left', 'page']);
    expect(values(RECOVERY_NEW['en']!.text)).to.eql(['account', 'app', 'forgot']);
    expect(values(MFA_OFF['en']!.text)).to.eql(['account', 'app', 'forgot']);
    expect(values(MFA_CLEAR_NOTICE['en']!.text)).to.eql(['account', 'app', 'date', 'forgot']);
    for (const emails of [MFA_ADDED, MFA_REMOVED, RECOVERY_USED, RECOVERY_NEW, MFA_OFF, MFA_CLEAR_NOTICE]) {
      expect(emails['en']!.text).to.match(/\n-- \nGlazecalc, \{app\}\n$/);
      expect(emails['en']!.subject).to.include('Glazecalc');
    }
  });

  it('should have the two-step sign-in notices translated from the English as it is', async () => {
    // English only so far (docs/mfa-plan.md, item 19): the next wave adds the others.
    const m = await import('../lib/account_mail.ts');
    const { fingerprint } = await import('../../scripts/i18n-fingerprints.mjs');
    const english = [m.MFA_ADDED, m.MFA_REMOVED, m.RECOVERY_USED, m.RECOVERY_NEW, m.METHODS].map((e) => e['en']);
    expect(fingerprint(JSON.stringify(english))).to.equal('g444iu');
    expect(fingerprint(JSON.stringify([m.MFA_OFF['en'], m.MFA_CLEAR_NOTICE['en']]))).to.equal('18fasis');
  });

  it('should give the unfinished second step notice its values and signature', async () => {
    const { SECOND_STEP_UNFINISHED } = await import('../lib/account_mail.ts');
    const { fingerprint } = await import('../../scripts/i18n-fingerprints.mjs');
    const email = SECOND_STEP_UNFINISHED['en']!;
    const values = [...new Set([...email.text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
    expect(values).to.eql(['account', 'app', 'forgot']);
    expect(email.text).to.match(/\n-- \nGlazecalc, \{app\}\n$/);
    expect(email.subject).to.include('Glazecalc');
    // English only so far (docs/mfa-plan.md, item 19): the next wave adds the others.
    expect(fingerprint(JSON.stringify(email))).to.equal('153r2vu');
  });
});

describe('two-step sign-in notices', () => {
  const account = (label: string, extra: Record<string, unknown> = {}) => ({
    email: label + '-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '@test.com',
    ...extra
  });

  it('should send each of the four notices', async () => {
    const accountMail = await import('../lib/account_mail.ts');
    const mail = await import('./support/mail.ts');
    const user = account('notices');
    accountMail.noticeMfa(user, { kind: 'added', method: { kind: 'totp' } });
    await mail.waitFor(user.email, 1);
    accountMail.noticeMfa(user, { kind: 'removed', method: { kind: 'passkey', name: 'Work laptop' } });
    await mail.waitFor(user.email, 2);
    accountMail.noticeMfa(user, { kind: 'recovery-used', left: 7 });
    await mail.waitFor(user.email, 3);
    accountMail.noticeMfa(user, { kind: 'recovery-new' });
    const [added, removed, used, made] = await mail.waitFor(user.email, 4);
    expect(added!.subject).to.equal('A sign-in step was added to your Glazecalc account');
    expect(added!.text).to.include('as a second step for signing in: an authenticator app.');
    expect(added!.text).to.include(user.email);
    expect(added!.text).to.include('https://glazecalc.test/forgot');
    expect(removed!.subject).to.equal('A sign-in step was removed from your Glazecalc account');
    expect(removed!.text).to.include('the passkey "Work laptop".');
    expect(used!.subject).to.equal('A recovery code was used on your Glazecalc account');
    expect(used!.text).to.include('Unused codes left: 7.');
    expect(used!.text).to.include('https://glazecalc.test/account');
    expect(made!.subject).to.equal('New recovery codes for your Glazecalc account');
    expect(made!.text).to.include('The old codes no longer work.');
    for (const message of [added, removed, used, made]) expect(message!.text).to.not.include('{');
  });

  it("should link the account's pages in its language, in English text for now", async () => {
    const accountMail = await import('../lib/account_mail.ts');
    const mail = await import('./support/mail.ts');
    const user = account('notice-de', { preferences: { language: 'de' } });
    accountMail.noticeMfa(user, { kind: 'recovery-used', left: 1 });
    const [used] = await mail.waitFor(user.email, 1);
    expect(used!.subject).to.equal('A recovery code was used on your Glazecalc account');
    expect(used!.text).to.include('https://glazecalc.test/de/account');
  });

  it("should keep a passkey's name to one plain line", async () => {
    const { methodIn } = await import('../lib/account_mail.ts');
    expect(methodIn({ kind: 'passkey', name: 'Phone\r\nBcc: x@y.z' })).to.equal('the passkey "Phone Bcc: x@y.z"');
    expect(methodIn({ kind: 'passkey', name: '$& $1' })).to.equal('the passkey "$& $1"');
    expect(methodIn({ kind: 'totp' }, 'xx')).to.equal('an authenticator app');
  });

  it('should send one notice when two-step sign-in is turned off altogether', async () => {
    const accountMail = await import('../lib/account_mail.ts');
    const mail = await import('./support/mail.ts');
    const user = account('notice-off');
    accountMail.noticeMfa(user, { kind: 'mfa-off' });
    const [off] = await mail.waitFor(user.email, 1);
    expect(off!.subject).to.equal('Two-step sign-in was turned off on your Glazecalc account');
    expect(off!.text).to.include('Signing in now needs only the password.');
    expect(off!.text).to.include('https://glazecalc.test/forgot');
  });

  it("should send the 7-day notice with the date, privacy@ and the reset link, the copy's label in its subject", async () => {
    const accountMail = await import('../lib/account_mail.ts');
    const mail = await import('./support/mail.ts');
    const user = account('clear-notice');
    const label = process.env.SITE_LABEL;
    process.env.SITE_LABEL = 'staging';
    try {
      await accountMail.sendMfaClearNotice(user.email, new Date('2026-10-21T23:30:00Z'), 'de');
    } finally {
      if (label === undefined) delete process.env.SITE_LABEL;
      else process.env.SITE_LABEL = label;
    }
    const [notice] = await mail.waitFor(user.email, 1);
    expect(notice!.subject).to.equal('[Staging] Two-step sign-in on your Glazecalc account will be turned off');
    expect(notice!.text).to.include(
      'will be turned off on 21 October 2026 unless you write to privacy@glazecalcapp.com'
    );
    expect(notice!.text).to.include('https://glazecalc.test/de/forgot');
    expect(notice!.text).to.include(user.email);
    expect(notice!.text).to.not.include('{');
  });

  it('should reject from sendMfaClearNotice when the mail cannot go, so the script can say so', async () => {
    const accountMail = await import('../lib/account_mail.ts');
    const dir = process.env.MAIL_DIR;
    delete process.env.MAIL_DIR;
    try {
      let failed = false;
      await accountMail.sendMfaClearNotice(account('clear-fails').email, new Date()).catch(() => (failed = true));
      expect(failed).to.equal(true);
    } finally {
      process.env.MAIL_DIR = dir;
    }
  });

  it('should send nothing to an unconfirmed address or a trial', async () => {
    const accountMail = await import('../lib/account_mail.ts');
    const mail = await import('./support/mail.ts');
    const unconfirmed = account('notice-unconfirmed', { emailUnverified: true });
    const trial = account('notice-trial', { guest: true });
    const placeholder = { email: 'notice-' + Date.now() + '@guest.invalid' };
    for (const user of [unconfirmed, trial, placeholder]) accountMail.noticeMfa(user, { kind: 'recovery-new' });
    await mail.settle();
    expect(mail.to(unconfirmed.email)).to.eql([]);
    expect(mail.to(trial.email)).to.eql([]);
    expect(mail.to(placeholder.email)).to.eql([]);
  });

  it('should never throw, even when the email cannot be sent', async () => {
    const accountMail = await import('../lib/account_mail.ts');
    const mail = await import('./support/mail.ts');
    const transport = process.env.MAIL_TRANSPORT;
    const dir = process.env.MAIL_DIR;
    try {
      // File transport with no folder: sending rejects.
      delete process.env.MAIL_DIR;
      expect(() => accountMail.noticeMfa(account('notice-fails'), { kind: 'recovery-new' })).to.not.throw();
      // Email off altogether.
      process.env.MAIL_TRANSPORT = 'none';
      expect(() => accountMail.noticeMfa(account('notice-off'), { kind: 'recovery-new' })).to.not.throw();
      // Not even for a broken user.
      expect(() =>
        accountMail.noticeMfa(null as unknown as { email: string }, { kind: 'recovery-new' })
      ).to.not.throw();
      await mail.settle();
    } finally {
      process.env.MAIL_TRANSPORT = transport;
      process.env.MAIL_DIR = dir;
    }
  });
});
