import { MESSAGES, type MessageCode, say, textOf } from '../lib/messages.ts';
import { expect } from './support/app.ts';

// What the server tells people: a code the app can translate, and English text.
describe('messages', () => {
  it('should give every code English text, with its values filled in', () => {
    const params = { minutes: 30, limit: 25, label: 'recipe', palettes: 'tenmoku, ash', most: 500 };
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

  it('should give every translation the values and signature of the English', async () => {
    const { RESET, CHANGED } = await import('../lib/account_mail.ts');
    const values = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const emails of [RESET, CHANGED]) {
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
    const { RESET, CHANGED } = await import('../lib/account_mail.ts');
    const { fingerprint } = await import('../../scripts/i18n-fingerprints.mjs');
    expect(fingerprint(JSON.stringify([RESET['en'], CHANGED['en']]))).to.equal('xj1yoc');
  });
});
