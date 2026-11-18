// Chemistry against the stated cone (lib/core/recipe/cone-fit.js, docs/adr/0022): a note only when boron
// (against Katz) and silica or alumina (against Hesselberth & Roy, or the UK limits at low fire) agree on a
// band outside every band the firing covers; "can't judge" where the figures do not reach. Small cases of
// our own; the app's test set (scripts/) stays in the app.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { CONE_FIT, coneFit } from '../recipe/cone-fit.ts';
import { boronFor } from '../chemistry/index.ts';
import { CODES } from '../recipe/messages.ts';
import { HOST } from './support.js';

const orton = (low, high, more = {}) => ({ scale: 'orton', low, ...(high && { high }), ...more });
/** A plain glaze's fluxes, with what the test sets for boron, silica and alumina. */
const glaze = (B2O3, SiO2, Al2O3, more = {}) => ({
  K2O: 0.12,
  Na2O: 0.1,
  CaO: 0.6,
  MgO: 0.18,
  B2O3,
  SiO2,
  Al2O3,
  ...more
});
const near = (actual, expected, within) => assert.ok(Math.abs(actual - expected) <= within, `${actual} vs ${expected}`);
const codes = (result) => result.sentences.map((s) => s.code);

describe('cone fit: its figures', () => {
  test("reads Katz's rule from cone 10 at 1305 °C", () => {
    assert.equal(boronFor(1305), 0);
    near(boronFor(1222), 0.166, 0.001);
    near(boronFor(1060), 0.49, 0.001);
  });

  test('takes its silica and alumina from Hesselberth & Roy', () => {
    assert.deepEqual(CONE_FIT.floor.mid, { SiO2: 2.5, Al2O3: 0.25 });
    assert.deepEqual(CONE_FIT.floor.high, { SiO2: 3.0, Al2O3: 0.3 });
    assert.deepEqual(CONE_FIT.ceiling, { low: 3.0, mid: 4.0 });
  });

  test('says nothing with no firing to judge against', () => {
    assert.equal(coneFit(HOST, glaze(0.2, 3, 0.3), null), null);
    assert.equal(coneFit(HOST, glaze(0.2, 3, 0.3), ''), null);
    assert.equal(coneFit(HOST, glaze(0.2, 3, 0.3), 'warm'), null);
    assert.equal(coneFit(HOST, glaze(0.2, 3, 0.3), { scale: 'orton' }), null);
  });
});

describe('cone fit: notes', () => {
  test('notes a low-fire glaze stated for cone 10, firmly, with its figures', () => {
    const result = coneFit(HOST, glaze(0.52, 2.3, 0.32), orton('10'));
    assert.deepEqual([result.verdict, result.looksLike, result.strength], ['cooler', 'low', 'firm']);
    assert.deepEqual(
      result.signals.map((s) => [s.key, s.side, s.source]),
      [
        ['B2O3', 'above', 'katz'],
        ['SiO2', 'below', 'hesselberth-roy']
      ]
    );
    assert.deepEqual(
      result.sources.map((s) => s.id),
      ['katz', 'hesselberth-roy']
    );
    assert.deepEqual(codes(result), [
      'coneFit.cooler',
      'coneFit.coolerSilica',
      'coneFit.coolerEffect',
      'coneFit.guide'
    ]);
    assert.deepEqual(result.sentences[0].params, { scale: 'orton', cone: '10', looksLike: 'low' });
    assert.deepEqual(result.sentences[1].params, {
      scale: 'orton',
      cone: '10',
      boron: { value: 0.52, places: 2 },
      silica: { value: 2.3, places: 2 },
      alumina: { value: 0.32, places: 2 }
    });
    assert.equal(result.stated.ends[0].celsius, 1305);
  });

  test('needs both signals: boron alone, or silica alone, gives no note', () => {
    assert.equal(coneFit(HOST, glaze(0.52, 3.6, 0.45), orton('10')).verdict, 'fits');
    assert.equal(coneFit(HOST, glaze(0, 2.2, 0.45), orton('10')).verdict, 'fits');
    assert.equal(coneFit(HOST, glaze(0.5, 4.6, 0.4), orton('04')).verdict, 'fits');
    assert.equal(coneFit(HOST, glaze(0.1, 2.8, 0.3), orton('04')).verdict, 'fits');
  });

  test('puts the boron edge at need + 0.30 and the floors at their figures, as shown', () => {
    assert.equal(coneFit(HOST, glaze(0.3, 3.2, 0.29), orton('10')).verdict, 'cooler');
    assert.deepEqual(codes(coneFit(HOST, glaze(0.3, 3.2, 0.29), orton('10')))[1], 'coneFit.coolerAlumina');
    assert.equal(coneFit(HOST, glaze(0.29, 3.2, 0.29), orton('10')).verdict, 'fits');
    assert.equal(coneFit(HOST, glaze(0.3, 3.2, 0.3), orton('10')).verdict, 'fits');
    assert.equal(coneFit(HOST, glaze(0.47, 3, 0.24), orton('6')).verdict, 'cooler');
    assert.equal(coneFit(HOST, glaze(0.46, 3, 0.24), orton('6')).verdict, 'fits');
    // Both silica and alumina low.
    assert.equal(codes(coneFit(HOST, glaze(0.5, 2.8, 0.25), orton('10')))[1], 'coneFit.coolerBoth');
  });

  test('says softly that a cone 10 glaze may be nearer cone 6, and a cone 6 one nearer cone 10', () => {
    const cooler = coneFit(HOST, glaze(0.4, 2.8, 0.35), orton('10'));
    assert.deepEqual([cooler.verdict, cooler.looksLike, cooler.strength], ['cooler', 'mid', 'soft']);
    assert.equal(cooler.sentences[0].code, 'coneFit.coolerSoft');
    const hotter = coneFit(HOST, glaze(0, 4.4, 0.44), orton('6'));
    assert.deepEqual([hotter.verdict, hotter.looksLike, hotter.strength], ['hotter', 'high', 'soft']);
    assert.deepEqual(codes(hotter), [
      'coneFit.hotterSoft',
      'coneFit.hotterSilica',
      'coneFit.hotterEffectSoft',
      'coneFit.guide'
    ]);
    assert.deepEqual(hotter.sentences[1].params.boron, { value: 0, places: 2 });
    assert.deepEqual(hotter.sentences[1].params.silica, { value: 4.4, places: 2 });
  });

  test('notes a high-fire glaze stated for low fire, firmly', () => {
    const result = coneFit(HOST, glaze(0, 4.4, 0.4), orton('04'));
    assert.deepEqual([result.verdict, result.looksLike, result.strength], ['hotter', 'high', 'firm']);
    assert.deepEqual(
      result.signals.map((s) => s.source),
      ['katz', 'uk']
    );
    assert.deepEqual(codes(result), [
      'coneFit.hotter',
      'coneFit.hotterSilica',
      'coneFit.hotterEffect',
      'coneFit.guide'
    ]);
    // Boron enough for cone 6 but not cone 04: it looks like mid fire.
    assert.equal(coneFit(HOST, glaze(0.2, 3.4, 0.35), orton('04')).looksLike, 'mid');
  });

  test('judges a range at its ends: cooler than the coolest, or hotter than the hottest', () => {
    assert.equal(coneFit(HOST, glaze(0.6, 3, 0.22), orton('5', '6')).verdict, 'cooler');
    assert.equal(coneFit(HOST, glaze(0.3, 3.1, 0.27), orton('04')).verdict, 'hotter');
    assert.equal(coneFit(HOST, glaze(0.3, 3.1, 0.27), orton('04', '03')).verdict, 'fits');
  });

  test('says which end of a range across bands the chemistry looks closer to, without a note', () => {
    const toSix = coneFit(HOST, glaze(0.4, 2.8, 0.35), orton('6', '10'));
    assert.equal(toSix.verdict, 'closer');
    assert.deepEqual(toSix.closerTo, { scale: 'orton', cone: '6' });
    assert.equal(toSix.strength, null);
    assert.deepEqual(toSix.stated.bands, ['mid', 'high']);
    assert.deepEqual(toSix.sentences[0], { code: 'coneFit.closer', params: { scale: 'orton', cone: '6' } });
    assert.equal(toSix.sentences[1].code, 'coneFit.coolerSilica');
    assert.deepEqual(codes(toSix).at(-1), 'coneFit.guide');
    const toTen = coneFit(HOST, glaze(0, 4.4, 0.44), orton('6', '10'));
    assert.deepEqual([toTen.verdict, toTen.closerTo.cone], ['closer', '10']);
    // Outside both bands of the range is still a note.
    const low = coneFit(HOST, glaze(0.7, 2.2, 0.2), orton('6', '10'));
    assert.deepEqual([low.verdict, low.looksLike], ['cooler', 'low']);
    // A fit across a range names both ends.
    assert.deepEqual(coneFit(HOST, glaze(0.2, 3.4, 0.35), orton('6', '10')).sentences[0], {
      code: 'coneFit.fits',
      params: { scale: 'orton', cone: '6', coneTo: '10' }
    });
  });

  test('mentions Gerstley borate with a "cooler" note, and keeps its last sentence the guide', () => {
    const result = coneFit(HOST, glaze(0.76, 3.25, 0.24), orton('5', '6'), { gerstley: true });
    assert.equal(result.gerstley, true);
    assert.deepEqual(codes(result), [
      'coneFit.cooler',
      'coneFit.coolerAlumina',
      'coneFit.coolerEffect',
      'coneFit.gerstley',
      'coneFit.guide'
    ]);
    const fits = coneFit(HOST, glaze(0.2, 3.4, 0.35), orton('6'), { gerstley: true });
    assert.equal(fits.gerstley, true);
    assert.equal(coneFit(HOST, glaze(0.2, 3.4, 0.35), orton('6')).gerstley, undefined);
  });

  test('never calls "no note" a pass', () => {
    const result = coneFit(HOST, glaze(0.2, 3.4, 0.35), orton('6'));
    assert.equal(result.verdict, 'fits');
    assert.equal(result.looksLike, null);
    assert.deepEqual(result.signals, []);
    assert.deepEqual(result.sentences, [{ code: 'coneFit.fits', params: { scale: 'orton', cone: '6' } }]);
  });

  test('says only codes it declares', () => {
    const cases = [
      [glaze(0.52, 2.3, 0.32), orton('10'), { gerstley: true }],
      [glaze(0, 4.4, 0.44), orton('6')],
      [glaze(0, 4.4, 0.4), orton('04')],
      [glaze(0.4, 2.8, 0.35), orton('6', '10')],
      [glaze(0.2, 3, 0.3), orton('1')],
      [glaze(0.2, 3, 0.3, { Li2O: 0.2 }), orton('6')],
      [glaze(0.2, 3, 0.3), 'top']
    ];
    for (const [unity, firing, options] of cases) {
      for (const code of codes(coneFit(HOST, unity, firing, options))) assert.ok(CODES.includes(code), code);
    }
  });
});

describe('cone fit: firings', () => {
  test('reads SK cones by Kyoto’s measured bends, SK 12 as cone 10, and says when there is no temperature', () => {
    const sk8 = coneFit(HOST, glaze(0.2, 3.4, 0.35), { scale: 'sk', low: '8' });
    assert.deepEqual(sk8.stated.ends[0], { scale: 'sk', cone: '8', band: 'mid', celsius: 1198, basis: 'kyoto' });
    const sk12 = coneFit(HOST, glaze(0.52, 2.3, 0.32), { scale: 'sk', low: '12' });
    assert.equal(sk12.stated.ends[0].celsius, 1305);
    assert.equal(sk12.stated.ends[0].band, 'high');
    assert.equal(sk12.verdict, 'cooler');
    assert.deepEqual(sk12.sentences[0].params, { scale: 'sk', cone: '12', looksLike: 'low' });
    const sk6a = coneFit(HOST, glaze(0.2, 3.4, 0.35), { scale: 'sk', low: '6a' });
    assert.deepEqual([sk6a.verdict, sk6a.skipped], ['skipped', 'noTemperature']);
    assert.deepEqual(sk6a.sentences, [{ code: 'coneFit.skip.noTemperature', params: { scale: 'sk', cone: '6a' } }]);
    assert.equal(coneFit(HOST, glaze(0.2, 3.4, 0.35), orton('16')).skipped, 'aboveChart');
    assert.equal(coneFit(HOST, glaze(0.2, 3.4, 0.35), { scale: 'sk', low: '15' }).skipped, 'aboveChart');
  });

  test("does not judge a firing hotter than cone 10, where Katz's rule and Hesselberth & Roy's figures end", () => {
    const plain = glaze(0, 4, 0.45);
    for (const cone of ['10.5', '11', '12', '13', '14', '14.5', '15', '16', '20', '42']) {
      const result = coneFit(HOST, plain, orton(cone));
      assert.deepEqual([result.verdict, result.skipped], ['skipped', 'aboveChart'], cone);
      assert.deepEqual(result.signals, [], cone);
    }
    assert.equal(coneFit(HOST, plain, orton('10')).verdict, 'fits');
    assert.equal(coneFit(HOST, plain, { scale: 'temperature', low: '1305' }).verdict, 'fits');
    assert.equal(coneFit(HOST, plain, { scale: 'temperature', low: '1306' }).skipped, 'aboveChart');
    assert.equal(coneFit(HOST, plain, { scale: 'sk', low: '12' }).verdict, 'fits');
    assert.equal(coneFit(HOST, plain, { scale: 'sk', low: '13' }).skipped, 'aboveChart');
    const top = coneFit(HOST, plain, 'top');
    assert.deepEqual([top.verdict, top.skipped], ['skipped', 'aboveChart']);
    assert.deepEqual(top.stated.bands, ['top']);
    assert.equal(top.stated.chosen, 'top');
    assert.deepEqual(top.sentences, [{ code: 'coneFit.skip.aboveChart', params: { scale: 'band', band: 'top' } }]);
    assert.deepEqual(coneFit(HOST, plain, orton('14')).sentences[0].params, { scale: 'orton', cone: '14' });
    assert.deepEqual(coneFit(HOST, plain, orton('14')).stated.ends[0], {
      scale: 'orton',
      cone: '14',
      band: 'top',
      celsius: 1366,
      basis: 'orton-150'
    });
    const sixteen = coneFit(HOST, plain, orton('16')).stated.ends[0];
    assert.equal(sixteen.band, 'top');
    assert.equal('celsius' in sixteen, false);
  });

  test('still notes a range from within the figures (cone 9–12) that looks cooler than its coolest cone', () => {
    const low = coneFit(HOST, glaze(0.52, 2.3, 0.32), orton('9', '12'));
    assert.deepEqual([low.verdict, low.looksLike], ['cooler', 'low']);
    assert.deepEqual(low.sentences[0].params, { scale: 'orton', cone: '9', looksLike: 'low' });
    assert.deepEqual(low.stated.bands, ['high', 'top']);
    const plain = coneFit(HOST, glaze(0, 4, 0.45), orton('10', '11'));
    assert.deepEqual([plain.verdict, plain.skipped], ['skipped', 'aboveChart']);
    assert.deepEqual(plain.sentences[0].params, { scale: 'orton', cone: '11' });
    assert.equal(coneFit(HOST, glaze(0.1, 3.2, 0.3), orton('6', '12')).verdict, 'skipped');
  });

  test('reads a temperature as stated', () => {
    const result = coneFit(HOST, glaze(0.52, 2.3, 0.32), { scale: 'temperature', low: '1290' });
    assert.deepEqual(result.stated.ends[0], {
      scale: 'temperature',
      cone: '1290',
      band: 'high',
      celsius: 1290,
      basis: 'stated'
    });
    assert.deepEqual(result.sentences[0].params, { scale: 'temperature', cone: '1290', looksLike: 'low' });
  });

  test('reads a band chosen by hand at its cone: 04, 6 or 10', () => {
    const high = coneFit(HOST, glaze(0.52, 2.3, 0.32), 'high');
    assert.deepEqual(high.stated.bands, ['high']);
    assert.equal(high.stated.chosen, 'high');
    assert.deepEqual(high.stated.ends[0], {
      scale: 'band',
      cone: '10',
      band: 'high',
      celsius: 1305,
      basis: 'orton-150'
    });
    assert.deepEqual(high.sentences[0].params, { scale: 'band', band: 'high', looksLike: 'low' });
    assert.equal(coneFit(HOST, glaze(0, 3.6, 0.4), 'low').verdict, 'hotter');
    assert.deepEqual(coneFit(HOST, glaze(0.2, 3.4, 0.35), 'mid').sentences, [
      { code: 'coneFit.fits', params: { scale: 'band', band: 'mid' } }
    ]);
    // A chosen band brings no process; the recipe's are passed in.
    assert.equal(coneFit(HOST, glaze(0.2, 3.4, 0.35), 'mid', { processes: ['soda'] }).skipped, 'process');
  });

  test("can't judge lead, lithium, much soda and potash, much zinc, or a formula that is not a usual glaze's", () => {
    const skip = (more, B = 0.2, Si = 3.2, Al = 0.3) => coneFit(HOST, glaze(B, Si, Al, more), orton('6')).skipped;
    assert.equal(skip({ PbO: 0.06 }), 'lead');
    assert.equal(skip({ PbO: 0.05 }), undefined);
    assert.equal(skip({ Li2O: 0.1 }), 'lithium');
    assert.equal(skip({ Li2O: 0.09 }), undefined);
    assert.equal(skip({ K2O: 0.25, Na2O: 0.2 }), 'alkali');
    assert.equal(skip({ ZnO: 0.3 }), 'zinc');
    assert.equal(skip({}, 0.2, 0.9), 'notGlaze');
    assert.equal(skip({}, 0.2, 8.1), 'notGlaze');
    assert.equal(skip({ CuO: 0.3, MnO: 0.25 }), 'notGlaze');
    assert.deepEqual(coneFit(HOST, glaze(0.2, 3.2, 0.3, { Li2O: 0.2 }), orton('6')).sentences, [
      { code: 'coneFit.skip.lithium', params: { scale: 'orton', cone: '6' } }
    ]);
    // No unity formula at all is not a glaze's.
    assert.equal(coneFit(HOST, undefined, orton('6')).skipped, 'notGlaze');
  });

  test("can't judge raku, salt, soda, wood or pit firings, or ash; atmospheres are judged", () => {
    const result = coneFit(HOST, glaze(0.52, 2.3, 0.32), orton('10', undefined, { processes: ['salt'] }));
    assert.deepEqual([result.verdict, result.skipped], ['skipped', 'process']);
    assert.deepEqual(result.sentences[0].params, { scale: 'orton', cone: '10', process: 'salt' });
    assert.equal(coneFit(HOST, glaze(0.52, 2.3, 0.32), orton('10'), { ash: true }).skipped, 'ash');
    assert.equal(coneFit(HOST, glaze(0.52, 2.3, 0.32), orton('10'), { ash: 'yes' }).verdict, 'cooler');
    assert.equal(
      coneFit(HOST, glaze(0.52, 2.3, 0.32), orton('10', undefined, { atmospheres: ['reduction'] })).verdict,
      'cooler'
    );
  });

  test("can't judge cones 01 to 3, between low and mid fire, nor below Katz's cone 06", () => {
    for (const cone of ['01', '1', '3'])
      assert.equal(coneFit(HOST, glaze(0.2, 3, 0.3), orton(cone)).skipped, 'between', cone);
    assert.equal(coneFit(HOST, glaze(0.2, 3, 0.3), orton('02')).verdict, 'fits');
    assert.equal(coneFit(HOST, glaze(0.2, 3, 0.3), orton('4')).verdict, 'fits');
    const range = coneFit(HOST, glaze(0.2, 3, 0.3), orton('04', '1'));
    assert.equal(range.skipped, 'between');
    assert.deepEqual(range.sentences[0].params, { scale: 'orton', cone: '1' });
    const cool = coneFit(HOST, glaze(0.2, 3, 0.3), orton('08', '04'));
    assert.equal(cool.skipped, 'belowChart');
    assert.deepEqual(cool.sentences[0].params, { scale: 'orton', cone: '08' });
    assert.equal(coneFit(HOST, glaze(0.2, 3, 0.3), orton('06')).verdict, 'fits');
  });
});
