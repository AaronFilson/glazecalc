import { MESSAGES, type MessageCode, say, textOf } from '../lib/messages.ts';
import { expect } from './support/app.ts';

// What the server tells people: a code the app can translate, and English text.
describe('messages', () => {
  it('should give every code English text, with its values filled in', () => {
    const params = {
      minutes: 30,
      hours: 24,
      limit: 25,
      label: 'recipe',
      palettes: 'tenmoku, ash',
      most: 500,
      wait: 'hour',
      provider: 'google',
      choices: '7, 30, 90, 365',
      count: 2,
      skipped: 1,
      kind: 'recipe',
      title: 'Celadon',
      named: 'yes',
      fields: 'title, notes',
      names: 'Silica, Whiting',
      made: 2,
      notMade: 1,
      log: 'Cone 6 glaze',
      logNamed: 'yes'
    };
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

  it('should write a Romanian count as Romanian does: 1 zi, 2 to 19 zile, and de from 20 on', async () => {
    const { counted } = await import('../lib/account_mail.ts');
    const days = [1, 2, 7, 19, 20, 30, 90, 100, 101, 119, 120].map((n) => counted('ro', 'days', n));
    expect(days).to.eql([
      '1 zi',
      '2 zile',
      '7 zile',
      '19 zile',
      '20 de zile',
      '30 de zile',
      '90 de zile',
      '100 de zile',
      '101 zile',
      '119 zile',
      '120 de zile'
    ]);
    expect([1, 2, 24].map((n) => counted('ro', 'hours', n))).to.eql(['1 oră', '2 ore', '24 de ore']);
    // Every other language writes its own unit after the bare number.
    expect(counted('en', 'days', 30)).to.equal(30);
    expect(counted('de', 'hours', 24)).to.equal(24);
  });

  it('should fill the Romanian emails with whole counts, and the English with numbers', async () => {
    const accountMail = await import('../lib/account_mail.ts');
    const mail = await import('./support/mail.ts');
    const address = 'romana-' + Date.now() + '@test.com';
    await accountMail.sendDeleted(address, 'ro');
    await accountMail.sendVerify(address, 'abc123', 24, 'ro');
    await accountMail.sendConfirmChange(address, 'abc123', 2, 'ro');
    const connection = { name: 'App', loopback: false, selfDescribed: false, createdAt: new Date() };
    await accountMail.sendConnectionMade(address, { ...connection, writeDays: 90 }, 'ro');
    await accountMail.sendConnectionMade(address, { ...connection, writeDays: 7 }, 'ro');
    const [deleted, verify, change, ninety, seven] = await mail.waitFor(address, 5);
    expect(deleted!.text).to.include('în cel mult 30 de zile.');
    expect(verify!.text).to.include('în următoarele 24 de ore:');
    expect(change!.text).to.include('în următoarele 2 ore:');
    expect(ninety!.text).to.include('timp de 90 de zile,');
    expect(seven!.text).to.include('timp de 7 zile,');

    const english = 'english-' + Date.now() + '@test.com';
    await accountMail.sendDeleted(english);
    await accountMail.sendVerify(english, 'abc123', 24, 'xx');
    const [gone, link] = await mail.waitFor(english, 2);
    expect(gone!.text).to.include('within 30 days.');
    expect(link!.text).to.include('within 24 hours:');
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

  it('should set an email in a right-to-left language right to left, line by line, and others as they are', async () => {
    const accountMail = await import('../lib/account_mail.ts');
    const mail = await import('./support/mail.ts');
    const RLM = String.fromCharCode(0x200f);
    const address = 'arabic-' + Date.now() + '@test.com';
    await accountMail.sendReset(address, 'abc123', 30, 'ar');
    await accountMail.sendReset(address, 'abc123', 30, 'de');
    await accountMail.sendChanged(address, 'hi');
    await accountMail.sendChanged(address, 'ur');
    await accountMail.sendChanged(address, 'bn');
    await accountMail.sendChanged(address, 'ta');
    await accountMail.sendChanged(address, 'mr');
    await accountMail.sendChanged(address, 'kn');
    await accountMail.sendChanged(address, 'te');
    await accountMail.sendChanged(address, 'gu');
    await accountMail.sendChanged(address, 'ml');
    await accountMail.sendChanged(address, 'pa');
    await accountMail.sendChanged(address, 'or');
    await accountMail.sendChanged(address, 'ne');
    await accountMail.sendChanged(address, 'si');
    const [
      arabic,
      german,
      hindi,
      urdu,
      bengali,
      tamil,
      marathi,
      kannada,
      telugu,
      gujarati,
      malayalam,
      punjabi,
      odia,
      nepali,
      sinhala
    ] = await mail.waitFor(address, 15);
    expect(arabic!.subject).to.equal(RLM + accountMail.RESET['ar']!.subject);
    const lines = arabic!.text.split('\n');
    // Each line of text starts right to left, even one that starts with an address or a link.
    for (const line of lines.filter((line) => line.trim() && line !== '-- ')) {
      expect(line.startsWith(RLM), line).to.equal(true);
    }
    expect(arabic!.text).to.include(address);
    expect(lines).to.include(RLM + 'https://glazecalc.test/ar/reset#token=abc123');
    // The signature's line stays as mail programs know it, and empty lines stay empty.
    expect(arabic!.text).to.include('\n\n-- \n' + RLM);
    expect(mail.tokenIn(arabic!)).to.equal('abc123');
    // Urdu runs right to left too, in its own words.
    expect(urdu!.subject).to.equal(RLM + accountMail.CHANGED['ur']!.subject);
    // German and the Indic languages run left to right, as they are.
    for (const ltr of [
      german!,
      hindi!,
      bengali!,
      tamil!,
      marathi!,
      kannada!,
      telugu!,
      gujarati!,
      malayalam!,
      punjabi!,
      odia!,
      nepali!,
      sinhala!
    ]) {
      expect(ltr.subject + ltr.text).not.to.include(RLM);
    }
    expect(hindi!.subject).to.equal(accountMail.CHANGED['hi']!.subject);
    expect(bengali!.subject).to.equal(accountMail.CHANGED['bn']!.subject);
    expect(tamil!.subject).to.equal(accountMail.CHANGED['ta']!.subject);
    expect(marathi!.subject).to.equal(accountMail.CHANGED['mr']!.subject);
    expect(kannada!.subject).to.equal(accountMail.CHANGED['kn']!.subject);
    expect(telugu!.subject).to.equal(accountMail.CHANGED['te']!.subject);
    expect(gujarati!.subject).to.equal(accountMail.CHANGED['gu']!.subject);
    expect(malayalam!.subject).to.equal(accountMail.CHANGED['ml']!.subject);
    expect(punjabi!.subject).to.equal(accountMail.CHANGED['pa']!.subject);
    expect(odia!.subject).to.equal(accountMail.CHANGED['or']!.subject);
    expect(nepali!.subject).to.equal(accountMail.CHANGED['ne']!.subject);
    expect(sinhala!.subject).to.equal(accountMail.CHANGED['si']!.subject);
    // Their own words, not the English fallback.
    for (const code of ['te', 'gu', 'ml', 'pa', 'or', 'ne', 'si']) {
      expect(accountMail.CHANGED[code]!.subject, code).not.to.equal(accountMail.CHANGED['en']!.subject);
    }
    expect(accountMail.inDirection({ to: 'a@b.c', subject: 'S', text: 'x\n\ny\n-- \nz\n' }, 'ar-XD').text).to.equal(
      RLM + 'x\n\n' + RLM + 'y\n-- \n' + RLM + 'z\n'
    );
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
    // Translated in a later wave than the two above, so fingerprinted on its own.
    expect(fingerprint(JSON.stringify(DELETED['en']))).to.equal('13s4itm');
  });

  it('should give the notice after a password reset its values, signature and English', async () => {
    const { RESET_STOPPED } = await import('../lib/account_mail.ts');
    const { fingerprint } = await import('../../scripts/i18n-fingerprints.mjs');
    const email = RESET_STOPPED['en']!;
    const values = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
    expect(values(email.opening)).to.eql(['account']);
    expect(values(email.tokens)).to.eql(['count', 'page']);
    expect(values(email.providers)).to.eql(['page', 'providers']);
    expect(values(email.shareLinks)).to.eql([]);
    expect(values(email.closing)).to.eql(['app', 'forgot']);
    expect(email.closing).to.match(/\n-- \nGlazecalc, \{app\}\n$/);
    expect(email.subject).to.include('Glazecalc');
    // English only so far: the next wave translates it, and fingerprints it here.
    expect(fingerprint(JSON.stringify(email))).to.equal('1ee11zm');
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

  it('should give the connected app notice its values, signature and English', async () => {
    const { CONNECTION_MADE } = await import('../lib/account_mail.ts');
    const { fingerprint } = await import('../../scripts/i18n-fingerprints.mjs');
    const email = CONNECTION_MADE['en']!;
    const values = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
    expect(values(email.opening)).to.eql(['account', 'date', 'time']);
    expect(values(email.named)).to.eql(['name']);
    for (const part of [email.checked, email.answerAt, email.loopback]) expect(values(part)).to.eql(['host']);
    expect(values(email.selfDescribed)).to.eql([]);
    expect(values(email.read)).to.eql([]);
    expect(values(email.write)).to.eql(['days']);
    expect(values(email.closing)).to.eql(['app', 'forgot', 'page']);
    expect(email.closing).to.match(/\n-- \nGlazecalc, \{app\}\n$/);
    expect(email.subject).to.include('Glazecalc');
    // English only so far: the next wave translates it, and fingerprints it here.
    expect(fingerprint(JSON.stringify(email))).to.equal('165ly6s');
  });

  it('should give the unfinished second step notice its values and signature', async () => {
    const { SECOND_STEP_UNFINISHED } = await import('../lib/account_mail.ts');
    const { fingerprint } = await import('../../scripts/i18n-fingerprints.mjs');
    const email = SECOND_STEP_UNFINISHED['en']!;
    const values = [...new Set([...email.text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
    expect(values).to.eql(['account', 'app', 'forgot']);
    expect(email.text).to.match(/\n-- \nGlazecalc, \{app\}\n$/);
    expect(email.subject).to.include('Glazecalc');
    // The translations were made from this English: a change to it needs them done again.
    expect(fingerprint(JSON.stringify(email))).to.equal('ccjhde');
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

  it("should write in the account's language and link its pages in that language", async () => {
    const accountMail = await import('../lib/account_mail.ts');
    const mail = await import('./support/mail.ts');
    const user = account('notice-de', { preferences: { language: 'de' } });
    accountMail.noticeMfa(user, { kind: 'recovery-used', left: 1 });
    const [used] = await mail.waitFor(user.email, 1);
    expect(used!.subject).to.equal('Ein Wiederherstellungscode wurde für Ihr Glazecalc-Konto verwendet');
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
    expect(notice!.subject).to.equal('[Staging] Die Zwei-Schritt-Anmeldung für Ihr Glazecalc-Konto wird ausgeschaltet');
    // The date as German writes it, in the German email.
    expect(notice!.text).to.include('am 21. Oktober 2026 ausgeschaltet');
    expect(notice!.text).to.include('privacy@glazecalcapp.com');
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
