import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { COURSE_GUIDE, courseUnits, courseVideos, findUnit } from '../mcp/course.ts';
import { GUIDE_IDS, readGuide } from '../mcp/guides.ts';
import { checkGuides } from '../../scripts/i18n-check.mjs';
import { expect } from './support/app.ts';

// The companion to John Britt's free online Glaze Course (server/mcp/course.ts and
// client/public/i18n/guides/learn-with-john-britt/en.md): his videos are linked by
// the titles and addresses of his playlist, never invented, copied or embedded.

/**
 * The playlist as read on 2026-10-19 (52 videos), each title as he wrote it:
 * https://www.youtube.com/playlist?list=PL-Wllepy4jIbCxsXiQRG5GJzbKNUSUvPd
 */
const PLAYLIST: Array<[string, string]> = [
  [
    'Description of UMF (Unity Molecular Formula) Structure  (Free Online Glaze Class Pt. 1 )',
    'https://www.youtube.com/watch?v=YNWdd6R6a4Q'
  ],
  [
    'Calculating a UMF formula from a batch recipe. (Free Online Glaze Class Pt. 2)',
    'https://www.youtube.com/watch?v=DXJcyOiAhU0'
  ],
  [
    'Short description of  Glaze Limits and Stull diagram (Free Online Glaze Class Pt. 3)',
    'https://www.youtube.com/watch?v=cboV_QYvK4I'
  ],
  ['Understanding the Stull Chart (Free Online Glaze Class Pt. 4)', 'https://www.youtube.com/watch?v=vL4dGrZdPEs'],
  [
    'Cone 6 Burgundy colorants in various glaze bases (Free Online Glaze Class Pt. 7)',
    'https://www.youtube.com/watch?v=_r1pAjX_RQU'
  ],
  [
    'Copper in various cone 6 base glazes (Free Online Glaze Class Pt. 8)',
    'https://www.youtube.com/watch?v=XAhOnrUjlkI'
  ],
  [
    'Understanding the Triaxial Blend (Free Online Glaze Course Part 9 Practical lab work)',
    'https://www.youtube.com/watch?v=PMwi9K6_fOk'
  ],
  [
    'Ian Currie Systematic Blend (Free Online Glaze Course Part 10 Practical lab work)',
    'https://www.youtube.com/watch?v=oe4KgunSR_Q'
  ],
  [
    'How to run a Volumetric Line Blend for Pottery Glazes (Free Online Glaze Course Part 11 Lab)',
    'https://www.youtube.com/watch?v=1ty81TEAiEk'
  ],
  [
    'Volumetric Color Blend Glaze Test  (Part 1)  (Free Online Glaze Course Part 12 Lab)',
    'https://www.youtube.com/watch?v=1mXUeBdDFKQ'
  ],
  ['Melt Tests (Free Online Glaze Course Part 14 Lab)', 'https://www.youtube.com/watch?v=7uQmd8NVfds'],
  [
    'Deflocculated and Flocculated Glazes (Free Online Glaze Course Part 15 Lab)',
    'https://www.youtube.com/watch?v=fpQns05RdVU'
  ],
  [
    'Easy Glaze Testing (Part 2 color blend) (Free Online Glaze Course Part 17 Lab)',
    'https://www.youtube.com/watch?v=EZCppt2rSpI'
  ],
  [
    'Easy Glaze Testing (color blend) (part 1) (Free Online Glaze Course Part 16 Lab)',
    'https://www.youtube.com/watch?v=Bmt55y-mbtc'
  ],
  ['Extruding Test Tiles (Free Online Glaze Course Part 18 Lab)', 'https://www.youtube.com/watch?v=XNjctMsjT5M'],
  ['Progression Test (Free Online Glaze Course Part 19 Lab)', 'https://www.youtube.com/watch?v=Q7csS5t5pRo'],
  [
    'Glaze Thickness or Specific Gravity #41  in my Free Online Glaze Course',
    'https://www.youtube.com/watch?v=PYt9L_L6Xwo'
  ],
  ['Properties of Ceramic Oxides (Free online Glaze Course- Part 5)', 'https://www.youtube.com/watch?v=6-HZ00qhFqM'],
  [
    'Properties of Ceramic oxides: Opacifiers and Colorants (Free Online Glaze Course Part 6)',
    'https://www.youtube.com/watch?v=UApbG8CLaq0'
  ],
  ['Understanding Slip in Ceramics (Free Online Glaze Class Pt. 20 )', 'https://www.youtube.com/watch?v=qilS20pRdzY'],
  [
    'Concepts in Glaze Thickness and Application ( part 21 of Free Online Glaze Course)',
    'https://www.youtube.com/watch?v=0EYZJesDjDw'
  ],
  [
    'Combination Grid Test cone 6 ( video 22 in FREE Online Glaze Course)',
    'https://www.youtube.com/watch?v=iDSr-SbWboY'
  ],
  [
    'Advantages and Disadvantages of UMF Unity Molecular Formula ( video 23 in FREE Online Glaze Course)',
    'https://www.youtube.com/watch?v=Q8lkZbcmIa8'
  ],
  [
    'Combination Grid Over/Under -Part 2 (Video #22.1 in the Free Online Glaze Course)',
    'https://www.youtube.com/watch?v=ggWYOHowdgM'
  ],
  [
    'Basic Overview of Ceramic Geology For Potters (Video #24 in the Free Online Glaze Course)',
    'https://www.youtube.com/watch?v=DWZsDCHUAvQ'
  ],
  [
    'Acquiring and Processing Ceramic Raw Materials  (Video #25 in the Free Online Glaze Course)',
    'https://www.youtube.com/watch?v=AitvrEiWyS0'
  ],
  ['Types of Clay (Video #26 in the Free Online Glaze Course)', 'https://www.youtube.com/watch?v=I-LpbF0wOZ4'],
  [
    'Properties of Clay  - Physical characteristics: Video #27 of the Free online glaze course',
    'https://www.youtube.com/watch?v=7_Ml0a_Me7k'
  ],
  ['Clay Bodies   Free online  Glaze Course #28', 'https://www.youtube.com/watch?v=sUC2QcLI4OA'],
  [
    'Practical Examples of Clay Bodies #29 in the Free on-line Glaze Course',
    'https://www.youtube.com/watch?v=mJATUP2ftaA'
  ],
  ['Wild Clay #30 in Free Online Glaze Class', 'https://www.youtube.com/watch?v=0Vq445iD9i8'],
  [
    'Overview of Shino Glazes ( Video #31 in the FREE online Glaze Course). "RECIPES" are on my website.',
    'https://www.youtube.com/watch?v=F178U4FX-Vg'
  ],
  [
    'Easy Glaze Testing Part 3: INGREDIENT BLEND (video 33 of FREE online glaze course)',
    'https://www.youtube.com/watch?v=dLO_EOjvu-4'
  ],
  [
    'Easy GlazeTesting PART 4 (Ingredient Blend) ( Video #34 in the FREE Online Glaze Course)',
    'https://www.youtube.com/watch?v=opd-brS6OZc'
  ],
  ['Nerikomi (Neriage) ( Video 35 in my FREE Online Glaze course)', 'https://www.youtube.com/watch?v=6VURyRMDY9E'],
  [
    'Incorporating cremains into glazes and clay. (Video #36 in the FREE ONLINE GLAZE COURSE)',
    'https://www.youtube.com/watch?v=ZPEafNn6aiE'
  ],
  ['Secrets of Oil Spot Glazes  #49 in my FREE Online Glaze Course', 'https://www.youtube.com/watch?v=sNJq1cLDw5I'],
  [
    'ORIGINS OF GLAZE RECIPES (Video #37 in the FREE online glaze course)',
    'https://www.youtube.com/watch?v=0_tI2JZHLNA'
  ],
  [
    'Gerstley borate and substitute testing. (Video #38 in FREE ONLINE GLAZE COURSE)',
    'https://www.youtube.com/watch?v=Pc9dfDIf8i0'
  ],
  [
    'Crater Glaze Exploration cone 6 ( #39 in my Free Online Glaze Course.)',
    'https://www.youtube.com/watch?v=SB3sPj37PX8'
  ],
  ['Rocks and Minerals in Ceramics ( #40  in FREE Online Glaze Course)', 'https://www.youtube.com/watch?v=xiKZkWhyg-U'],
  [
    'RUST-Explorations into faux ceramic rust surfaces. #50 in my FREE Online Glaze Course',
    'https://www.youtube.com/watch?v=BzBmvqhV8KM'
  ],
  [
    'Versatility of the Hansen 5 x 20 recipe PART 1 with a discussion of variations. VIDEO #43',
    'https://www.youtube.com/watch?v=ZM1TqZC3jKI'
  ],
  [
    'Versatility of Hansen 5x20 glaze, PART 2,  It is #44 in the Free Online Glaze Course.',
    'https://www.youtube.com/watch?v=6Bq-ShJyI0k'
  ],
  [
    'Sculptural Ceramic Surfaces 2026 (#45 in the Free Online Glaze Course)',
    'https://www.youtube.com/watch?v=4VIf9OgX0io'
  ],
  [
    'NEW Crackle Slip PDF (promo) (Video #46 in Free On-line Glaze Course)',
    'https://www.youtube.com/watch?v=Sc4TFb-q6gU'
  ],
  ['How I fire my gas kiln (Video #48 )', 'https://www.youtube.com/watch?v=WK30mcBTE7g'],
  [
    'Promo for: Secrets of Cobalt Crystalline Glazes    #51 in my FREE Online Glaze Course',
    'https://www.youtube.com/watch?v=XQ1On99awXM'
  ],
  [
    'Volumetric Color Blending (Part 2)  (Free Online Glaze Course Part 13 Lab)',
    'https://www.youtube.com/watch?v=98-9t8T6I8M'
  ],
  [
    'The Versatility of 5 x 20 PART 3 (#47 in the FREE On-line Glaze Course)',
    'https://www.youtube.com/watch?v=dOPeUiFMZ8A'
  ],
  [
    'How I fire my forced air downdraft kiln, with Oxiprobe.  (Video #49 in my FREE Online Glaze Course)',
    'https://www.youtube.com/watch?v=IM7Vb6R_H3E'
  ],
  ['ZOOM Online Q &A GLAZE Session today 7/17/26', 'https://www.youtube.com/watch?v=0plj-KdcJ24']
];

/** Left out on purpose: two promotions and a recorded live session. */
const LEFT_OUT = [
  'https://www.youtube.com/watch?v=Sc4TFb-q6gU',
  'https://www.youtube.com/watch?v=XQ1On99awXM',
  'https://www.youtube.com/watch?v=0plj-KdcJ24'
];

const GUIDE_FILE = path.join(
  import.meta.dirname,
  '..',
  '..',
  'client',
  'public',
  'i18n',
  'guides',
  COURSE_GUIDE,
  'en.md'
);
/** Spaces as a page shows them: the playlist has some doubled. */
const spaced = (text: string): string => text.replace(/\s+/g, ' ').trim();

describe("the companion to John Britt's course", () => {
  it('is one of the guides, in English only', () => {
    expect(GUIDE_IDS).to.include(COURSE_GUIDE);
    expect(readGuide(COURSE_GUIDE, 'de')).to.include({ asked: 'de', translated: false, language: 'en' });
    expect(readFileSync(GUIDE_FILE, 'utf8')).to.match(/^---\ntitle: Learn with John Britt's free glaze course\n/);
  });

  it('may have no copy in another language: the translation checks say so', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'gc-guides-'));
    try {
      mkdirSync(path.join(dir, COURSE_GUIDE));
      writeFileSync(path.join(dir, COURSE_GUIDE, 'en.md'), '## A {#a}\n\nText.\n');
      expect(checkGuides(dir)).to.eql([]);
      writeFileSync(path.join(dir, COURSE_GUIDE, 'de.md'), '## A {#a}\n\nText.\n');
      expect(checkGuides(dir)).to.eql([
        `guides/${COURSE_GUIDE}/de.md: this guide is in English only (lib/pages.js), so it has no copies`
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('has twelve units, in order, each with his videos, guide sections that exist and exercises', () => {
    const units = courseUnits();
    expect(units.map((unit) => unit.number)).to.eql([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(units.map((unit) => unit.id)).to.eql([
      'unity-formula',
      'limits-and-stull',
      'oxides',
      'color-in-bases',
      'blending',
      'test-tiles-and-melt',
      'slurry-and-application',
      'recipes-and-substitutes',
      'special-surfaces',
      'raw-materials',
      'clay',
      'firing'
    ]);
    for (const unit of units) {
      expect(unit.videos.length, unit.id).to.be.above(0);
      expect(unit.reads.length, unit.id).to.be.above(0);
      expect(unit.exercises.length, unit.id).to.be.within(1, 3);
      for (const read of unit.reads) {
        const guide = readGuide(read.guide, 'en');
        expect(
          guide?.sections.some((s) => s.id === read.section),
          `${unit.id}: ${read.guide}#${read.section}`
        ).to.equal(true);
      }
    }
    // The lab units send the reader to the safe mixing guide first.
    expect(units.filter((unit) => unit.lab).map((unit) => unit.id)).to.include.members([
      'blending',
      'test-tiles-and-melt',
      'slurry-and-application',
      'raw-materials'
    ]);
    expect(findUnit('5')?.id).to.equal('blending');
    expect(findUnit('Unit 12')?.id).to.equal('firing');
    expect(findUnit(' Clay ')?.id).to.equal('clay');
    expect(findUnit('13')).to.equal(undefined);
    expect(findUnit('nope')).to.equal(undefined);
  });

  it('links only videos from his playlist, by his titles, and every one but the promotions, once', () => {
    const listed = new Map(PLAYLIST.map(([title, url]) => [url, spaced(title)]));
    expect(listed.size).to.equal(52);
    const linked = courseVideos();
    for (const video of linked) {
      expect(listed.has(video.url), video.url).to.equal(true);
      expect(spaced(video.title), video.url).to.equal(listed.get(video.url));
    }
    const urls = linked.map((video) => video.url);
    expect(new Set(urls).size).to.equal(urls.length);
    expect([...urls, ...LEFT_OUT].sort()).to.eql([...listed.keys()].sort());

    // Any YouTube address in the file at all is a video of his, his playlist or his channel.
    const text = readFileSync(GUIDE_FILE, 'utf8');
    for (const [address] of text.matchAll(/https?:\/\/[^\s)"']*youtu[^\s)"']*/g)) {
      expect(
        listed.has(address) ||
          address === 'https://www.youtube.com/playlist?list=PL-Wllepy4jIbCxsXiQRG5GJzbKNUSUvPd' ||
          address === 'https://www.youtube.com/@johnbrittpottery',
        address
      ).to.equal(true);
    }
  });

  it('embeds nothing: no frames, players or embed addresses', () => {
    const text = readFileSync(GUIDE_FILE, 'utf8');
    expect(text).not.to.match(/<\s*(iframe|embed|object|video|script)\b/i);
    expect(text).not.to.match(/youtube(-nocookie)?\.com\/embed|youtu\.be\//i);
    expect(text).not.to.match(/<[a-z]/i);
  });

  it('credits him, his site and books, and says Glazecalc is not connected with him', () => {
    const about = readGuide(COURSE_GUIDE, 'en')!.sections.find((section) => section.id === 'about')!.text;
    for (const part of [
      'The videos are his.',
      'johnbrittpottery.com',
      'The Complete Guide to High-Fire Glazes',
      'The Complete Guide to Mid-Range Glazes',
      'Lark Books',
      'not connected with him',
      '/guides/safe-mixing'
    ]) {
      expect(about).to.include(part);
    }
  });
});
