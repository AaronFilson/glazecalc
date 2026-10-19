import firing from '../../lib/cones/firing.js';
import cones from '../../lib/cones/index.js';
import results from '../../lib/cones/results.js';
import paste from '../../lib/recipe/paste.js';
import { mergeTrial } from '../lib/account_data.ts';
import Firing from '../models/firing.ts';
import Recipe, { FIRING_LINKS } from '../models/recipe.ts';
import { api, expect, makeUser, sessionToken } from './support/app.ts';

// A recipe's firing block (docs/adr/0021-recipe-firing.md): the cone as stated,
// in order, its range and tested cones, its bands, and reading it from a paste.
describe('recipe firing (lib/cones/firing.js)', () => {
  it('puts Orton cones in true order: 022 … 01 below 1 … 42, 06 far below 6, half cones between', () => {
    const sorted = ['6', '06', '10', '022', '01', '1', '5.5', '42', '014'].sort((a, b) =>
      firing.compareCones('orton', a, b)
    );
    expect(sorted).to.eql(['022', '014', '06', '01', '1', '5.5', '6', '10', '42']);
    expect(firing.ordinal('orton', '06')).to.be.below(firing.ordinal('orton', '6'));
    expect(firing.ordinal('orton', '5.5')).to.be.within(firing.ordinal('orton', '5'), firing.ordinal('orton', '6'));
  });

  it('orders SK cones by their chart, letter cones included', () => {
    expect(firing.compareCones('sk', '6a', '7')).to.be.below(0);
    expect(firing.compareCones('sk', '015a', '016')).to.be.above(0);
    expect(firing.isCone('sk', '6a')).to.equal(true);
    expect(firing.isCone('sk', '6')).to.equal(false);
  });

  it('offers Orton 022 … 13 first, then half cones, then 14 … 42 at the end', () => {
    const groups = firing.coneChoices('orton');
    expect(groups.map((g) => g.group)).to.eql(['usual', 'half', 'above']);
    expect(groups[0]!.cones[0]).to.equal('022');
    expect(groups[0]!.cones.at(-1)).to.equal('13');
    expect(groups[1]!.cones).to.include('5.5');
    expect(groups[2]!.cones).to.include.members(['14', '31.5', '42']);
  });

  it('ticks each whole cone of a range and its two ends; a single cone counts as tested', () => {
    expect(firing.conesBetween('orton', '5', '7')).to.eql(['5', '6', '7']);
    expect(firing.conesBetween('orton', '5.5', '6.5')).to.eql(['5.5', '6', '6.5']);
    expect(firing.conesBetween('orton', '06', '04')).to.eql(['06', '05', '04']);
    expect(firing.conesBetween('temperature', '1220', '1260')).to.eql(['1220', '1260']);
    expect(firing.testedCones({ scale: 'orton', low: '6' })).to.eql(['6']);
    expect(firing.testedCones({ scale: 'orton', low: '6', high: '10' })).to.eql([]);
    expect(firing.testedCones({ scale: 'orton', low: '6', high: '10', tested: ['10'] })).to.eql(['10']);
  });

  it('finds whether a cone is within a range, at either end too', () => {
    const block = { scale: 'orton' as const, low: '5', high: '7' };
    expect(firing.inRange(block, 'orton', '6')).to.equal(true);
    expect(firing.inRange(block, 'orton', '7')).to.equal(true);
    expect(firing.inRange(block, 'orton', '06')).to.equal(false);
    expect(firing.inRange(block, 'sk', '6a')).to.equal(false);
  });

  it('refuses a block that is not a firing', () => {
    expect(firing.firingProblem({ scale: 'orton', low: '6', high: '10', tested: ['6', '10'] })).to.equal(null);
    expect(firing.firingProblem({ scale: 'kelvin', low: '6' })).to.equal('scale');
    expect(firing.firingProblem({ scale: 'orton', low: '6a' })).to.equal('low');
    expect(firing.firingProblem({ scale: 'orton', low: '10', high: '6' })).to.equal('order');
    expect(firing.firingProblem({ scale: 'orton', high: '6' })).to.equal('low');
    expect(firing.firingProblem({ scale: 'orton', low: '6', tested: ['7'] })).to.equal('tested');
    expect(firing.firingProblem({ scale: 'orton', low: '6', atmospheres: ['wood'] })).to.equal('atmospheres');
    expect(firing.firingProblem({ scale: 'orton', low: '6', processes: ['wood', 'wood'] })).to.equal('processes');
    expect(firing.firingProblem({ scale: 'temperature', low: '1240', rate: 0 })).to.equal('rate');
    expect(firing.firingProblem({ scale: 'temperature', low: '1240', hold: 2000 })).to.equal('hold');
    expect(firing.firingProblem({ scale: 'temperature', low: '99999' })).to.equal('low');
    expect(firing.firingProblem({ scale: 'orton', schedule: 'x'.repeat(301) })).to.equal('schedule');
  });

  it('maps cones to the limits bands: 06 low, 6 mid, 8 to 13 high; SK by its own table', () => {
    expect(firing.coneBand('orton', '06')).to.equal('low');
    expect(firing.coneBand('orton', '02')).to.equal('low');
    expect(firing.coneBand('orton', '6')).to.equal('mid');
    expect(firing.coneBand('orton', '7')).to.equal('mid');
    expect(firing.coneBand('orton', '8')).to.equal('high');
    expect(firing.coneBand('orton', '13')).to.equal('high');
    expect(firing.coneBand('orton', '20')).to.equal('high');
    expect(firing.coneBand('sk', '8')).to.equal('mid');
    expect(firing.coneBand('sk', '10')).to.equal('mid');
    expect(firing.coneBand('sk', '12')).to.equal('high');
    expect(firing.coneBand('sk', '4a')).to.equal('low');
    expect(firing.coneBand('temperature', '1280')).to.equal('high');
    expect(firing.firingBands({ scale: 'orton', low: '6', high: '10' })).to.eql(['mid', 'high']);
    expect(firing.firingBands({ scale: 'orton', low: '04', high: '10' })).to.eql(['low', 'mid', 'high']);
    expect(firing.firingBands({ scale: 'orton', low: '5', high: '6' })).to.eql(['mid']);
    expect(firing.firingBands(null)).to.eql([]);
  });

  it('converts only approximately and says on what: Kyoto’s measured SK only, never the JIS nominal figure', () => {
    expect(firing.approxCelsius('orton', '6')).to.eql({ celsius: 1222, basis: 'orton-60' });
    expect(firing.approxCelsius('sk', '10')).to.eql({ celsius: 1232, basis: 'kyoto' });
    expect(firing.approxCelsius('sk', '8')).to.eql({ celsius: 1198, basis: 'kyoto' });
    // Only Kyoto's measured cones get a temperature: the JIS figures of their neighbours
    // (SK 7 1230 °C, SK 9 1280 °C) would put SK 7 above SK 8.
    for (const cone of ['7', '9', '6a', '11', '12', '022']) expect(firing.approxCelsius('sk', cone)).to.equal(null);
    const shown = cones.SK.cones
      .map((c: { cone: string }) => firing.approxCelsius('sk', c.cone)?.celsius)
      .filter((c: number | undefined) => c !== undefined);
    expect(shown).to.eql([...shown].sort((a: number, b: number) => a - b));
    expect(firing.approxCelsius('orton', '30')).to.equal(null);
    // SK 10 is not Orton 10; SK 12 is the institute's replacement for it.
    expect(firing.approxCone('sk', '10', 'orton')?.cone).to.not.equal('10');
    expect(firing.approxCone('sk', '12', 'orton')).to.eql({ cone: '10', basis: 'kyoto' });
    expect(firing.approxCone('orton', '10', 'sk')).to.eql({ cone: '12', basis: 'kyoto' });
    // No equivalent for an SK cone Kyoto did not measure, nor for the JIS figure of one it did.
    expect(firing.approxCone('sk', '6a', 'orton')).to.equal(null);
    expect(firing.approxCone('sk', '15', 'orton')).to.equal(null);
    expect(firing.approxCone('temperature', '1222', 'orton')).to.eql({ cone: '6', basis: 'orton-60' });
  });

  it('matches SK and Orton by Kyoto’s same-kiln columns (100 °C an hour), not Orton’s 60 °C an hour chart', () => {
    // Kyoto SK 7 … 14: 1183 1198 1211 1232 1253 1290 1311 1331; its Orton 4 … 12: 1179 1207 1211 1232 1252 1271 1290 1301 1324.
    const sk = { 7: '4', 8: '5', 9: '6', 10: '7', 11: '8', 12: '10', 13: '11', 14: '12' };
    for (const [from, to] of Object.entries(sk)) {
      expect(firing.approxCone('sk', from, 'orton'), `SK ${from}`).to.eql({ cone: to, basis: 'kyoto' });
    }
    // The other way: the SK cone nearest within 15 °C; Orton 4 is SK 7 (not 8), Orton 6 is SK 9 (not 10).
    const orton = { 4: '7', 5: '9', 6: '9', 7: '10', 8: '11', 10: '12', 11: '13', 12: '14' };
    for (const [from, to] of Object.entries(orton)) {
      expect(firing.approxCone('orton', from, 'sk'), `Orton ${from}`).to.eql({ cone: to, basis: 'kyoto' });
    }
    // Orton 9 (1271) is 18 °C from SK 11 and 19 from SK 12: no match; outside 4 to 12 and half cones, none.
    for (const from of ['9', '3', '04', '5.5', '13']) expect(firing.approxCone('orton', from, 'sk')).to.equal(null);
    // What is shown as a temperature is unchanged: SK 8 and 10 only.
    expect(firing.approxCelsius('sk', '9')).to.equal(null);
    // A cone is matched across the scales through them: SK 8 to 10 is Orton 5 to 7, and 4 and 8 are outside.
    const block = { scale: 'sk' as const, low: '8', high: '10' };
    expect([4, 5, 6, 7, 8].map((c) => firing.matchesCone(block, 'orton', String(c)))).to.eql([
      false,
      true,
      true,
      true,
      false
    ]);
    // Orton 4 to 6 is SK 7 to 9, so SK 8 is within it and SK 10 is not.
    const ortonBlock = { scale: 'orton' as const, low: '4', high: '6' };
    expect(firing.matchesCone(ortonBlock, 'sk', '8')).to.equal(true);
    expect(firing.matchesCone(ortonBlock, 'sk', '10')).to.equal(false);
  });

  it('shows half cones as ½', () => {
    expect(firing.coneLabel('5.5')).to.equal('5½');
    expect(firing.coneLabel('06')).to.equal('06');
  });

  it('writes Glazy’s "Cone" string and "Atmospheres" list', () => {
    expect(
      firing.glazyFiring({ scale: 'orton', low: '9', high: '10', atmospheres: ['reduction'], processes: ['wood'] })
    ).to.eql({ cone: '9 - 10', atmospheres: ['Reduction', 'Wood'] });
    expect(firing.glazyFiring({ scale: 'sk', low: '8' }).cone).to.equal('SK 8');
    expect(firing.glazyFiring({ scale: 'temperature', low: '1240' }).cone).to.equal('1240°C');
    expect(firing.glazyFiring(null)).to.eql({ cone: '', atmospheres: [] });
  });

  it('marks the CSV cone cell with the cone sign, so a spreadsheet keeps "06" as text, and paste-in reads it back', () => {
    expect(firing.glazyConeCell({ scale: 'orton', low: '06' })).to.equal('Δ06');
    expect(firing.glazyConeCell({ scale: 'orton', low: '9', high: '10' })).to.equal('Δ9 - Δ10');
    expect(firing.glazyConeCell({ scale: 'sk', low: '8' })).to.equal('SK 8');
    expect(firing.glazyConeCell({ scale: 'temperature', low: '1240' })).to.equal('1240°C');
    expect(firing.glazyConeCell(null)).to.equal('');
    expect(firing.readFiring('Δ06')).to.include({ scale: 'orton', low: '06' });
    expect(firing.readFiring('Δ9 - Δ10')).to.include({ low: '9', high: '10' });
  });

  describe('reading a firing from text', () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ['Cone 6 ox', { scale: 'orton', low: '6', atmospheres: ['oxidation'] }],
      ['^6', { scale: 'orton', low: '6' }],
      ['C/6', { scale: 'orton', low: '6' }],
      ['Δ6', { scale: 'orton', low: '6' }],
      ['cone 5-6', { scale: 'orton', low: '5', high: '6' }],
      ['Cone 5/6', { scale: 'orton', low: '5', high: '6' }],
      ['SK8', { scale: 'sk', low: '8' }],
      ['SK 6a', { scale: 'sk', low: '6a' }],
      ['1240°C', { scale: 'temperature', low: '1240' }],
      ['2232 °F', { scale: 'temperature', low: '1222' }],
      ['06', { scale: 'orton', low: '06' }],
      ['6½', { scale: 'orton', low: '6.5' }],
      ['cone 6 1/2', { scale: 'orton', low: '6.5' }],
      ['ox/red', { atmospheres: ['oxidation', 'reduction'] }],
      ['Cone 10 reduction, wood fired', { scale: 'orton', low: '10', atmospheres: ['reduction'], processes: ['wood'] }],
      ['salt glaze ^10', { scale: 'orton', low: '10', processes: ['salt'] }]
    ];
    for (const [text, expected] of cases) {
      it(`reads "${text}"`, () => {
        const found: Record<string, unknown> = { ...(firing.readFiring(text) ?? {}) };
        delete found.whole;
        expect(found).to.eql(expected);
      });
    }

    it('does not take a colour, an ash or a material for a firing', () => {
      expect(firing.readFiring('a deep red glaze')).to.equal(null);
      expect(firing.readFiring('Soda ash')).to.equal(null);
      expect(firing.readFiring('Red iron oxide')).to.equal(null);
      expect(firing.readFiring('Cone 10, wood ash glaze')?.processes).to.equal(undefined);
    });

    it('makes a block from a paste’s notes: the first cone, every atmosphere, a single cone tested', () => {
      expect(firing.firingFromLines(['Cone 6', 'oxidation, slow cool'])).to.eql({
        scale: 'orton',
        low: '6',
        tested: ['6'],
        atmospheres: ['oxidation']
      });
      expect(firing.firingFromLines(['cone 5-6', 'ox/red'])).to.eql({
        scale: 'orton',
        low: '5',
        high: '6',
        atmospheres: ['oxidation', 'reduction']
      });
      expect(firing.firingFromLines(['Lovely glossy surface'])).to.equal(null);
    });

    it('keeps the firing lines of a paste as notes, not materials; a number alone stays a total set aside', () => {
      const [recipe] = paste.parsePaste('Tenmoku\nCuster 50\nSilica 50\n06\nC/6\nox/red\n6½ ox');
      expect(recipe!.lines.map((l) => l.name)).to.eql(['Custer', 'Silica']);
      expect(recipe!.notes).to.eql(['C/6', 'ox/red', '6½ ox']);
      expect(recipe!.skipped.map((s) => [s.text, s.why])).to.eql([['06', 'total']]);
    });

    it('never lets a firing line split a recipe: it joins the firing of the recipe it is in', () => {
      const recipes = paste.parsePaste('Whiting 20\nCone 6\nAdd:\nTin 2');
      expect(recipes.length).to.equal(1);
      expect(recipes[0]!.lines.map((l) => [l.name, l.addition])).to.eql([
        ['Whiting', false],
        ['Tin', true]
      ]);
      expect(recipes[0]!.notes).to.eql(['Cone 6']);
      for (const line of ['C/6', '^6', 'Cone 10 reduction', 'oxidation']) {
        const [one, ...more] = paste.parsePaste(`Shino\nCuster 50\n${line}\nSilica 50`);
        expect([more.length, one!.notes, one!.lines.length]).to.eql([0, [line], 2]);
      }
      // A number alone between materials is what it was before: a total, set aside.
      for (const line of ['06', '5.5']) {
        const [one, ...more] = paste.parsePaste(`Shino\nCuster 50\n${line}\nSilica 50`);
        expect([more.length, one!.skipped.map((s) => s.why), one!.lines.length]).to.eql([0, ['total'], 2]);
      }
      // Set off by a blank line with materials under it, a firing line is the next recipe's title.
      const titled = paste.parsePaste('Shino\nCuster 50\n\nCone 6 Wood\nCuster 60\nSilica 40');
      expect(titled.map((r) => r.title)).to.eql(['Shino', 'Cone 6 Wood']);
      expect(paste.parsePaste('Shino\nCuster 50\n\nCone 6\nAdd:\nTin 2').length).to.equal(1);
      // A one-word name is still a recipe's title, not a firing.
      const named = paste.parsePaste('Shino\nCuster 50\nSilica 50\nRed\nCuster 40\nRIO 5');
      expect(named.map((r) => r.title)).to.eql(['Shino', 'Red']);
    });

    it('reads SK written without its letter as the chart writes it, and never drops an SK cone silently', () => {
      // JIS R 8101 has one cone for each number; from 015 to 6 it is the "a" cone.
      expect(firing.readFiring('SK6')).to.eql({ scale: 'sk', low: '6a', whole: true });
      expect(firing.readFiring('SK5 reduction')).to.eql({
        scale: 'sk',
        low: '5a',
        atmospheres: ['reduction'],
        whole: true
      });
      expect(firing.readFiring('SK 015')?.low).to.equal('015a');
      expect(firing.readFiring('SK 6-8')).to.include({ low: '6a', high: '8' });
      expect(firing.skCone('7')).to.equal('7');
      expect(firing.skCone('7a')).to.equal(null);
      // A number the chart lacks is still an SK firing line, kept in the notes, never read as Orton.
      expect(firing.readFiring('SK 26')).to.eql({ unknown: true, whole: true });
      expect(firing.isFiringLine('SK 26')).to.equal(true);
      const [recipe] = paste.parsePaste('Shino\nCuster 50\nSK 26\nSilica 50');
      expect([recipe!.notes, recipe!.lines.length]).to.eql([['SK 26'], 2]);
      expect(firing.firingFromLines(['SK6'])).to.eql({ scale: 'sk', low: '6a', tested: ['6a'] });
      const log = { fieldsIncluded: ['Cone'], rows: [['SK6 down'], ['8']] };
      expect(firing.conesFromLog(log, 'sk')).to.eql(['6a', '8']);
    });

    it('reads "4,5" as a list of cones, and as a half cone only for a decimal comma with no other number', () => {
      expect(firing.readFiring('cone 4,5')).to.eql({
        scale: 'orton',
        low: '4',
        high: '5',
        tested: ['4', '5'],
        whole: true
      });
      expect(firing.readFiring('cone 4, 5, 6')).to.include({ low: '4', high: '6' });
      expect(firing.readFiring('cone 4,5', { decimalComma: true })).to.eql({ scale: 'orton', low: '4.5', whole: true });
      // Another number follows: a list, even for a decimal comma.
      expect(firing.readFiring('cone 4,5 and 6', { decimalComma: true })?.low).to.not.equal('4.5');
      expect(firing.firingFromLines(['Cone 4,5'])).to.eql({
        scale: 'orton',
        low: '4',
        high: '5',
        tested: ['4', '5']
      });
      expect(firing.readsDecimalComma('either', 'de')).to.equal(true);
      expect(firing.readsDecimalComma('either', 'en')).to.equal(false);
      expect(firing.readsDecimalComma('point', 'de')).to.equal(false);
      // The same for a firing log's cells.
      const log = { fieldsIncluded: ['Cones Top'], rows: [['4,5'], ['6,5']] };
      expect(firing.conesFromLog(log, 'orton')).to.eql(['4', '5', '6']);
      expect(firing.conesFromLog(log, 'orton', { decimalComma: true })).to.eql(['4.5', '6.5']);
    });

    it('tells a clear firing line from a bare number or a weak word', () => {
      for (const line of ['Cone 6', 'C/6', '^6', 'SK8', '1240°C', 'ox/red', '6 ox', 'wood fired']) {
        expect(firing.isFiringLine(line), line).to.equal(true);
      }
      for (const line of ['06', '5.5', 'Red', 'Salt', 'Wood', 'Pit', 'Cone 6 floating blue']) {
        expect(firing.isFiringLine(line), line).to.equal(false);
      }
    });
  });
});

describe('results by cone and atmosphere (lib/cones/results.js)', () => {
  it('cleans a list of results: trimmed, empty ones out, one for each cone and atmosphere, no unknown field', () => {
    expect(
      results.cleanConeResults([
        { cone: '6', atmosphere: 'oxidation', summary: '  satin  ', extra: 'dropped' },
        { cone: '6', atmosphere: 'reduction', summary: 'celadon' },
        { cone: '6', atmosphere: 'oxidation', summary: 'satin, pools glossy' },
        { cone: '10', summary: '   ' },
        { cone: '6a', atmosphere: '', summary: 'SK' },
        { cone: '1240', atmosphere: null, summary: 'by temperature' }
      ])
    ).to.eql([
      { cone: '6', atmosphere: 'oxidation', summary: 'satin, pools glossy' },
      { cone: '6', atmosphere: 'reduction', summary: 'celadon' },
      { cone: '6a', summary: 'SK' },
      { cone: '1240', summary: 'by temperature' }
    ]);
  });

  it('refuses what is not a list of results', () => {
    expect(results.coneResultsProblem('cone 6: glossy')).to.equal('list');
    expect(results.coneResultsProblem([{ cone: '99', summary: 'x' }])).to.equal('cone');
    expect(results.coneResultsProblem([{ cone: 6, summary: 'x' }])).to.equal('cone');
    expect(results.coneResultsProblem([{ cone: '6', atmosphere: 'smoky', summary: 'x' }])).to.equal('atmosphere');
    expect(results.coneResultsProblem([{ cone: '6', summary: 'x'.repeat(1001) }])).to.equal('summary');
    expect(results.coneResultsProblem([{ cone: '6', summary: 'x'.repeat(1000) }])).to.equal(null);
    const many = Array.from({ length: 101 }, () => ({ cone: '6', summary: 'x' }));
    expect(results.coneResultsProblem(many)).to.equal('most');
  });

  it("reads a log's atmosphere only when its Atmosphere column names just one", () => {
    const log = (...cells: string[]) => ({ fieldsIncluded: ['Time', 'Atmosphere'], rows: cells.map((c) => ['', c]) });
    expect(results.atmosphereFromLog(log('', 'Body reduction', 'heavy red'))).to.equal('reduction');
    expect(results.atmosphereFromLog(log('ox', 'Ox.'))).to.equal('oxidation');
    expect(results.atmosphereFromLog(log('neutral'))).to.equal('neutral');
    // Both named: not clear, left to the potter.
    expect(results.atmosphereFromLog(log('ox', 'reduction'))).to.equal(null);
    expect(results.atmosphereFromLog(log('smoky', ''))).to.equal(null);
    expect(results.atmosphereFromLog({ fieldsIncluded: ['Comments'], rows: [['reduction']] })).to.equal(null);
  });

  it('places a linked log at its one cone within the stated range, and at an atmosphere the recipe states', () => {
    const log = {
      fieldsIncluded: ['Cone', 'Atmosphere'],
      rows: [
        ['5', 'red'],
        ['6', 'red'],
        ['7 down', '']
      ]
    };
    const block = { scale: 'orton' as const, low: '6', atmospheres: ['oxidation' as const, 'reduction' as const] };
    expect(results.linkPlace(log, block)).to.eql({ cone: '6', atmosphere: 'reduction' });
    // Two cones of the range named: the potter chooses.
    expect(results.linkPlace(log, { scale: 'orton', low: '5', high: '6' })).to.eql({ atmosphere: 'reduction' });
    // An atmosphere the recipe does not state is not set; with none stated, any is.
    expect(results.linkPlace(log, { scale: 'orton', low: '6', atmospheres: ['oxidation'] })).to.eql({ cone: '6' });
    expect(results.linkPlace(log, null)).to.eql({ atmosphere: 'reduction' });
  });
});

describe('recipe firing (API)', () => {
  const recipe = {
    title: 'Clear',
    materials: [
      { name: 'Silica', amount: 30 },
      { name: 'Whiting', amount: 20 }
    ]
  };
  let token: string;
  let owner: string;
  const create = (body: object) =>
    api()
      .post('/recipe/create')
      .set('Authorization', 'Bearer ' + token)
      .send(body);
  const change = (id: string, body: object) =>
    api()
      .put('/recipe/change/' + id)
      .set('Authorization', 'Bearer ' + token)
      .send({ recipe: body });
  const latest = async () =>
    (
      await api()
        .get('/recipe/getLatest')
        .set('Authorization', 'Bearer ' + token)
    ).body;

  beforeEach(async () => {
    const made = await makeUser();
    token = made.token;
    owner = String(made.user._id);
  });

  it('keeps the firing block as entered, beside the wave-2 band, and keeps no unknown field', async () => {
    const firedAt = {
      scale: 'orton',
      low: '6',
      high: '10',
      tested: ['10', '6'],
      atmospheres: ['reduction', 'oxidation'],
      processes: ['wood'],
      schedule: 'hold 10 min',
      witness: true,
      extra: 'dropped'
    };
    const res = await create({ ...recipe, firing: 'mid', firedAt, foodSurface: true });
    expect(res).to.have.status(200);
    expect(res.body.firing).to.equal('mid');
    expect(res.body.foodSurface).to.equal(true);
    expect(res.body.firedAt).to.eql({
      scale: 'orton',
      low: '6',
      high: '10',
      tested: ['6', '10'],
      atmospheres: ['oxidation', 'reduction'],
      processes: ['wood'],
      schedule: 'hold 10 min',
      witness: true
    });
  });

  it('keeps a temperature firing in °C with its rate and hold', async () => {
    const res = await create({ ...recipe, firedAt: { scale: 'temperature', low: '1240', rate: 60, hold: 15 } });
    expect(res).to.have.status(200);
    expect(res.body.firedAt).to.eql({ scale: 'temperature', low: '1240', rate: 60, hold: 15 });
  });

  it('refuses a firing it cannot read, on create and on change', async () => {
    for (const bad of [
      { scale: 'orton', low: '10', high: '6' },
      { scale: 'orton', low: '6', tested: ['8'] },
      { scale: 'sk', low: '6' },
      { scale: 'orton', low: '6', atmospheres: ['smoky'] },
      'cone 6'
    ]) {
      expect(await create({ ...recipe, firedAt: bad }), JSON.stringify(bad)).to.have.status(400);
    }
    const saved = await create(recipe);
    expect(await change(saved.body._id, { firedAt: { scale: 'orton', low: '99' } })).to.have.status(400);
    expect(await change(saved.body._id, { firings: [{ firing: 'not-an-id' }] })).to.have.status(400);
  });

  it('leaves an existing recipe with no block (not stated), and clears a block with null', async () => {
    const saved = await create(recipe);
    expect(saved.body).to.not.have.property('firedAt');
    expect(await change(saved.body._id, { firedAt: { scale: 'sk', low: '8' } })).to.have.status(200);
    expect((await latest()).firedAt).to.eql({ scale: 'sk', low: '8' });
    expect(await change(saved.body._id, { firedAt: null })).to.have.status(200);
    expect((await latest()).firedAt ?? null).to.equal(null);
  });

  it('links firing logs with a result note each, and Undo puts the firing back as it was', async () => {
    const log = await api()
      .post('/firing/create')
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'Glaze firing', fieldsIncluded: ['cone'], rows: [['6']] });
    const saved = await create({ ...recipe, firedAt: { scale: 'orton', low: '6' } });
    const firings = [{ firing: log.body._id, result: 'glossy, no crazing' }];
    expect(await change(saved.body._id, { firedAt: { scale: 'orton', low: '10' }, firings })).to.have.status(200);
    expect((await latest()).firings).to.eql(firings);
    const undone = await api()
      .post('/recipe/undo/' + saved.body._id)
      .set('Authorization', 'Bearer ' + token);
    expect(undone).to.have.status(200);
    expect(undone.body.record.firedAt).to.eql({ scale: 'orton', low: '6' });
    expect(undone.body.record.firings ?? []).to.eql([]);
  });

  describe('links to firing logs, one at a time', () => {
    const newLog = async (title = 'Glaze firing') =>
      (
        await api()
          .post('/firing/create')
          .set('Authorization', 'Bearer ' + token)
          .send({ title, fieldsIncluded: ['cone'], rows: [['6']] })
      ).body._id as string;
    const link = (id: string, firing: string) =>
      api()
        .post('/recipe/firings/' + id)
        .set('Authorization', 'Bearer ' + token)
        .send({ firing });

    it('links, notes a result and unlinks on the server, so two pages never undo each other', async () => {
      const [a, b] = [await newLog('A'), await newLog('B')];
      const saved = (await create(recipe)).body._id as string;
      // Two pages each link a log: both links stay, and linking one again changes nothing.
      expect((await link(saved, a)).body.firings).to.eql([{ firing: a }]);
      expect((await link(saved, b)).body.firings).to.eql([{ firing: a }, { firing: b }]);
      expect((await link(saved, a)).body.firings).to.eql([{ firing: a }, { firing: b }]);
      const noted = await api()
        .put(`/recipe/firings/${saved}/${b}`)
        .set('Authorization', 'Bearer ' + token)
        .send({ result: ' glossy ' });
      expect(noted.body.firings).to.eql([{ firing: a }, { firing: b, result: 'glossy' }]);
      // A save of the recipe that does not name its links leaves them.
      expect(await change(saved, { title: 'Clear 2' })).to.have.status(200);
      const off = await api()
        .delete(`/recipe/firings/${saved}/${a}`)
        .set('Authorization', 'Bearer ' + token);
      expect(off.body.firings).to.eql([{ firing: b, result: 'glossy' }]);
      expect((await latest()).firings).to.eql([{ firing: b, result: 'glossy' }]);
      const cleared = await api()
        .put(`/recipe/firings/${saved}/${b}`)
        .set('Authorization', 'Bearer ' + token)
        .send({ result: '' });
      expect(cleared.body.firings).to.eql([{ firing: b }]);
    });

    it("refuses another account's recipe or log, a bad id and too long a result", async () => {
      const mine = await newLog();
      const saved = (await create(recipe)).body._id as string;
      const other = await makeUser();
      const theirs = (
        await api()
          .post('/firing/create')
          .set('Authorization', 'Bearer ' + other.token)
          .send({ title: 'Theirs', fieldsIncluded: ['cone'], rows: [['6']] })
      ).body._id as string;
      expect(await link(saved, theirs)).to.have.status(404);
      expect(
        await api()
          .post('/recipe/firings/' + saved)
          .set('Authorization', 'Bearer ' + other.token)
          .send({ firing: mine })
      ).to.have.status(404);
      expect(await link('nope', mine)).to.have.status(400);
      expect(
        await api()
          .post('/recipe/firings/' + saved)
          .set('Authorization', 'Bearer ' + token)
          .send({ firing: mine, result: 'x'.repeat(501) })
      ).to.have.status(400);
    });

    it('hides a log in the Trash, brings it back with the log, and takes it off when deleted for good', async () => {
      const [a, b] = [await newLog('A'), await newLog('B')];
      const saved = (await create(recipe)).body._id as string;
      await link(saved, a);
      await link(saved, b);
      const trashed = await api()
        .delete('/firing/delete/' + a)
        .set('Authorization', 'Bearer ' + token);
      expect(trashed).to.have.status(200);
      // Still on the recipe, to come back with the log.
      expect((await latest()).firings).to.eql([{ firing: a }, { firing: b }]);
      expect(
        await api()
          .post('/trash/restore/' + trashed.body.trashId)
          .set('Authorization', 'Bearer ' + token)
      ).to.have.status(200);
      expect((await latest()).firings).to.eql([{ firing: a }, { firing: b }]);
      const again = await api()
        .delete('/firing/delete/' + a)
        .set('Authorization', 'Bearer ' + token);
      expect(
        await api()
          .delete('/trash/delete/' + again.body.trashId)
          .set('Authorization', 'Bearer ' + token)
      ).to.have.status(200);
      expect((await latest()).firings).to.eql([{ firing: b }]);
      await api()
        .delete('/firing/delete/' + b)
        .set('Authorization', 'Bearer ' + token);
      expect(
        await api()
          .delete('/trash/empty')
          .set('Authorization', 'Bearer ' + token)
      ).to.have.status(200);
      expect((await latest()).firings).to.eql([]);
    });

    it('counts only links to logs that are there toward the limit', async () => {
      const saved = (await create(recipe)).body._id as string;
      const ids = (
        await Firing.insertMany(
          Array.from({ length: FIRING_LINKS.most + 1 }, (_, i) => ({
            title: 'Log ' + i,
            fieldsIncluded: ['cone'],
            rows: [],
            ownedBy: owner
          }))
        )
      ).map((f) => String(f._id));
      await Recipe.updateOne(
        { _id: saved },
        { $set: { firings: ids.slice(0, FIRING_LINKS.most).map((firing) => ({ firing })) } }
      );
      const full = await link(saved, ids[FIRING_LINKS.most]!);
      expect(full).to.have.status(409);
      expect(full.body.code).to.equal('firing-links-full');
      // One log goes to the Trash: its hidden link no longer counts.
      await api()
        .delete('/firing/delete/' + ids[0])
        .set('Authorization', 'Bearer ' + token);
      expect(await link(saved, ids[FIRING_LINKS.most]!)).to.have.status(200);
    });
  });

  describe('results by cone and atmosphere', () => {
    const coneResults = [
      { cone: '6', atmosphere: 'oxidation', summary: 'Satin, pools glossy' },
      { cone: '6', atmosphere: 'reduction', summary: 'Celadon green' }
    ];
    const stated = { scale: 'orton', low: '6', atmospheres: ['oxidation', 'reduction'] };

    it('keeps a summary for each cone and atmosphere, cleaned on create and change, and refuses one it cannot read', async () => {
      const saved = await create({
        ...recipe,
        firedAt: stated,
        coneResults: [...coneResults, { cone: '10', summary: ' ' }, { cone: '6', summary: ' Plain ', note: 'dropped' }]
      });
      expect(saved).to.have.status(200);
      expect(saved.body.coneResults).to.eql([...coneResults, { cone: '6', summary: 'Plain' }]);
      const matte = await change(saved.body._id, { coneResults: [{ cone: '6', summary: '  Matte  ' }] });
      expect(matte).to.have.status(200);
      expect((await latest()).coneResults).to.eql([{ cone: '6', summary: 'Matte' }]);
      for (const bad of [
        [{ cone: '99', summary: 'x' }],
        [{ cone: '6', atmosphere: 'smoky', summary: 'x' }],
        [{ cone: '6', summary: 'x'.repeat(1001) }],
        'glossy'
      ]) {
        expect(await change(saved.body._id, { coneResults: bad }), JSON.stringify(bad)).to.have.status(400);
      }
      // Nothing written clears them.
      expect(await change(saved.body._id, { coneResults: [{ cone: '6', summary: '' }] })).to.have.status(200);
      expect((await latest()).coneResults ?? null).to.equal(null);
    });

    it('keeps a result outside a range stated later', async () => {
      const saved = await create({ ...recipe, firedAt: stated, coneResults });
      expect(await change(saved.body._id, { firedAt: { scale: 'orton', low: '10' } })).to.have.status(200);
      expect((await latest()).coneResults).to.eql(coneResults);
    });

    it('carries them in versions and Undo, the Trash, the export and a trial joining an account', async () => {
      const saved = (await create({ ...recipe, firedAt: stated, coneResults })).body._id as string;
      expect(await change(saved, { coneResults: [{ cone: '6', summary: 'Changed' }] })).to.have.status(200);
      const undone = await api()
        .post('/recipe/undo/' + saved)
        .set('Authorization', 'Bearer ' + token);
      expect(undone.body.record.coneResults).to.eql(coneResults);
      const json = await api()
        .get('/export')
        .set('Authorization', 'Bearer ' + token);
      expect(json.body.records.recipes[0].coneResults).to.eql(coneResults);
      const trashed = await api()
        .delete('/recipe/delete/' + saved)
        .set('Authorization', 'Bearer ' + token);
      const restored = await api()
        .post('/trash/restore/' + trashed.body.trashId)
        .set('Authorization', 'Bearer ' + token);
      expect(restored).to.have.status(200);
      expect((await latest()).coneResults).to.eql(coneResults);

      const trial = sessionToken(await api().post('/guest'))!;
      const trialId = (
        await api()
          .get('/verify')
          .set('Authorization', 'Bearer ' + trial)
      ).body.id as string;
      await api()
        .post('/recipe/create')
        .set('Authorization', 'Bearer ' + trial)
        .send({ ...recipe, title: 'Trial glaze', coneResults });
      await mergeTrial(trialId, owner);
      const joined = await Recipe.findOne({ ownedBy: owner, title: 'Trial glaze' }).lean();
      expect(joined?.coneResults).to.eql(coneResults);
    });

    it("reads a linked log's cone and atmosphere when clear, and lets the potter set or clear them", async () => {
      const block = { ...stated, low: '5', high: '6' };
      const saved = (await create({ ...recipe, firedAt: block })).body._id as string;
      const newLog = async (rows: string[][]) =>
        (
          await api()
            .post('/firing/create')
            .set('Authorization', 'Bearer ' + token)
            .send({ title: 'Log', fieldsIncluded: ['Cone', 'Atmosphere'], rows })
        ).body._id as string;
      const clear = await newLog([['6', 'body reduction']]);
      const mixed = await newLog([
        ['5', 'ox'],
        ['6', 'red']
      ]);
      const link = (firing: string) =>
        api()
          .post('/recipe/firings/' + saved)
          .set('Authorization', 'Bearer ' + token)
          .send({ firing });
      const put = (firing: string, body: object) =>
        api()
          .put(`/recipe/firings/${saved}/${firing}`)
          .set('Authorization', 'Bearer ' + token)
          .send(body);
      expect((await link(clear)).body.firings).to.eql([{ firing: clear, cone: '6', atmosphere: 'reduction' }]);
      // Two cones of the range and two atmospheres named: the log does not say, so neither is set.
      expect((await link(mixed)).body.firings[1]).to.eql({ firing: mixed });
      // The potter sets them; what is not given stays.
      expect((await put(mixed, { cone: '5', atmosphere: 'oxidation' })).body.firings[1]).to.eql({
        firing: mixed,
        cone: '5',
        atmosphere: 'oxidation'
      });
      expect((await put(mixed, { result: 'Dry' })).body.firings[1]).to.eql({
        firing: mixed,
        result: 'Dry',
        cone: '5',
        atmosphere: 'oxidation'
      });
      // A cone outside the range is kept; '' or null clears one.
      expect((await put(mixed, { cone: '10', atmosphere: null })).body.firings[1]).to.eql({
        firing: mixed,
        result: 'Dry',
        cone: '10'
      });
      expect((await put(mixed, { cone: '' })).body.firings[1]).to.eql({ firing: mixed, result: 'Dry' });
      expect(await put(mixed, { cone: '99' })).to.have.status(400);
      expect(await put(mixed, { atmosphere: 'smoky' })).to.have.status(400);
      expect((await latest()).firings[1]).to.eql({ firing: mixed, result: 'Dry' });
    });
  });

  it('exports the firing: in the JSON as saved, in the CSV as Glazy writes it', async () => {
    await create({
      ...recipe,
      firedAt: { scale: 'orton', low: '5', high: '6', atmospheres: ['oxidation'] },
      foodSurface: true
    });
    const json = await api()
      .get('/export')
      .set('Authorization', 'Bearer ' + token);
    expect(json.body.records.recipes[0].firedAt).to.eql({
      scale: 'orton',
      low: '5',
      high: '6',
      atmospheres: ['oxidation']
    });
    const csv = await api()
      .get('/export/recipes.csv')
      .set('Authorization', 'Bearer ' + token);
    expect(csv.text).to.match(/Unit of additive,Cone,Atmospheres,Food surface/);
    expect(csv.text).to.match(/,Δ5 - Δ6,Oxidation,yes\r\n/);
  });
});
