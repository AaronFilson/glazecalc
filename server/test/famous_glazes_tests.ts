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

  it('keeps a glaze that does not meet the bar off the site, with why', () => {
    // Round 15 (2026-11-05): Shino and Oribe were published, so a draft is made from Oribe here.
    expect(famous.publishedGlazes(glazes).map((g) => g.slug)).to.eql(['iznik', 'oribe', 'shino']);
    const draft = { ...copy(glazes.find((g) => g.slug === 'oribe')!), gaps: ['An open gap.'] };
    expect(famous.publishProblems(draft).join()).to.match(/gap/);
    expect(famous.publishedGlazes([draft]).map((g) => g.slug)).to.eql([]);
  });

  it('publishes a glaze whose temperature no source gives only when its note says so', () => {
    const shino = glazes.find((g) => g.slug === 'shino')!;
    expect(shino.firing!.temperatureUnknown).to.equal(true);
    expect(shino.firing!.celsius).to.equal(undefined);
    expect(famous.publishProblems(shino)).to.eql([]);
    const silent = copy(shino);
    delete silent.firing!.note;
    expect(famous.publishProblems(silent).join()).to.match(/no firing/);
    const unsaid = copy(shino);
    delete unsaid.firing!.temperatureUnknown;
    expect(famous.publishProblems(unsaid).join()).to.match(/no firing/);
  });

  it('marks the recipes of Shino and Oribe as not yet test-fired, and checks the flag', () => {
    for (const slug of ['shino', 'oribe'])
      expect(glazes.find((g) => g.slug === slug)!.recipe!.tested, slug).to.equal(false);
    const odd = copy(fixture);
    (odd.recipe as { tested?: unknown }).tested = 'no';
    expect(famous.glazeProblems(odd).join()).to.match(/tested/);
  });

  it("gives Oribe the Mie institute's 1976 recipe for reduction, and says classic Oribe is fired in oxidation", () => {
    const oribe = glazes.find((g) => g.slug === 'oribe')!;
    expect(oribe.firing!.atmosphere).to.equal('reduction');
    expect(oribe.firing!.celsius).to.eql([1250, 1280]);
    expect(oribe.recipe!.lines.map((l) => [l.material, l.amount])).to.eql([
      ['Kamado Feldspar (釜戸長石)', 65],
      ['Whiting', 19],
      ['Korean Kaolin (韓国カオリン)', 15],
      ['Silica', 1],
      ['Talc', 5]
    ]);
    expect(oribe.recipe!.additives!.map((l) => [l.material, l.amount])).to.eql([['Copper oxide', 5]]);
    const ids = oribe.sources.map((source) => source.id);
    for (const id of ['P5', 'P3', 'J8']) expect(ids, id).to.include(id);
    expect(oribe.firing!.sources).to.include('P5');
    expect(oribe.firing!.note!.en).to.match(/oxidation/);
    expect(oribe.firing!.note!.en).to.match(/reduction/);
    expect(oribe.recipe!.note!.en).to.match(/inside the 100 or on top/);
    // Copper food-safety note, as for the other copper glaze.
    expect(oribe.safety!.en).to.match(/leach-test/);
  });

  it('has Shino and Oribe written in every language İznik is', () => {
    const iznik = glazes.find((g) => g.slug === 'iznik')!;
    for (const slug of ['shino', 'oribe']) {
      const glaze = glazes.find((g) => g.slug === slug)!;
      for (const code of Object.keys(iznik.names))
        expect(famous.glazeTranslatedIn(glaze, code), `${slug} ${code}`).to.equal(true);
    }
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
    for (const address of ['/famous-glazes/nope', '/de/famous-glazes/nope', '/famous-glazes/fixture-celadon']) {
      expect(isPage(address), address).to.equal(false);
      expect(prerenderedKey(address), address).to.equal(null);
    }
    const map = sitemap(SITE, ['en', 'de'], ['en'], {});
    expect(map).to.include('/famous-glazes/shino</loc>');
    expect(map).not.to.include('fixture-celadon');
  });

  it('lists a published glaze in the sitemap in English, and in a language only once it is translated', () => {
    const map = sitemap(SITE, ['en', 'de'], ['en'], {});
    for (const page of FAMOUS_GLAZE_PAGES) {
      expect(map, page).to.include(`<loc>${SITE}${page}</loc>`);
      // German is translated (famous/de.json and the glaze's own text, its name included): its own address.
      expect(map, page).to.include(`<loc>${SITE}/de${page}</loc>`);
      const german = pageHtml(HTML, '/de' + page, SITE, {}, ['en', 'de']);
      expect(german, page).to.include(`<link rel="canonical" href="${SITE}/de${page}" />`);
      expect(german, page).not.to.include('<meta name="robots" content="noindex" />');
      expect(prerenderedKey('/de' + page, ['en', 'de']), page).to.equal('de' + page + '.html');
    }
    // A glaze whose text lacks a language (here its name) is not translated in it, so stays out of that index.
    const [glaze] = famous.publishedGlazes(famous.loadGlazes());
    expect(famous.glazeTranslatedIn(glaze, 'de')).to.equal(true);
    expect(famous.glazeTranslatedIn({ ...glaze, names: { en: glaze.names.en } }, 'de')).to.equal(false);
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
