import { readFileSync } from 'node:fs';
import { expect } from 'chai';
import chemistry from '../../lib/chemistry/index.js';
import type { FiringBlock } from '../../lib/cones/firing.js';
import recipe from '../../lib/recipe/index.js';
import type { ConeFit, RecipeMessage } from '../../lib/recipe/index.js';
import { blockOf, measure } from '../../scripts/cone-fit-check.mjs';
import { recipeText } from '../mcp/words.ts';

// Chemistry against the stated cone (lib/recipe/cone-fit.js, docs/adr/0022):
// a note only when boron (against Katz) and silica or alumina (against
// Hesselberth & Roy, or the UK limits at low fire) agree on a band outside
// every band the firing covers; "can't judge" where the figures do not reach.

const { coneFit, CONE_FIT } = recipe;
const orton = (low: string, high?: string, more: Partial<FiringBlock> = {}): FiringBlock => ({
  scale: 'orton',
  low,
  ...(high && { high }),
  ...more
});
/** A plain glaze's fluxes, with what the test sets for boron, silica and alumina. */
const glaze = (B2O3: number, SiO2: number, Al2O3: number, more: Record<string, number> = {}) => ({
  K2O: 0.12,
  Na2O: 0.1,
  CaO: 0.6,
  MgO: 0.18,
  B2O3,
  SiO2,
  Al2O3,
  ...more
});
const fit = (...args: Parameters<typeof coneFit>): ConeFit => coneFit(...args)!;
const english = (message: RecipeMessage) => recipeText(message, 'en');
const text = (result: ConeFit) => result.sentences.map(english).join(' ');

describe('chemistry against the stated cone (lib/recipe/cone-fit.js)', () => {
  it("reads Katz's rule from cone 10 at 1305 °C, his original figure", () => {
    expect(chemistry.boronFor(1305)).to.equal(0);
    expect(chemistry.boronFor(1222)).to.be.closeTo(0.166, 0.001);
    expect(chemistry.boronFor(1060)).to.be.closeTo(0.49, 0.001);
  });

  it('takes its silica and alumina from Hesselberth & Roy, whatever set the page shows', () => {
    expect(CONE_FIT.floor.mid).to.eql({ SiO2: 2.5, Al2O3: 0.25 });
    expect(CONE_FIT.floor.high).to.eql({ SiO2: 3.0, Al2O3: 0.3 });
    expect(CONE_FIT.ceiling).to.eql({ low: 3.0, mid: 4.0 });
  });

  it('says nothing with no firing to judge against', () => {
    expect(coneFit(glaze(0.2, 3, 0.3), null)).to.equal(null);
    expect(coneFit(glaze(0.2, 3, 0.3), '')).to.equal(null);
    expect(coneFit(glaze(0.2, 3, 0.3), { scale: 'orton' })).to.equal(null);
  });

  it("notes a low-fire glaze stated for cone 10, firmly, with Katz's and Hesselberth & Roy's figures", () => {
    const result = fit(glaze(0.52, 2.3, 0.32), orton('10'));
    expect(result.verdict).to.equal('cooler');
    expect(result.looksLike).to.equal('low');
    expect(result.strength).to.equal('firm');
    expect(result.signals.map((s) => [s.key, s.side, s.source])).to.eql([
      ['B2O3', 'above', 'katz'],
      ['SiO2', 'below', 'hesselberth-roy']
    ]);
    expect(result.sources.map((s) => s.id)).to.eql(['katz', 'hesselberth-roy']);
    expect(text(result)).to.equal(
      "This glaze's chemistry looks more like a low-fire glaze than one for cone 10. It has more boron (0.52) than glazes at cone 10 usually need, and less silica (2.30) than they usually have. At that firing it may run or over-melt: fire a test tile on a catch plate first. This compares the chemistry with published figures: it is a guide, not a test. If the glaze has fired well for you at this cone, trust your tiles."
    );
  });

  it('needs both signals: boron alone, or silica alone, gives no note', () => {
    expect(fit(glaze(0.52, 3.6, 0.45), orton('10')).verdict).to.equal('fits');
    expect(fit(glaze(0, 2.2, 0.45), orton('10')).verdict).to.equal('fits');
    expect(fit(glaze(0.5, 4.6, 0.4), orton('04')).verdict).to.equal('fits', 'silica alone');
    expect(fit(glaze(0.1, 2.8, 0.3), orton('04')).verdict).to.equal('fits', 'boron alone');
  });

  it('puts the boron edge at need + 0.30 and the floors at their figures, as shown (two decimals)', () => {
    // Cone 10: need 0, so 0.30 is enough boron; alumina 0.29 is under 0.30, 0.30 is not.
    expect(fit(glaze(0.3, 3.2, 0.29), orton('10')).verdict).to.equal('cooler');
    expect(fit(glaze(0.29, 3.2, 0.29), orton('10')).verdict).to.equal('fits');
    expect(fit(glaze(0.3, 3.2, 0.3), orton('10')).verdict).to.equal('fits');
    // Cone 6 (1222 °C): need 0.166, so boron from 0.47 (as shown) with alumina under 0.25.
    expect(fit(glaze(0.47, 3, 0.24), orton('6')).verdict).to.equal('cooler');
    expect(fit(glaze(0.46, 3, 0.24), orton('6')).verdict).to.equal('fits');
  });

  it('says softly that a cone 10 glaze may be nearer cone 6, and that a cone 6 one may be nearer cone 10', () => {
    // Cooler than cone 10, but not cooler than cone 6: it looks like mid fire.
    const cooler = fit(glaze(0.4, 2.8, 0.35), orton('10'));
    expect([cooler.verdict, cooler.looksLike, cooler.strength]).to.eql(['cooler', 'mid', 'soft']);
    expect(english(cooler.sentences[0]!)).to.contain('nearer cone 6').and.contain('only roughly');
    const hotter = fit(glaze(0, 4.4, 0.44), orton('6'));
    expect([hotter.verdict, hotter.looksLike, hotter.strength]).to.eql(['hotter', 'high', 'soft']);
    expect(text(hotter)).to.contain('only a hint');
    expect(text(hotter)).to.contain('It has little boron (0.00) for cone 6, and more silica (4.40)');
  });

  it('notes a high-fire glaze stated for low fire, and warns about food surfaces', () => {
    const result = fit(glaze(0, 4.4, 0.4), orton('04'));
    expect([result.verdict, result.looksLike, result.strength]).to.eql(['hotter', 'high', 'firm']);
    expect(result.signals.map((s) => s.source)).to.eql(['katz', 'uk']);
    expect(text(result)).to.contain('looks more like a high-fire glaze than one for cone 04');
    expect(text(result)).to.contain('where food or drink will touch');
    // Boron enough for cone 6 but not cone 04: it looks like mid fire.
    expect(fit(glaze(0.2, 3.4, 0.35), orton('04')).looksLike).to.equal('mid');
  });

  it('judges a range at its ends: cooler than the coolest, or hotter than the hottest', () => {
    // Too much boron for cone 5, the cooler end of 5–6.
    expect(fit(glaze(0.6, 3, 0.22), orton('5', '6')).verdict).to.equal('cooler');
    // Hot for cone 04 but not for cone 03, the hotter end of 04–03: no note.
    expect(fit(glaze(0.3, 3.1, 0.27), orton('04')).verdict).to.equal('hotter');
    expect(fit(glaze(0.3, 3.1, 0.27), orton('04', '03')).verdict).to.equal('fits');
  });

  it('says which end of a range across bands the chemistry looks closer to, without a note', () => {
    const toSix = fit(glaze(0.4, 2.8, 0.35), orton('6', '10'));
    expect(toSix.verdict).to.equal('closer');
    expect(toSix.closerTo).to.eql({ scale: 'orton', cone: '6' });
    expect(toSix.strength).to.equal(null);
    expect(toSix.stated.bands).to.eql(['mid', 'high']);
    expect(english(toSix.sentences[0]!)).to.equal(
      "Of the range it is stated for, this glaze's chemistry looks closer to the cone 6 end."
    );
    expect(english(toSix.sentences[1]!)).to.contain('than glazes at cone 10 usually need');
    const toTen = fit(glaze(0, 4.4, 0.44), orton('6', '10'));
    expect([toTen.verdict, toTen.closerTo?.cone]).to.eql(['closer', '10']);
    // Outside both bands of the range is still a note.
    const low = fit(glaze(0.7, 2.2, 0.2), orton('6', '10'));
    expect([low.verdict, low.looksLike]).to.eql(['cooler', 'low']);
    expect(english(fit(glaze(0.2, 3.4, 0.35), orton('6', '10')).sentences[0]!)).to.contain('cone 6–10');
  });

  it('reads SK cones by Kyoto’s measured bends, SK 12 as cone 10, and says when there is no temperature', () => {
    const sk8 = fit(glaze(0.2, 3.4, 0.35), { scale: 'sk', low: '8' });
    expect(sk8.stated.ends[0]).to.include({ celsius: 1198, basis: 'kyoto', band: 'mid' });
    const sk12 = fit(glaze(0.52, 2.3, 0.32), { scale: 'sk', low: '12' });
    expect(sk12.stated.ends[0]).to.include({ celsius: 1305, band: 'high' });
    expect(sk12.verdict).to.equal('cooler');
    expect(english(sk12.sentences[0]!)).to.contain('than one for SK 12');
    const sk6a = fit(glaze(0.2, 3.4, 0.35), { scale: 'sk', low: '6a' });
    expect([sk6a.verdict, sk6a.skipped]).to.eql(['skipped', 'noTemperature']);
    expect(text(sk6a)).to.contain('with SK 6a: there is no measured temperature');
    // Past cone 10 the reason is that, with a figure or without.
    expect(fit(glaze(0.2, 3.4, 0.35), orton('16')).skipped).to.equal('aboveChart');
    expect(fit(glaze(0.2, 3.4, 0.35), { scale: 'sk', low: '15' }).skipped).to.equal('aboveChart');
  });

  it("does not judge a firing hotter than cone 10, where Katz's rule and Hesselberth & Roy's figures end", () => {
    const plain = glaze(0, 4, 0.45);
    for (const cone of ['10.5', '11', '12', '13', '14', '14.5', '15', '16', '20', '42']) {
      const result = fit(plain, orton(cone));
      expect([result.verdict, result.skipped], cone).to.eql(['skipped', 'aboveChart']);
      expect(result.signals, cone).to.eql([]);
    }
    // Cone 10 itself is judged, at 1305 °C; a temperature a degree past it is not.
    expect(fit(plain, orton('10')).verdict).to.equal('fits');
    expect(fit(plain, { scale: 'temperature', low: '1305' }).verdict).to.equal('fits');
    expect(fit(plain, { scale: 'temperature', low: '1306' }).skipped).to.equal('aboveChart');
    // SK by Kyoto's columns: SK 12 stands for cone 10, SK 13 is near Orton 11.
    expect(fit(plain, { scale: 'sk', low: '12' }).verdict).to.equal('fits');
    expect(fit(plain, { scale: 'sk', low: '13' }).skipped).to.equal('aboveChart');
    // The 'top' band chosen by hand (cone 12 up) has no cone to be read at.
    const top = fit(plain, 'top');
    expect([top.verdict, top.skipped]).to.eql(['skipped', 'aboveChart']);
    expect(top.stated).to.deep.include({ bands: ['top'], chosen: 'top' });
    expect(text(top)).to.contain('with very high fire: Katz');
    // Said in words, with the cone and the figures' range.
    const words = text(fit(plain, orton('14')));
    expect(words).to.contain("can't compare this glaze's chemistry with cone 14");
    expect(words).to.contain('cone 06 to cone 10');
    expect(words).to.contain('that firing is hotter');
    // The stated firing keeps its figure and band where it has one: cone 14 at 1366 °C, past every limit set.
    expect(fit(plain, orton('14')).stated.ends[0]).to.include({ cone: '14', celsius: 1366, band: 'top' });
    expect(fit(plain, orton('16')).stated.ends[0]).to.include({ cone: '16', band: 'top' });
    expect(fit(plain, orton('16')).stated.ends[0]).not.to.have.property('celsius');
  });

  it('still notes a range from within the figures (cone 9–12) that looks cooler than its coolest cone, and judges nothing else', () => {
    // A low-fire glaze stated 9–12 looks cooler than cone 9, and so than every cone of the range.
    const low = fit(glaze(0.52, 2.3, 0.32), orton('9', '12'));
    expect([low.verdict, low.looksLike]).to.eql(['cooler', 'low']);
    expect(english(low.sentences[0]!)).to.contain('than one for cone 9');
    expect(low.stated.bands).to.eql(['high', 'top']);
    // Anything else is not judged: the cone 12 end is past the figures.
    const plain = fit(glaze(0, 4, 0.45), orton('10', '11'));
    expect([plain.verdict, plain.skipped]).to.eql(['skipped', 'aboveChart']);
    expect(text(plain)).to.contain('with cone 11');
    // Nor "closer": a range across bands to past cone 10 is not judged at its hot end.
    expect(fit(glaze(0.1, 3.2, 0.3), orton('6', '12')).verdict).to.equal('skipped');
  });

  it('reads a temperature as stated', () => {
    const result = fit(glaze(0.52, 2.3, 0.32), { scale: 'temperature', low: '1290' });
    expect(result.stated.ends[0]).to.include({ celsius: 1290, basis: 'stated', band: 'high' });
    expect(english(result.sentences[0]!)).to.contain('than one for 1290 °C');
  });

  it('reads a band chosen by hand at its cone: 04, 6 or 10', () => {
    const high = fit(glaze(0.52, 2.3, 0.32), 'high');
    expect(high.stated).to.deep.include({ bands: ['high'], chosen: 'high' });
    expect(high.stated.ends[0]).to.include({ cone: '10', celsius: 1305 });
    expect(english(high.sentences[0]!)).to.contain('than one for high fire');
    expect(fit(glaze(0, 3.6, 0.4), 'low').verdict).to.equal('hotter');
    expect(text(fit(glaze(0.2, 3.4, 0.35), 'mid'))).to.contain('do not point away from mid fire');
    // A chosen band brings no process; the recipe's are passed in.
    expect(fit(glaze(0.2, 3.4, 0.35), 'mid', { processes: ['soda'] }).skipped).to.equal('process');
  });

  it("can't judge lead, lithium, much soda and potash, much zinc, or a formula that is not a usual glaze's", () => {
    const skip = (more: Record<string, number>, B = 0.2, Si = 3.2, Al = 0.3) =>
      fit(glaze(B, Si, Al, more), orton('6')).skipped;
    expect(skip({ PbO: 0.06 })).to.equal('lead');
    expect(skip({ PbO: 0.05 })).to.equal(undefined);
    expect(skip({ Li2O: 0.1 })).to.equal('lithium');
    expect(skip({ Li2O: 0.09 })).to.equal(undefined);
    expect(skip({ K2O: 0.25, Na2O: 0.2 })).to.equal('alkali');
    expect(skip({ ZnO: 0.3 })).to.equal('zinc');
    expect(skip({}, 0.2, 0.9)).to.equal('notGlaze');
    expect(skip({}, 0.2, 8.1)).to.equal('notGlaze');
    expect(skip({ CuO: 0.3, MnO: 0.25 })).to.equal('notGlaze');
    expect(text(fit(glaze(0.2, 3.2, 0.3, { Li2O: 0.2 }), orton('6')))).to.equal(
      "Glazecalc can't compare this glaze's chemistry with its firing: much of its melt comes from lithium, which the published figures this check uses don't cover."
    );
  });

  it("can't judge raku, salt, soda, wood or pit firings, or ash; bone ash and soda ash are not ash", () => {
    const result = fit(glaze(0.52, 2.3, 0.32), orton('10', undefined, { processes: ['salt'] }));
    expect([result.verdict, result.skipped]).to.eql(['skipped', 'process']);
    expect(text(result)).to.contain('it is for a salt firing');
    expect(fit(glaze(0.52, 2.3, 0.32), orton('10'), { materials: ['Wood Ash'] }).skipped).to.equal('ash');
    expect(fit(glaze(0.52, 2.3, 0.32), orton('10'), { materials: ['Ash, rice straw'] }).skipped).to.equal('ash');
    expect(fit(glaze(0.52, 2.3, 0.32), orton('10'), { materials: ['Bone Ash', 'Soda Ash'] }).verdict).to.equal(
      'cooler'
    );
    // Reduction and oxidation are atmospheres, not processes: they are judged.
    expect(fit(glaze(0.52, 2.3, 0.32), orton('10', undefined, { atmospheres: ['reduction'] })).verdict).to.equal(
      'cooler'
    );
  });

  it("can't judge cones 01 to 3, between low and mid fire, nor below Katz's cone 06", () => {
    for (const cone of ['01', '1', '3']) expect(fit(glaze(0.2, 3, 0.3), orton(cone)).skipped, cone).to.equal('between');
    expect(fit(glaze(0.2, 3, 0.3), orton('02')).verdict).to.equal('fits');
    expect(fit(glaze(0.2, 3, 0.3), orton('4')).verdict).to.equal('fits');
    expect(fit(glaze(0.2, 3, 0.3), orton('04', '1')).skipped).to.equal('between');
    expect(fit(glaze(0.2, 3, 0.3), orton('08', '04')).skipped).to.equal('belowChart');
    expect(fit(glaze(0.2, 3, 0.3), orton('06')).verdict).to.equal('fits');
  });

  it('mentions Gerstley borate with a "cooler" note, and keeps its last sentence the guide', () => {
    const result = fit(glaze(0.76, 3.25, 0.24), orton('5', '6'), { materials: ['Gerstley Borate', 'Silica'] });
    expect(result.gerstley).to.equal(true);
    expect(result.sentences.map((s) => s.code)).to.eql([
      'coneFit.cooler',
      'coneFit.coolerAlumina',
      'coneFit.coolerEffect',
      'coneFit.gerstley',
      'coneFit.guide'
    ]);
  });

  it('never words "no note" as a pass', () => {
    const result = fit(glaze(0.2, 3.4, 0.35), orton('6'));
    expect(result.verdict).to.equal('fits');
    expect(text(result)).to.equal(
      'Its boron, silica and alumina do not point away from cone 6. This is a guide, not a test: it says nothing about whether the glaze is stable or food safe.'
    );
  });

  it('formats every message it can say in English', () => {
    const codes = recipe.CODES.filter((code) => code.startsWith('coneFit.'));
    const english = JSON.parse(readFileSync('client/public/i18n/recipe/en.json', 'utf8'));
    for (const code of codes) {
      const said = recipeText(
        {
          code,
          params: {
            scale: 'orton',
            cone: '6',
            band: 'mid',
            looksLike: 'low',
            process: 'raku',
            boron: recipe.figure(0.5, 2),
            silica: recipe.figure(2.2, 2),
            alumina: recipe.figure(0.2, 2)
          }
        },
        'en'
      );
      expect(said, code).not.to.equal(code);
      expect(said, code).not.to.match(/[{}]/);
    }
    expect(english.coneFit.sources).to.equal('Sources:');
  });
});

describe('the cone check on its test set (scripts/cone-fit-check.mjs)', () => {
  const set = JSON.parse(readFileSync('scripts/cone-fit-test-set.json', 'utf8'));
  const { results, bands } = measure(set);
  const verdictOf = (id: number) => results.find((r) => r.row.id === id)?.fit?.verdict;

  it("reads Glazy's cones as firing blocks", () => {
    expect(blockOf({ cone: '9 - 10' })).to.eql({ scale: 'orton', low: '9', high: '10' });
    expect(blockOf({ cone: '04', atmospheres: ['Oxidation', 'Salt'] })).to.eql({
      scale: 'orton',
      low: '04',
      processes: ['salt']
    });
  });

  it("gives the core standards no note, and can't judge the lead, lithium, alkali and ash glazes", () => {
    for (const id of [1657, 2008, 1822, 2592, 2696, 2594, 1357, 1570, 2440, 240, 338, 229, 2965, 2821, 372, 86, 584]) {
      expect(verdictOf(id), String(id)).to.equal('fits');
    }
    for (const id of [1669, 1925, 1977, 2767, 1580, 912, 29306, 2989, 59, 863]) {
      expect(verdictOf(id), String(id)).to.equal('skipped');
    }
  });

  it('keeps the Digitalfire and Katz rows to a code, a name and a cone', () => {
    for (const row of set.rows.filter((r: { source: string }) => r.source !== 'glazy')) {
      expect(row).not.to.have.property('unity');
      expect(row).not.to.have.property('materials');
    }
  });

  it('gives the notes it gives today: a change to the rule shows here', () => {
    const notes = results
      .filter((r) => r.fit?.verdict === 'cooler' || r.fit?.verdict === 'hotter')
      .map((r) => r.row.id);
    // Bloomfield's low-fire transparent (Glazy, Testing), Behrens Spinach Green (50% Gerstley
    // borate) and Broken Blue (a Gillespie borate cone 6 glaze): see the ADR.
    expect(notes).to.eql([197276, 5775, 351604]);
    expect(bands['high']!.notes).to.equal(0);
  });
});
