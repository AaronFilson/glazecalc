import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'chai';
import cones from '../../lib/cones/index.js';

const { SK } = cones;
const GUIDES = path.join(import.meta.dirname, '../../client/public/i18n/guides');
const guideFiles = () =>
  fs
    .readdirSync(GUIDES, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.md'))
    .map((name) => ({ name, text: fs.readFileSync(path.join(GUIDES, name), 'utf8') }));

/** The text of every :::sk block in a guide. */
const skBlocks = (text: string): string[] => [...text.matchAll(/^:::sk\n([\s\S]*?)^:::$/gm)].map((match) => match[1]!);

/** Sentences and table rows, one by one. */
const sentences = (text: string): string[] => text.split(/(?<=[.!?。])\s+|\n+/).filter(Boolean);

describe('the guides on SK cones', () => {
  const english = fs.readFileSync(path.join(GUIDES, 'firing/en.md'), 'utf8');

  it('should have an SK part in the English firing guide, and only for those who fire to SK cones', () => {
    const blocks = skBlocks(english);
    expect(blocks).to.have.length(1);
    expect(blocks[0]).to.include('{#sk-cones}');
    // The other parts are not SK's: no :::sk block opens inside another block.
    expect(blocks[0]).not.to.match(/^:::(orton|temperature)$/m);
  });

  it('should show the chart as the data has it, each figure nominal (JIS)', () => {
    const rows = [...skBlocks(english)[0]!.matchAll(/^\| SK (\S+)\s+\|\s+\{\{(\d+) °F; (\d+) °C\}\} \|$/gm)];
    expect(rows.map((row) => [row[1], Number(row[3])])).to.eql(SK.cones.map((cone) => [cone.cone, cone.celsius]));
    for (const row of rows) expect(Math.abs(Number(row[2]) - (Number(row[3]) * 1.8 + 32))).to.be.below(0.51);
    expect(skBlocks(english)[0]).to.include('nominal (JIS)');
    expect(skBlocks(english)[0]).to.include(SK.source);
    expect(skBlocks(english)[0]).to.include(SK.standardUrl);
    expect(skBlocks(english)[0]).to.include(SK.note);
  });

  it('should never pair an SK number with an Orton number as equal', () => {
    const equating = /≈|=|\bequals?\b|\bequivalent|\bcorresponds?\b|\bsame as\b|\bconverts?\b|\bconversion\b/i;
    const found: string[] = [];
    for (const { name, text } of guideFiles()) {
      for (const sentence of sentences(text)) {
        const sk = /\bSK ?\d/.test(sentence);
        const orton = /\bOrton\b.*\b\d/.test(sentence) || /\bcones? \d/i.test(sentence);
        if (sk && orton && equating.test(sentence)) found.push(`${name}: ${sentence}`);
        if (sk && /[≈=]/.test(sentence)) found.push(`${name}: ${sentence}`);
      }
    }
    expect(found).to.eql([]);
  });

  it('should name the system at every cone number in the SK part', () => {
    const bare: string[] = [];
    for (const sentence of sentences(skBlocks(english)[0]!)) {
      // A number after "cone" must follow "Orton", and an SK number must be written as "SK" and its number.
      for (const match of sentence.matchAll(/(\bOrton )?\bcones? (\d+\w*)/gi)) {
        if (!match[1]) bare.push(sentence);
      }
      if (/\bSK[- ]?cones? \d/i.test(sentence)) bare.push(sentence);
    }
    expect(bare).to.eql([]);
  });

  it('should never call the cones by another name than SK (JIS R 8101)', () => {
    const text = skBlocks(english)[0]!;
    expect(text).to.include('JIS R 8101');
    // "Seger" appears only in the gloss of the Japanese trade name 立つゼーゲル.
    for (const sentence of sentences(text)) {
      if (/\bSeger\b/.test(sentence)) expect(sentence, sentence).to.include('立つゼーゲル');
    }
  });
});
