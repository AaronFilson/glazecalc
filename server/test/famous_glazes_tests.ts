import fs from 'node:fs';
import path from 'node:path';
import * as famous from '../../lib/famous-glazes.js';
import type { FamousGlaze } from '../../lib/famous-glazes.js';
import { FAMOUS_GLAZE_PAGES, famousTranslatedIn } from '../../lib/pages.js';
import { pageSources } from '../../lib/page-dates.js';
import { publishedFile, publishedFiles } from '../../scripts/famous-glazes.mjs';
import { PUBLIC_PAGES, isAppOnlyPage, isPage, pageHtml, prerenderedKey, sitemap } from '../lib/pages.ts';
import { expect } from './support/app.ts';

// Famous glazes (docs/famous-glazes.md): the data, the publish bar, and the pages that follow from it.

const SITE = 'https://glazecalcapp.com';
const HTML =
  '<!doctype html><html lang="en"><head><title>Glazecalc</title>' +
  '<meta name="description" content="x" /><meta property="og:url" content="x" />' +
  '<meta property="og:image" content="x" /><meta name="twitter:image" content="x" /></head><body></body></html>';
const glazes = famous.loadGlazes();
const fixture = famous.loadGlazes(famous.FIXTURE_DIR).find((glaze) => glaze.slug === 'fixture-celadon')!;
const copy = (glaze: FamousGlaze): FamousGlaze => JSON.parse(JSON.stringify(glaze));

describe('famous glazes: the data', () => {
  it('has a sound file for each glaze, its materials all found and its sources all listed', () => {
    expect(glazes.length).to.be.above(0);
    for (const glaze of [...glazes, fixture]) expect(famous.glazeProblems(glaze), glaze.slug).to.eql([]);
  });

  it('publishes only glazes that meet the bar: three sources opened, a firing, no gaps', () => {
    for (const glaze of glazes.filter((g) => g.published)) {
      expect(famous.publishProblems(glaze), glaze.slug).to.eql([]);
      const opened = glaze.sources.filter((source) => /^\d{4}-\d{2}-\d{2}$/.test(source.opened ?? ''));
      expect(opened.length, glaze.slug).to.be.at.least(famous.MIN_SOURCES);
    }
    // The build refuses a glaze marked published that fails the bar (scripts/famous-glazes.mjs).
    const failing = { ...copy(fixture), fixture: false, sources: fixture.sources.slice(0, 2) };
    expect(() => publishedFile([failing])).to.throw(/at least 3/);
  });

  it('keeps the drafts that do not meet the bar off the site, with why', () => {
    for (const slug of ['shino', 'oribe']) {
      const glaze = glazes.find((g) => g.slug === slug)!;
      expect(glaze.published, slug).to.equal(false);
      expect(famous.publishProblems(glaze), slug).not.to.eql([]);
    }
    expect(famous.publishedGlazes(glazes).map((g) => g.slug)).to.eql(['iznik']);
  });

  it('never publishes the tests’ fixture, though it meets the bar', () => {
    expect(famous.publishProblems(fixture)).to.eql([]);
    expect(famous.publishedGlazes([...glazes, fixture]).map((g) => g.slug)).not.to.include('fixture-celadon');
  });

  it('shows a lead glaze as history only, with a lead-free version that says whether it was test-fired', () => {
    const iznik = glazes.find((g) => g.slug === 'iznik')!;
    expect(famous.hasLead(iznik)).to.equal(true);
    expect(iznik.history).to.equal(true);
    expect(iznik.recipe).to.equal(undefined);
    expect(iznik.leadFree!.tested).to.equal(false);
    const mixable = { ...copy(iznik), recipe: { lines: [{ material: 'Silica', amount: 50 }], sources: ['I1'] } };
    expect(famous.publishProblems(mixable).join()).to.match(/no recipe to mix/);
    const noVersion = copy(iznik);
    delete noVersion.leadFree;
    expect(famous.publishProblems(noVersion).join()).to.match(/lead-free version/);
    const unsaid = copy(iznik);
    delete (unsaid.leadFree as { tested?: boolean }).tested;
    expect(famous.glazeProblems(unsaid).join()).to.match(/tested/);
  });

  it('holds back a glaze whose material is not in the standard library yet, and finds a source not listed', () => {
    const broken = copy(fixture);
    broken.recipe!.lines.push({ material: 'No Such Spar', amount: 5 });
    broken.firing!.sources = ['T9'];
    expect(famous.publishProblems(broken).join('\n')).to.match(/No Such Spar is not in the standard library/);
    expect(famous.glazeProblems(broken).join('\n')).to.match(/T9/);
    // No materials of a glaze's own (the owner's decision): the library holds the native ones.
    expect(famous.glazeProblems({ ...copy(fixture), records: [] } as unknown as FamousGlaze).join()).to.match(
      /no records/
    );
  });

  it('resolves each material to its full record for the page', () => {
    const resolved = famous.resolveGlaze(fixture);
    expect(resolved.recipe.lines[0].record.fields.length).to.be.above(0);
    expect(resolved.recipe.additives[0].record.name).to.equal('Red iron oxide');
    expect(resolved).not.to.have.property('gaps');
    const iznik = famous.resolveGlaze(glazes.find((g) => g.slug === 'iznik')!);
    expect(iznik.lead).to.equal(true);
    expect(iznik.leadFree.prefer.map((m: { name: string }) => m.name)).to.include('Ferro Frit 3110');
  });

  it("writes one file per language, each with the glazes' prose in English and that language only", () => {
    const files = publishedFiles([...glazes, fixture]);
    expect(Object.keys(files)).to.include.members(['en.json', 'de.json', 'ta.json']);
    expect(files).not.to.have.property('published.json');
    const iznikFile = glazes.find((g) => g.slug === 'iznik')!;
    const [german] = JSON.parse(files['de.json']!);
    expect(german.slug).to.equal('iznik');
    expect(Object.keys(german.summary).sort()).to.eql(['de', 'en']);
    expect(german.summary.de).to.equal(iznikFile.summary!['de']);
    expect(german.leadFree.note.en).to.equal(iznikFile.leadFree!.note.en);
    expect(german.leadFree.prefer[0].fields.length).to.be.above(0);
    // A language a field is not translated into: its English alone, which the page marks.
    const bare = famous.glazeIn(famous.resolveGlaze(fixture), 'fr');
    expect(bare.origin).to.eql({ en: fixture.origin!.en });
    const [english] = JSON.parse(files['en.json']!);
    expect(Object.keys(english.summary)).to.eql(['en']);
    // Small enough for every prerendered page to carry (scripts/prerender.mjs MAX_GZIPPED).
    for (const name of ['de.json', 'ta.json']) expect(files[name]!.length, name).to.be.below(40_000);
  });

  it('names each language its glaze is written in, English always', () => {
    expect(famous.glazeTranslatedIn(fixture, 'en')).to.equal(true);
    expect(famous.glazeTranslatedIn(fixture, 'de')).to.equal(true);
    expect(famous.glazeTranslatedIn(fixture, 'fr')).to.equal(false);
  });
});

describe('famous glazes: the pages', () => {
  it('has an index and a page per published glaze, and none at all while none is published', () => {
    expect(famous.famousGlazePages([])).to.eql([]);
    expect(famous.famousGlazePages([fixture])).to.eql(['/famous-glazes', '/famous-glazes/fixture-celadon']);
    expect(FAMOUS_GLAZE_PAGES).to.eql(famous.famousGlazePages(famous.publishedGlazes()));
    for (const page of FAMOUS_GLAZE_PAGES) {
      expect(PUBLIC_PAGES, page).to.include(page);
      expect(isAppOnlyPage(page), page).to.equal(false);
    }
  });

  it('gives an unpublished glaze no page: the not-found page, out of the sitemap and the prerender', () => {
    for (const address of ['/famous-glazes/shino', '/de/famous-glazes/oribe', '/famous-glazes/fixture-celadon']) {
      expect(isPage(address), address).to.equal(false);
      expect(prerenderedKey(address), address).to.equal(null);
    }
    const map = sitemap(SITE, ['en', 'de'], ['en'], {});
    expect(map).not.to.include('/famous-glazes/shino');
    expect(map).not.to.include('fixture-celadon');
  });

  it('lists a published glaze in the sitemap in English, and in a language only once it is translated', () => {
    const map = sitemap(SITE, ['en', 'de'], ['en'], {});
    for (const page of FAMOUS_GLAZE_PAGES) {
      expect(map, page).to.include(`<loc>${SITE}${page}</loc>`);
      // No famous/de.json yet: the German copy is for readers, its one address for search engines the English.
      expect(map, page).not.to.include(`<loc>${SITE}/de${page}</loc>`);
      const german = pageHtml(HTML, '/de' + page, SITE, {}, ['en', 'de']);
      expect(german, page).to.include(`<link rel="canonical" href="${SITE}${page}" />`);
      expect(german, page).to.include('<meta name="robots" content="noindex" />');
      expect(prerenderedKey('/de' + page, ['en', 'de']), page).to.equal('de' + page + '.html');
    }
  });

  it('offers a page in a language once the scope and the glaze are translated there', () => {
    const scope = fs.existsSync(
      path.join(import.meta.dirname, '..', '..', 'client', 'public', 'i18n', 'famous', 'de.json')
    );
    expect(famousTranslatedIn('/famous-glazes/fixture-celadon', 'en', [fixture])).to.equal(true);
    expect(famousTranslatedIn('/famous-glazes/fixture-celadon', 'de', [fixture])).to.equal(scope);
    expect(famousTranslatedIn('/famous-glazes/fixture-celadon', 'fr', [fixture])).to.equal(false);
    expect(famousTranslatedIn('/guides', 'fr', [fixture])).to.equal(true);
  });

  it("dates a glaze's page by its scope, its file and the library", () => {
    expect(pageSources('/famous-glazes/iznik', 'de')).to.include('data/famous-glazes/iznik.json');
    expect(pageSources('/famous-glazes/iznik', 'de')).to.include('client/public/i18n/famous/de.json');
    expect(pageSources('/famous-glazes', 'en')).to.include('data/famous-glazes/');
  });
});
