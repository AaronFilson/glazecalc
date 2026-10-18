import { LANGUAGE_CODES, LIVE_LANGUAGES } from '../../lib/regions/languages';

// The script in index.html runs before the first paint (the build allows it by its hash), so it cannot import
// anything. These tests run its text against a fake page and keep its language lists in step with the code.

// The tests run in Node, but the build bundles for the browser and has no loader for .html, so the file
// is read at run time, by a module name the bundler cannot see. The tests start in the repo's root.
const node = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ node)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const index = readFileSync('client/index.html', 'utf8');
const script = /<script>([\s\S]*?)<\/script>/.exec(index)?.[1] ?? '';

interface Page {
  stored?: Record<string, string>;
  tab?: Record<string, string>;
  at?: string;
}

/** Runs the script as a browser would at an address, and says what it did. */
function run({ stored = {}, tab = {}, at = '/' }: Page = {}) {
  const attributes = new Map<string, string>();
  const [path, query = ''] = at.split('?');
  const replaced: string[] = [];
  const storage = (data: Record<string, string>) => ({ getItem: (key: string) => data[key] ?? null });
  const run = new Function('document', 'localStorage', 'sessionStorage', 'location', 'matchMedia', script) as (
    ...args: unknown[]
  ) => void;
  run(
    {
      documentElement: { setAttribute: (k: string, v: string) => attributes.set(k, v) },
      querySelectorAll: () => []
    },
    storage(stored),
    storage(tab),
    {
      pathname: path,
      search: query ? '?' + query : '',
      hash: '',
      replace: (to: string) => replaced.push(to)
    },
    () => ({ matches: false })
  );
  return { attributes, replaced };
}

describe('the script in index.html', () => {
  it('sends a reader who chose a language from an English page to the same page in it', () => {
    expect(run({ stored: { language: 'de' }, at: '/guides/firing?x=1' }).replaced).toEqual(['/de/guides/firing?x=1']);
    expect(run({ stored: { language: 'pt-PT' }, at: '/' }).replaced).toEqual(['/pt-PT/']);
  });

  it('leaves the rest where they are', () => {
    const stays = (page: Page) => expect(run(page).replaced).toEqual([]);
    stays({ at: '/guides' });
    stays({ stored: { language: 'en' }, at: '/guides' });
    // Not offered yet, or not a language.
    stays({ stored: { language: 'ar' }, at: '/guides' });
    stays({ stored: { language: 'xx' }, at: '/guides' });
    // Already in a language's pages, whichever.
    stays({ stored: { language: 'de' }, at: '/fr/guides' });
    stays({ stored: { language: 'de' }, at: '/de/guides' });
    stays({ stored: { language: 'de' }, at: '/ar/guides' });
    // Asked for the English in this tab.
    stays({ stored: { language: 'de' }, tab: { readEnglish: '1' }, at: '/guides' });
  });

  it('tells the app a page is being left', () => {
    expect(run({ stored: { language: 'de' } }).attributes.get('data-leaving')).toBe('');
    expect(run().attributes.has('data-leaving')).toBe(false);
  });

  it('marks a stored session, for the landing page not to flash', () => {
    expect(run({ stored: { session: 'account' } }).attributes.get('data-session')).toBe('account');
    expect(run({ stored: { session: 'trial' } }).attributes.get('data-session')).toBe('trial');
    expect(run({ stored: { session: 'other' } }).attributes.has('data-session')).toBe(false);
    expect(run().attributes.has('data-session')).toBe(false);
  });

  it('sets the colors chosen in Settings', () => {
    const { attributes } = run({ stored: { theme: 'dark', palette: 'cobalt' } });
    expect([attributes.get('data-theme'), attributes.get('data-palette'), attributes.get('data-bs-theme')]).toEqual([
      'dark',
      'cobalt',
      'dark'
    ]);
  });

  it('keeps its language lists to those of lib/regions/languages.js', () => {
    const offered = /const offered = '([^']*)'/.exec(script)?.[1].split(' ');
    const others = /offered\.concat\('([^']*)'/.exec(script)?.[1].split(' ');
    expect(offered).toEqual(LIVE_LANGUAGES.filter((code) => code !== 'en'));
    expect([...(offered ?? []), ...(others ?? [])].sort()).toEqual(LANGUAGE_CODES.filter((c) => c !== 'en').sort());
  });
});

describe("index.html's title and description", () => {
  // The server gives English pages en.json's text (server/app.ts, pageText); index.html's own shows only if that
  // file cannot be read, and is kept the same, so there is one English text to translate and review.
  const en = JSON.parse(readFileSync('client/public/i18n/en.json', 'utf8')) as {
    titles: { landing: string };
    meta: { description: string; imageAlt: string };
  };
  const content = (pattern: RegExp) => pattern.exec(index)?.[1];

  it("is en.json's", () => {
    expect(content(/<title>([^<]*)<\/title>/)).toBe(en.titles.landing);
    expect(content(/property="og:title" content="([^"]*)"/)).toBe(en.titles.landing);
    expect(content(/name="description"\s+content="([^"]*)"/)).toBe(en.meta.description);
    expect(content(/property="og:description"\s+content="([^"]*)"/)).toBe(en.meta.description);
    expect(content(/property="og:image:alt" content="([^"]*)"/)).toBe(en.meta.imageAlt);
  });
});
