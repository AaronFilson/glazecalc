// The guides as the MCP server reads them (server/mcp/guides.ts): the site's
// own marks made plain, the parts for one cone system, the sections of every
// guide in every language, and the search.
import { expect } from 'chai';
import languages from '../../lib/regions/languages.js';
import {
  excerptOf,
  forCones,
  GUIDE_IDS,
  guideMarkdown,
  plainMarks,
  plainText,
  readGuide,
  searchGuides,
  termsOf
} from '../mcp/guides.ts';

describe('MCP: the guides, read', () => {
  it('are the five guides the site lists', () => {
    expect(GUIDE_IDS).to.eql(['glazing-basics', 'making-a-glaze', 'safe-mixing', 'home-safety', 'firing']);
  });

  it('settle the site’s marks: both scales, specific gravity, English terms, the parts by country', () => {
    const text = [
      'Fire to {{2232 °F; 1222 °C}} at {{108 °F/h; 60 °C/h}}.',
      'Mix to {{SG 1.43–1.45}}.',
      'A Fritte {{en: frit}} melts.',
      '',
      '::poison-lines',
      '',
      '::unknown-block'
    ].join('\n');
    expect(plainMarks(text, 'https://example.test/guides/home-safety')).to.equal(
      [
        'Fire to 2232 °F (1222 °C) at 108 °F/h (60 °C/h).',
        'Mix to SG 1.43–1.45.',
        'A Fritte (frit) melts.',
        '',
        '(The guide on the website shows who to call for poison advice in your country: https://example.test/guides/home-safety)'
      ].join('\n')
    );
  });

  it('keep the parts for one cone system, as the site does', () => {
    const text = 'All.\n:::orton\nCone 6.\n:::\n:::sk\nSK 7.\n:::\n:::temperature\n1222 °C.\n:::\nEnd.\n';
    expect(forCones(text, 'orton')).to.equal('All.\nCone 6.\nEnd.\n');
    expect(forCones(text, 'sk')).to.equal('All.\nSK 7.\nEnd.\n');
    expect(forCones(text, 'temperature')).to.equal('All.\n1222 °C.\nEnd.\n');
    // With no SK part, those who fire to SK cones get the temperatures, never Orton's numbers.
    expect(forCones('A\n:::orton\nCone 6.\n:::\n:::temperature\n1222 °C.\n:::\n', 'sk')).to.equal('A\n1222 °C.\n');
  });

  it('read every guide in every language, its sections with the English anchors', () => {
    for (const id of GUIDE_IDS) {
      const english = readGuide(id, 'en')!;
      expect(english.title, id).to.not.equal('');
      expect(english.sections.length, id).to.be.above(3);
      const anchors = english.sections.map((section) => section.id);
      for (const code of languages.LIVE_LANGUAGES) {
        const guide = readGuide(id, code)!;
        expect(guide.asked, code).to.equal(code);
        expect(guide.title, `${id} ${code}`).to.not.equal('');
        for (const section of guide.sections) {
          expect(anchors, `${id} ${code}`).to.include(section.id);
          expect(section.heading, `${id} ${code} ${section.id}`).to.not.equal('');
          expect(section.text, `${id} ${code} ${section.id}`).not.to.match(/\{\{|^:::|^::[a-z]/m);
        }
      }
      expect(guideMarkdown(english)).to.match(new RegExp('^# ' + english.title.replace(/[?()]/g, '\\$&')));
    }
    expect(readGuide('nope', 'en')).to.equal(null);
  });

  it('give English for a language the app does not offer, and say a section waiting for its translation is English', () => {
    const guide = readGuide('firing', 'xx')!;
    expect(guide).to.include({ asked: 'en', translated: true, language: 'en' });
    // Wherever a translation keeps a section in English, the section says so.
    for (const code of languages.LIVE_LANGUAGES) {
      for (const id of GUIDE_IDS) {
        const translated = readGuide(id, code)!;
        for (const section of translated.sections) expect(['en', code], `${id} ${code}`).to.include(section.language);
      }
    }
  });
});

describe('MCP: the guides, searched', () => {
  it('splits a query into words without common endings, or keeps a query with no spaces whole', () => {
    expect(termsOf('Crawling and crazed glazes!')).to.eql(['crawl', 'and', 'craz', 'glaz']);
    expect(termsOf('Kegel')).to.eql(['kegel']);
    expect(termsOf('cone 6')).to.eql(['cone', '6']);
    expect(termsOf('釉薬')).to.eql(['釉薬']);
    expect(termsOf('Séger')).to.eql(['seger']);
  });

  it('makes excerpts of plain words around the first match', () => {
    const text = '**Crazing** is a [network](https://x.test) of fine cracks. ' + 'More words here. '.repeat(30);
    expect(plainText(text)).to.match(/^Crazing is a network of fine cracks\. More/);
    const excerpt = excerptOf('Intro words. '.repeat(40) + text, ['craz']);
    expect(excerpt).to.match(/^…/);
    expect(excerpt).to.include('Crazing is a network');
    expect(excerpt.length).to.be.below(250);
  });

  it('ranks a section with every word first, and a list of sources last', () => {
    const { hits } = searchGuides('kiln sitter', { limit: 20 });
    expect(hits[0]).to.include({ guide: 'firing', section: 'kiln-sitter' });
    const sources = hits.findIndex((hit) => hit.section === 'sources');
    if (sources >= 0) expect(sources).to.be.above(0);
    for (let i = 1; i < hits.length; i++) expect(hits[i - 1]!.score).to.be.at.least(hits[i]!.score);
  });

  it('searches the parts for the cone system asked', () => {
    const orton = searchGuides('JIS', { guide: 'firing', cones: 'orton', limit: 20 }).hits.map((hit) => hit.section);
    const sk = searchGuides('JIS', { guide: 'firing', cones: 'sk', limit: 20 }).hits.map((hit) => hit.section);
    expect(sk.length).to.be.at.least(orton.length);
  });
});
