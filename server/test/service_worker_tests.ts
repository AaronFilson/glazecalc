import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { PUBLIC_PAGES } from '../../lib/pages.js';
import { GUIDES, SCOPES, filesFor, languageOfFile } from '../../lib/offline-files.js';
import { KILL_SWITCH, addServiceWorker, asSent, shellOf } from '../../scripts/service-worker.mjs';
import Additive from '../models/additive.ts';
import Material from '../models/material.ts';
import { expect } from './support/app.ts';

// The build's service worker files (scripts/service-worker.mjs): the offline page, the manifest of what the
// worker keeps, and the workers.
const INDEX = '<!doctype html><html lang="en"><head><title>x</title></head><body><gc-root></gc-root></body></html>';

interface Config {
  index: string;
  navigationUrls: string[];
  assetGroups: { name: string; resources: { files?: string[]; urls?: string[] } }[];
  dataGroups?: unknown[];
}
const CONFIG = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'ngsw-config.json'), 'utf8')
) as Config;

// What the worker may keep (ngsw-config.json): the app's own files, never a reply from the API or a page of one person.
describe('service worker configuration', () => {
  const named = CONFIG.assetGroups.flatMap(({ resources }) => [...(resources.files ?? []), ...(resources.urls ?? [])]);

  it('keeps no reply from the API, and has no group for data', () => {
    expect(CONFIG.dataGroups ?? []).to.eql([]);
    expect(named.filter((name) => /api|oauth|mcp/.test(name))).to.eql([]);
  });

  it('leaves the translations to the app, which keeps only the languages in use', () => {
    expect(named.filter((name) => name.includes('i18n'))).to.eql([]);
  });

  it('does not take over the pages that sign in, the account, a shared recipe or an app asking to connect', () => {
    for (const page of ['signin', 'signup', 'forgot', 'reset', 'confirm-email', 'account', 'shared']) {
      expect(CONFIG.navigationUrls, page).to.include.members(['!/' + page, '!/*/' + page]);
    }
    for (const page of ['account/**', 'connect/**', 'confirm/**']) {
      expect(CONFIG.navigationUrls, page).to.include.members(['!/' + page, '!/*/' + page]);
    }
    for (const path of ['api', 'oauth', '.well-known', 'mcp']) {
      expect(CONFIG.navigationUrls, path).to.include('!/' + path + '/**');
    }
  });

  it('shows the offline page for the rest, and keeps files out of it', () => {
    expect(CONFIG.index).to.equal('/app-shell.html');
    expect(CONFIG.navigationUrls).to.include.members(['/**', '!/**/*.*']);
  });
});

// The files the phone keeps for a language (lib/offline-files.js): every one the app reads, and no other.
describe('the files kept for offline use', () => {
  const i18n = path.join(import.meta.dirname, '..', '..', 'client', 'public', 'i18n');

  it('are the parts of the app that have messages, and the guides that have text', () => {
    // Folders of the public files, and the advice page's, which the build makes (scripts/advice-i18n.mjs).
    const folders = fs
      .readdirSync(i18n, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(i18n, entry.name, 'en.json')))
      .map((entry) => entry.name);
    expect([...folders, 'advice', ''].sort()).to.eql([...SCOPES].sort());
    const guides = PUBLIC_PAGES.filter((page) => page.startsWith('/guides/')).map((page) => page.slice(8));
    expect([...GUIDES].sort()).to.eql(guides.sort());
    for (const guide of GUIDES) expect(fs.existsSync(path.join(i18n, 'guides', guide, 'en.md')), guide).to.equal(true);
  });

  it('are, for English, the messages the app does not carry, and for another language all of them', () => {
    const english = filesFor('en');
    expect(english).to.include.members(['/i18n/en.json', '/i18n/site/en.json', '/i18n/guides/firing/en.md']);
    expect(english).not.to.include.members(['/i18n/safety/en.json', '/i18n/server/en.json', '/i18n/records/en.json']);
    expect(english).to.include('/i18n/reference/en.json');
    const urdu = filesFor('ur');
    expect(urdu).to.include.members(['/i18n/ur.json', '/i18n/safety/ur.json', '/i18n/guides/safe-mixing/ur.md']);
    expect(urdu.filter((file) => file.includes('/en.'))).to.eql([]);
    // The guide in English only, and the part in English only, have no copy in another language.
    expect(urdu).not.to.include('/i18n/guides/learn-with-john-britt/ur.md');
    expect(urdu).not.to.include('/i18n/reference/ur.json');
  });

  it('are the English for a pseudo-locale', () => {
    expect(filesFor('ar-XB')).to.eql(filesFor('en'));
  });

  it('name their language', () => {
    expect(languageOfFile('/i18n/de.json')).to.equal('de');
    expect(languageOfFile('/i18n/guides/firing/pt-PT.md')).to.equal('pt-PT');
    expect(languageOfFile('/i18n/site/zh-Hans.json?x=1')).to.equal('zh-Hans');
    expect(languageOfFile('/api/materials')).to.equal(null);
    expect(languageOfFile('/app-shell.html')).to.equal(null);
  });
});

describe('service worker build step', () => {
  it('writes the page with a nonce for the root, the same for the same build and new for another', () => {
    const { html, nonce } = shellOf(INDEX);
    expect(nonce).to.match(/^[A-Za-z0-9+/]{22}$/);
    expect(html).to.equal(INDEX.replace('<gc-root>', `<gc-root ngCspNonce="${nonce}">`));
    expect(shellOf(INDEX).nonce).to.equal(nonce);
    expect(shellOf(INDEX.replace('<title>x', '<title>y')).nonce).not.to.equal(nonce);
    expect(() => shellOf('<html></html>')).to.throw('<gc-root>');
  });

  it('writes the standard materials and additives as the API sends them, for the recipe page to read offline', () => {
    const data = createRequire(import.meta.url)('../../data') as { load: (name: string) => { _id: unknown }[] };
    for (const [name, Model] of [
      ['materials', Material],
      ['additives', Additive]
    ] as const) {
      const rows = data.load(name);
      expect(rows.length, name).to.be.greaterThan(30);
      for (const row of rows) {
        expect(asSent(row), name + ' ' + String(row._id)).to.eql(JSON.parse(JSON.stringify(new Model(row))));
      }
    }
  });

  describe('on a build', () => {
    let browser: string;
    beforeEach(() => {
      browser = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-sw-'));
      fs.writeFileSync(path.join(browser, 'index.html'), INDEX);
      fs.writeFileSync(path.join(browser, 'main-ABCDEFGH.js'), 'console.log(1)');
      fs.mkdirSync(path.join(browser, 'media'));
      fs.writeFileSync(path.join(browser, 'media', 'font.woff2'), 'font');
    });
    afterEach(() => fs.rmSync(browser, { recursive: true, force: true }));

    const configFile = (): string => {
      const file = path.join(browser, '..', path.basename(browser) + '.json');
      fs.writeFileSync(
        file,
        JSON.stringify({
          index: '/app-shell.html',
          assetGroups: [
            { name: 'app', installMode: 'prefetch', resources: { files: ['/app-shell.html', '/*.js', '/media/**'] } }
          ]
        })
      );
      return file;
    };

    it('keeps the page and the files its groups name, with their hashes, and no worker', async () => {
      const config = configFile();
      // Twice: the second run finds the workers of the first and still leaves them out.
      await addServiceWorker(browser, config);
      const manifest = await addServiceWorker(browser, config);
      expect(Object.keys(manifest.hashTable).sort()).to.eql([
        '/app-shell.html',
        '/main-ABCDEFGH.js',
        '/media/font.woff2'
      ]);
      expect(JSON.parse(fs.readFileSync(path.join(browser, 'ngsw.json'), 'utf8')).index).to.equal('/app-shell.html');
      fs.rmSync(config);
    });

    it('adds the worker and the kill switch, which is the one Angular ships', async () => {
      const config = configFile();
      await addServiceWorker(browser, config);
      fs.rmSync(config);
      for (const file of ['ngsw-worker.js', 'safety-worker.js', 'worker-basic.min.js']) {
        expect(fs.existsSync(path.join(browser, file)), file).to.equal(true);
      }
      expect(fs.readFileSync(path.join(browser, 'safety-worker.js'), 'utf8')).to.include('caches');
      expect(KILL_SWITCH, 'the kill switch is off in the repository').to.equal(false);
      expect(fs.readFileSync(path.join(browser, 'ngsw-worker.js'), 'utf8')).not.to.equal(
        fs.readFileSync(path.join(browser, 'safety-worker.js'), 'utf8')
      );
    });

    it('makes the safety worker the worker when the kill switch is on', async () => {
      const config = configFile();
      await addServiceWorker(browser, config, true);
      fs.rmSync(config);
      expect(fs.readFileSync(path.join(browser, 'ngsw-worker.js'), 'utf8')).to.equal(
        fs.readFileSync(path.join(browser, 'safety-worker.js'), 'utf8')
      );
    });
  });
});
