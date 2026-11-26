// What Glazecalc's schemas and budgets take from the core and the catalog (lib/core, lib/catalog: submodules).
// The schemas read the libraries' own lists, but a database's saved values, an MCP client's arguments and the
// fit budget's arithmetic were all made against these: so they are written out here, and a library update that
// changes any of them fails until Glazecalc has looked at what it means (a migration, a schema's wording, a budget).
import { expect } from 'chai';
import chemistry from '../../lib/chemistry/index.js';
import firing from '../../lib/cones/firing.js';
import recipe from '../../lib/recipe/index.js';
import { FIT_WORK_ANYONE_ALL_PER_MINUTE } from '../mcp/common.ts';
import { PREFERENCES } from '../models/user.ts';

describe('what Glazecalc takes from the libraries', () => {
  it('names the cone scales, atmospheres and processes the MCP tools and saved firings use', () => {
    expect(firing.SCALES).to.eql(['orton', 'sk', 'temperature']);
    expect(firing.ATMOSPHERES).to.eql(['oxidation', 'reduction', 'neutral']);
    expect(firing.PROCESSES).to.eql(['wood', 'soda', 'salt', 'raku', 'pit']);
    // The cone preference: every scale, or none chosen.
    expect([...PREFERENCES.cones].sort()).to.eql(['', ...firing.SCALES].sort());
  });

  it('has a chart for each scale the cone tools take as a chart: Orton and SK', () => {
    // common.ts and public.ts take chart 'orton' or 'sk': scales with cones to choose from.
    for (const chart of ['orton', 'sk'] as const) {
      expect(firing.SCALES).to.include(chart);
      expect(firing.coneChoices(chart).flatMap((group) => group.cones).length).to.be.greaterThan(20);
    }
  });

  it('names the firing bands a recipe is saved with and the MCP tools take', () => {
    expect(recipe.FIRING_BANDS).to.eql(['low', 'mid', 'high', 'top']);
  });

  it('names the limit sets a user may choose, the default first', () => {
    expect(recipe.DEFAULT_LIMIT_SET).to.equal('hesselberth-roy');
    expect(Object.keys(recipe.LIMIT_SETS).sort()).to.eql(['glazecalc', 'hesselberth-roy']);
    expect(PREFERENCES.limitSet).to.eql(['hesselberth-roy', 'glazecalc']);
  });

  it('reads the two percentmole kinds the models save, and no other', () => {
    const silica = (percentmole: string) => ({
      name: 'Silica',
      percentmole,
      fields: [{ name: 'SiO2', amount: '100' }]
    });
    for (const kind of ['percent', 'molecular']) expect(() => chemistry.materialWeights(silica(kind))).not.to.throw();
    expect(() => chemistry.materialWeights(silica('weight'))).to.throw();
  });

  it('bounds a fit by the work the MCP budget is counted in', () => {
    // FIT_WORK_ANYONE_ALL_PER_MINUTE allows ten fits at the most a fit may do; a fit that scales goes to 4×.
    expect(chemistry.WORK).to.equal(1.5e8);
    expect(chemistry.WORK_CEILING).to.equal(4);
    expect(FIT_WORK_ANYONE_ALL_PER_MINUTE).to.equal(10 * 1.5e8);
  });

  it('keeps firing figures in the ranges the forms and schemas check', () => {
    expect(firing.FIRING_LIMITS).to.eql({
      celsius: { min: 500, max: 1600 },
      rate: { min: 1, max: 1000 },
      hold: { min: 0, max: 1440 },
      schedule: 300
    });
  });
});
