import firing from '../../lib/cones/firing.js';
import cones from '../../lib/cones/index.js';
import paste from '../../lib/recipe/paste.js';
import { api, expect, makeUser } from './support/app.ts';

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
    // No fair equivalent from a nominal SK figure.
    expect(firing.approxCone('sk', '9', 'orton')).to.equal(null);
    expect(firing.approxCone('temperature', '1222', 'orton')).to.eql({ cone: '6', basis: 'orton-60' });
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
      // A one-word name is still a recipe's title, not a firing.
      const named = paste.parsePaste('Shino\nCuster 50\nSilica 50\nRed\nCuster 40\nRIO 5');
      expect(named.map((r) => r.title)).to.eql(['Shino', 'Red']);
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

describe('recipe firing (API)', () => {
  const recipe = {
    title: 'Clear',
    materials: [
      { name: 'Silica', amount: 30 },
      { name: 'Whiting', amount: 20 }
    ]
  };
  let token: string;
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
    ({ token } = await makeUser());
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
    expect(csv.text).to.match(/,5 - 6,Oxidation,yes\r\n/);
  });
});
