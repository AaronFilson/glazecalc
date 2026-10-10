import fs from 'node:fs';
import regions from '../../lib/regions/index.js';
import food from '../../lib/regions/food.js';
import suppliers from '../../lib/regions/suppliers.js';
import workplace from '../../lib/regions/workplace.js';
import safety from '../../lib/regions/safety.js';
import type { SafetyLine } from '../../lib/regions/safety.js';
import { expect } from './support/app.ts';

// Who to call, by region: the data the home-safety guide shows. A wrong or
// stale emergency number is the worst mistake the app could make.
describe('regions', () => {
  const all = (code: string): SafetyLine[] => {
    const entry = safety.SAFETY[code]!;
    return [...entry.emergency, ...entry.poison, ...(entry.animals ?? []), ...(entry.advice ?? [])];
  };

  it('should give every region its formats, scale, cones and library', () => {
    for (const region of regions.REGIONS) {
      expect(region.code, region.name).to.match(/^[A-Z]{2}$/);
      expect(region.languages.length, region.name).to.be.above(0);
      expect(['C', 'F']).to.include(region.temperature);
      expect(['orton', 'temperature']).to.include(region.cones);
      expect(['US', 'UK', 'EU', 'AU']).to.include(region.library);
      // Each language-region pair is a locale the runtime knows how to format.
      for (const language of region.languages) {
        expect(() => new Intl.NumberFormat(language + '-' + region.code), region.code).not.to.throw();
      }
    }
    // Ireland's shops sell the UK's materials, so it lists the UK's, though it is in the EU.
    expect(regions.regionFor('IE')).to.include({ eu: true, cones: 'orton', library: 'UK' });
    expect(regions.formatLocaleFor('en', 'DE', 'auto')).to.equal('en-DE');
    expect(regions.formatLocaleFor('pt', '', 'auto')).to.equal('pt-PT');
    expect(regions.formatLocaleFor('en', 'DE', 'en-GB')).to.equal('en-GB');
  });

  it('should have an emergency number for every region, and 112 in every EU country', () => {
    for (const region of regions.REGIONS) {
      const shown = safety.shownFor(region.code);
      expect(shown, region.name).not.to.equal(null);
      expect(shown!.emergency.length, region.name).to.be.above(0);
      if (region.eu)
        expect(
          shown!.emergency.map((line) => line.number),
          region.name
        ).to.include('112');
    }
  });

  it('should show only verified lines, each with its source and checked within the last year', () => {
    const yearAgo = Date.now() - 366 * 24 * 60 * 60 * 1000;
    for (const region of regions.REGIONS) {
      const shown = safety.shownFor(region.code)!;
      for (const line of [...shown.emergency, ...shown.poison, ...shown.animals, ...shown.advice]) {
        expect(line.status, line.name).to.equal('verified');
        expect(line.source, line.name).to.match(/^https:\/\//);
        expect(Date.parse(line.checked), line.name + ': check this number again').to.be.above(yearAgo);
      }
      for (const line of all(region.code).filter((l) => l.status !== 'verified')) {
        expect([...shown.poison, ...shown.animals].map((l) => l.name)).not.to.include(line.name);
      }
    }
  });

  it("should dial what it shows: each link's digits match the number as written", () => {
    for (const region of regions.REGIONS) {
      for (const line of all(region.code).filter((l) => l.number)) {
        const written = line.number.replace(/\D/g, '');
        const dialled = line.tel.replace(/\D/g, '');
        const label = `${region.code} ${line.name}: ${line.number} / ${line.tel}`;
        if (line.tel.startsWith('+')) {
          // A national number drops its leading 0 after the country code; a US one keeps all but the 1.
          const national = written.replace(/^0/, '').replace(/^1(?=\d{10}$)/, '');
          expect(dialled.endsWith(national), label).to.equal(true);
        } else {
          expect(dialled, label).to.equal(written);
        }
      }
    }
  });
});

// The rest of what the guides show by region (docs/i18n-plan.md, Phase 4): each
// fact read on the law's or the shop's own page, and checked again within a year.
describe('region facts', () => {
  const yearAgo = Date.now() - 366 * 24 * 60 * 60 * 1000;
  const guides = JSON.parse(
    fs.readFileSync(new URL('../../client/public/i18n/guides/en.json', import.meta.url), 'utf8')
  );
  const checkedLately = (fact: { checked: string; source?: string; url?: string }, label: string) => {
    expect(fact.source ?? fact.url, label).to.match(/^https:\/\//);
    expect(Date.parse(fact.checked), label + ': check this again').to.be.above(yearAgo);
  };

  it("should give the silica limit for every region with a law behind it, never above the EU's in a member state", () => {
    for (const region of regions.REGIONS) {
      const facts = workplace.workplaceFor(region.code);
      expect(facts, region.name).not.to.equal(null);
      expect(facts!.eu, region.name).to.equal(region.eu);
      const silica = facts!.silica;
      if (!silica) continue;
      checkedLately(silica, region.name);
      expect(Object.keys(guides.silica.kind), region.name).to.include(silica.kind);
      if (region.eu) expect(silica.quartz, region.name).to.be.at.most(workplace.EU_SILICA.quartz);
      if (silica.cristobalite) expect(silica.cristobalite, region.name).to.be.below(silica.quartz);
      if (facts!.agency) checkedLately(facts!.agency, region.name + ' agency');
    }
    // An agency whose own page could not be read is left out.
    expect(workplace.workplaceFor('PT')!.agency).to.equal(null);
  });

  it("should give every member state food-contact rules, its own or the EU's, in the law's units", () => {
    const units = ['mg/dm²', 'mg/L', 'µg/dm²', 'µg/L', 'µg/mL', 'mg'];
    for (const region of regions.REGIONS) {
      const found = food.foodRulesFor(region.code);
      if (region.eu) expect(found, region.name).not.to.equal(null);
      if (!found) continue;
      checkedLately(found.rules, region.name);
      for (const limit of found.rules.limits) {
        expect(guides.food.category, region.name).to.have.property(limit.category);
        expect(units, region.name).to.include(limit.unit);
        expect(limit.lead, region.name).to.be.above(0);
      }
    }
    // The Benelux limits are far below the directive's since 29 May 2026.
    for (const code of ['NL', 'BE', 'LU']) {
      const { rules, own } = food.foodRulesFor(code)!;
      expect(own, code).to.equal(true);
      expect(rules.limits[1], code).to.include({ lead: 30, cadmium: 20, unit: 'µg/L' });
    }
    expect(food.foodRulesFor('PT')!.own).to.equal(false);
    expect(food.foodRulesFor('NZ')).to.equal(null);
  });

  it('should name shops checked on their own sites, or shops elsewhere that say they deliver', () => {
    for (const region of regions.REGIONS) {
      const entry = suppliers.shopsFor(region.code);
      expect(entry, region.name).not.to.equal(null);
      expect(entry!.shops.length + entry!.nearby.length, region.name).to.be.above(0);
      for (const shop of entry!.shops) {
        checkedLately(shop, shop.name);
        for (const code of shop.sells) expect(guides.shops.what, shop.name).to.have.property(code);
        const sizes = shop.packs?.sizes ?? [];
        expect(
          [...sizes].sort((a, b) => a - b),
          shop.name
        ).to.eql(sizes);
      }
      for (const shop of entry!.nearby) {
        expect(shop.region, shop.name).not.to.equal(region.code);
        expect(shop.shipping, shop.name).to.match(/^https:\/\//);
      }
    }
    // A note on a shop is translated, as its English.
    expect(suppliers.texts()).to.include('No feldspar seen.');
  });
});
