import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'chai';
import languages from '../../lib/regions/languages.js';
import { OG_IMAGES, ogImageFile } from '../../lib/og-images.js';
import { charsetRanges, cssRanges, imageName, lettersOf, scriptFonts } from '../../scripts/og-images.mjs';

// The link preview images scripts/og-images.mjs makes, one for each live language, checked in.
const PUBLIC = path.join(import.meta.dirname, '..', '..', 'client', 'public');

/** An image's width and height, from a PNG's IHDR or a JPEG's start-of-frame. */
function sizeOf(bytes: Buffer): { width: number; height: number } {
  if (bytes.subarray(1, 4).toString() === 'PNG')
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  expect(bytes.readUInt16BE(0), 'a JPEG').to.equal(0xffd8);
  let at = 2;
  while (at < bytes.length) {
    const marker = bytes.readUInt16BE(at);
    const length = bytes.readUInt16BE(at + 2);
    if (marker >= 0xffc0 && marker <= 0xffcf && ![0xffc4, 0xffc8, 0xffcc].includes(marker)) {
      return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) };
    }
    at += 2 + length;
  }
  throw new Error('No frame in the JPEG');
}

describe('link preview images', () => {
  it('has one for every live language, and none for another', () => {
    expect(Object.keys(OG_IMAGES)).to.deep.equal(languages.LIVE_LANGUAGES);
  });

  it('has each file, 1200 x 630, at most 150 kB, named for its language and its content', () => {
    for (const [code, file] of Object.entries(OG_IMAGES)) {
      const bytes = fs.readFileSync(path.join(PUBLIC, file));
      expect(sizeOf(bytes), file).to.deep.equal({ width: 1200, height: 630 });
      expect(bytes.length, file).to.be.at.most(150 * 1024);
      expect(file).to.equal('og/' + imageName(code, bytes, path.extname(file).slice(1)));
      expect(crypto.createHash('sha256').update(bytes).digest('hex')).to.match(new RegExp('^' + file.split('.')[1]));
    }
  });

  it('keeps no file the list does not name', () => {
    const named = new Set(Object.values(OG_IMAGES).map((file) => path.basename(file)));
    expect(fs.readdirSync(path.join(PUBLIC, 'og')).filter((file) => !named.has(file))).to.deep.equal([]);
  });

  it('gives a language without its own image the English, and keeps the old og-image.png for old shares', () => {
    expect(ogImageFile('de')).to.equal(OG_IMAGES['de']);
    expect(ogImageFile('en-XA')).to.equal(OG_IMAGES['en']);
    expect(ogImageFile('toString')).to.equal(OG_IMAGES['en']);
    expect(fs.existsSync(path.join(PUBLIC, 'og-image.png'))).to.equal(true);
  });

  it('reads the ranges of a font and the letters of a text as the generator checks them', () => {
    expect(cssRanges('U+0600-06FF, U+200C')).to.deep.equal([
      [0x600, 0x6ff],
      [0x200c, 0x200c]
    ]);
    expect(charsetRanges('20-7e a0 \n')).to.deep.equal([
      [0x20, 0x7e],
      [0xa0, 0xa0]
    ]);
    // Spaces, joiners and marks of direction need no glyph; letters and their marks do.
    expect(lettersOf('क्ष a‍‏a')).to.deep.equal([0x915, 0x94d, 0x937, 0x61]);
  });

  it("finds each script's fonts in client/styles.scss", () => {
    const fonts = scriptFonts(
      fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'client', 'styles.scss'), 'utf8')
    );
    expect(fonts['ur']).to.include('Noto Nastaliq Served');
    expect(fonts['am']).to.include('Noto Sans Ethiopic Served');
    expect(fonts['ja']).to.include('Noto Serif CJK JP');
  });
});
