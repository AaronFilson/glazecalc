import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import * as mailer from '../lib/mailer.ts';
import { pageHtml } from '../lib/pages.ts';
import * as site from '../lib/site.ts';
import * as mail from './support/mail.ts';
import { api, expect, site as request, uniqueEmail } from './support/app.ts';

// A copy of the site that is not production (staging) differs only by its
// environment (docs/mfa-plan.md, "Two phases"). Each test sets what it needs
// and puts the environment back.
const SETTINGS = ['SITE_LABEL', 'NOINDEX', 'MAIL_ALLOWLIST'] as const;
const saved: Record<string, string | undefined> = {};
beforeEach(() => SETTINGS.forEach((name) => (saved[name] = process.env[name])));
afterEach(() =>
  SETTINGS.forEach((name) => (saved[name] === undefined ? delete process.env[name] : (process.env[name] = saved[name])))
);
const unset = () => SETTINGS.forEach((name) => delete process.env[name]);

describe('the site settings', () => {
  it('reads the address, label and names from the environment', () => {
    unset();
    expect(site.siteUrl()).to.equal('https://glazecalc.test');
    expect(site.rpId()).to.equal('glazecalc.test');
    expect(site.origin()).to.equal('https://glazecalc.test');
    expect(site.siteName()).to.equal('Glazecalc');
    expect(site.labelShown()).to.equal('');
    process.env.SITE_LABEL = 'staging';
    expect(site.totpIssuer()).to.equal('Glazecalc (staging)');
    expect(site.labelShown()).to.equal('Staging');
  });
});

describe('MAIL_ALLOWLIST', () => {
  it('lets mail go anywhere when it is not set', () => {
    unset();
    expect(site.mailAllowed('anyone@example.com')).to.equal(true);
    process.env.MAIL_ALLOWLIST = ' , ';
    expect(site.mailAllowed('anyone@example.com')).to.equal(true);
  });

  it('allows only the addresses and @domains on it, in any case', () => {
    process.env.MAIL_ALLOWLIST = 'Owner@Example.com, @owner.test';
    expect(site.mailAllowed('owner@example.com')).to.equal(true);
    expect(site.mailAllowed('OWNER@example.COM')).to.equal(true);
    expect(site.mailAllowed('someone@owner.test')).to.equal(true);
    expect(site.mailAllowed('other@example.com')).to.equal(false);
    // A domain is that domain only: not one that ends with it, nor a subdomain.
    expect(site.mailAllowed('someone@notowner.test')).to.equal(false);
    expect(site.mailAllowed('someone@mail.owner.test')).to.equal(false);
    expect(site.mailAllowed('owner.test')).to.equal(false);
    expect(site.mailAllowed('@owner.test')).to.equal(false);
  });

  it('drops mail to anyone else, and sends the rest', async () => {
    const allowed = uniqueEmail('allowed');
    const other = uniqueEmail('other');
    process.env.MAIL_ALLOWLIST = allowed;
    await mailer.send({ to: other, subject: 'Not for you', text: '' });
    await mailer.send({ to: allowed, subject: 'For you', text: '' });
    expect((await mail.waitFor(allowed, 1)).map((m) => m.subject)).to.eql(['For you']);
    await mail.settle();
    expect(mail.to(other)).to.eql([]);
  });

  it('logs a dropped message by its code only, never the address', async () => {
    const other = uniqueEmail('secret-address');
    process.env.MAIL_ALLOWLIST = '@owner.test';
    const level = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'error';
    const lines: string[] = [];
    const write = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string | Uint8Array) => (lines.push(String(chunk)), true)) as typeof write;
    try {
      await mailer.send({ to: other, subject: 'Hidden', text: 'Hidden' });
    } finally {
      process.stderr.write = write;
      process.env.LOG_LEVEL = level;
    }
    expect(lines.join('')).to.include('not-on-mail-allowlist');
    expect(lines.join('')).to.not.include('secret-address');
  });
});

describe('SITE_LABEL in mail', () => {
  it('leaves subjects alone in production', async () => {
    unset();
    const to = uniqueEmail('plain-subject');
    await mailer.send({ to, subject: 'Reset your Glazecalc password', text: '' });
    expect((await mail.waitFor(to, 1))[0]!.subject).to.equal('Reset your Glazecalc password');
  });

  it('names the copy in every subject', async () => {
    process.env.SITE_LABEL = 'staging';
    const to = uniqueEmail('labelled-subject');
    await mailer.send({ to, subject: 'Reset your Glazecalc password', text: '' });
    expect((await mail.waitFor(to, 1))[0]!.subject).to.equal('[Staging] Reset your Glazecalc password');
  });
});

describe('NOINDEX', () => {
  it('serves robots.txt, the sitemap and no X-Robots-Tag when not set', async () => {
    unset();
    const page = await request().get('/sitemap.xml');
    expect(page).to.have.status(200);
    expect(page.headers['x-robots-tag']).to.equal(undefined);
    const health = await api().get('/health');
    expect(health.headers['x-robots-tag']).to.equal(undefined);
  });

  it('marks every response noindex, pages and the API alike', async () => {
    process.env.NOINDEX = '1';
    for (const res of [await request().get('/'), await request().get('/guides'), await api().get('/health')]) {
      expect(res.headers['x-robots-tag']).to.equal('noindex, nofollow');
    }
    const missing = await request().get('/no-such-file.js');
    expect(missing.headers['x-robots-tag']).to.equal('noindex, nofollow');
  });

  it('turns every crawler away and serves no sitemap', async () => {
    process.env.NOINDEX = '1';
    const robots = await request().get('/robots.txt');
    expect(robots).to.have.status(200);
    expect(robots.text).to.equal('User-agent: *\nDisallow: /\n');
    expect(robots.text).to.not.include('Sitemap');
    expect(await request().get('/sitemap.xml')).to.have.status(404);
  });
});

describe('the staging banner', () => {
  const HTML = `<!doctype html>
<html lang="en">
  <head>
    <title>Glazecalc</title>
    <meta property="og:url" content="https://glazecalcapp.com/" />
  </head>
  <body class="x"><gc-root></gc-root></body>
</html>`;
  const PAGES = ['/', '/guides', '/de/guides/firing', '/ar/recipe', '/nowhere', '/account'];
  const render = (label?: string) =>
    PAGES.map((p) =>
      pageHtml(
        HTML,
        p,
        'https://glazecalcapp.com',
        { title: 'T', description: 'D', imageAlt: 'A' },
        ['en', 'de'],
        p === '/guides',
        label
      )
    );

  it('changes nothing in production: the pages are byte for byte as before the banner existed', () => {
    unset();
    const pages = render();
    // The sha-256 of these pages from pageHtml as it was before the banner
    // (commit 166eb91). Change it only for a change meant for production too.
    const hash = crypto.createHash('sha256').update(pages.join('\n=====\n')).digest('hex');
    expect(hash).to.equal('76f964eb15b23f5f2913632d6ad0ec8019d30190bea2fb7ad384dd08ae3d5534');
    expect(render('')).to.eql(pages);
    for (const page of pages) expect(page).to.not.include('gc-site-label');
  });

  it('adds only a thin banner and its style when SITE_LABEL is set', () => {
    unset();
    const plain = render();
    process.env.SITE_LABEL = 'staging';
    const labelled = render();
    labelled.forEach((page, i) => {
      expect(page).to.include(
        '<body class="x">\n    <aside class="gc-site-label" aria-label="Staging">Staging: a test copy of Glazecalc</aside>'
      );
      expect(page).to.match(/<style nonce="__GC_NONCE__">\.gc-site-label\{[^<]*<\/style>\n {2}<\/head>/);
      const without = page
        .replace(/\n {4}<aside class="gc-site-label"[^\n]*<\/aside>/, '')
        .replace(/ {4}<style nonce="__GC_NONCE__">\.gc-site-label[^\n]*\n/, '');
      expect(without).to.equal(plain[i]);
    });
  });

  it('writes the label safely', () => {
    const [page] = render('<b>"x"</b>');
    expect(page).to.include('aria-label="&lt;b&gt;&quot;x&quot;&lt;/b&gt;"');
    expect(page).to.not.include('<b>');
  });

  // Every page the build prerendered, where there is a build.
  const PRERENDERED = path.join(import.meta.dirname, '..', '..', 'dist', 'glazecalc', 'prerendered');
  it('leaves every prerendered page as it was in production', function () {
    if (!fs.existsSync(PRERENDERED)) this.skip();
    unset();
    const files = (fs.readdirSync(PRERENDERED, { recursive: true }) as string[]).filter((f) => f.endsWith('.html'));
    for (const file of files.slice(0, 50)) {
      const html = fs.readFileSync(path.join(PRERENDERED, file), 'utf8');
      expect(pageHtml(html, '/guides', 'https://glazecalcapp.com', {}, undefined, true)).to.equal(
        pageHtml(html, '/guides', 'https://glazecalcapp.com', {}, undefined, true, '')
      );
      expect(pageHtml(html, '/guides', 'https://glazecalcapp.com', {}, undefined, true)).to.not.include(
        'gc-site-label'
      );
    }
  });

  it('shows on served pages only when SITE_LABEL is set', async () => {
    unset();
    const plain = await request().get('/guides');
    process.env.SITE_LABEL = 'staging';
    const labelled = await request().get('/guides');
    if (plain.status !== 200) return; // No client build: nothing is served.
    expect(plain.text).to.not.include('gc-site-label');
    expect(labelled.text).to.include('<aside class="gc-site-label" aria-label="Staging">');
    // The banner's style carries the reply's nonce, as the CSP needs.
    const nonce = /'nonce-([^']+)'/.exec(String(labelled.headers['content-security-policy']))![1];
    expect(labelled.text).to.include(`<style nonce="${nonce}">.gc-site-label`);
  });
});

describe('cookies stay host-only', () => {
  it('sets no Domain on any cookie, so staging and production never share a session', async () => {
    const replies = [
      await api()
        .post('/signup')
        .send({ email: uniqueEmail('host-only'), password: 'password123' }),
      await api()
        .post('/signup')
        .set('X-Keep-Signed-In', '1')
        .send({ email: uniqueEmail('host-only'), password: 'password123' }),
      await api().post('/guest')
    ];
    let cookies = 0;
    for (const res of replies) {
      for (const cookie of ([] as string[]).concat((res.headers['set-cookie'] as unknown as string[] | undefined) ?? [])) {
        cookies++;
        expect(cookie).to.not.match(/;\s*Domain=/i);
      }
    }
    expect(cookies).to.be.greaterThan(0);
  });
});
