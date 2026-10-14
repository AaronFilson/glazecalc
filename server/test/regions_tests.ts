import crypto from 'node:crypto';
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
      expect(['orton', 'temperature', 'sk']).to.include(region.cones);
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

  it("keeps the language's script in its format, and drops its own region for the reader's", () => {
    // Traditional Chinese read in Ireland is written as Traditional, not as zh-IE (Simplified).
    expect(regions.formatLocaleFor('zh-Hant', 'IE', 'auto')).to.equal('zh-Hant-IE');
    expect(regions.formatLocaleFor('zh-Hans', 'NL', 'auto')).to.equal('zh-Hans-NL');
    expect(regions.formatLocaleFor('zh-Hant', '', 'auto')).to.equal('zh-Hant');
    expect(regions.formatLocaleFor('zh-Hant-TW', 'DE', 'auto')).to.equal('zh-Hant-DE');
    // Portuguese stays European; a pseudo-locale is English.
    expect(regions.formatLocaleFor('pt-PT', 'FR', 'auto')).to.equal('pt-FR');
    expect(regions.formatLocaleFor('pt-PT', '', 'auto')).to.equal('pt-PT');
    expect(regions.formatLocaleFor('en-XA', 'DE', 'auto')).to.equal('en-DE');
    expect(regions.formatLocaleFor('ar-XB', '', 'auto')).to.equal('en');
    expect(regions.formatLocaleFor('', '', 'auto')).to.equal('en');
    // Traditional and Simplified write the same date differently.
    const date = new Date(2026, 9, 12);
    const written = (locale: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date);
    expect(written(regions.formatLocaleFor('zh-Hant', 'IE', 'auto'))).not.to.equal(written('zh-IE'));
  });

  it('offers only formats the runtime knows, each once', () => {
    expect(new Set(regions.FORMAT_LOCALES).size).to.equal(regions.FORMAT_LOCALES.length);
    for (const locale of regions.FORMAT_LOCALES) {
      expect(Intl.getCanonicalLocales(locale)[0], locale).to.equal(locale);
      expect(Intl.NumberFormat.supportedLocalesOf(locale), locale).to.eql([locale]);
    }
    expect(regions.FORMAT_LOCALES).to.include.members(['zh-Hans-CN', 'zh-Hant-TW', 'ja-JP', 'th-TH']);
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
        // A short number with # (Japan's #8000) is written %23 in its link.
        const dialled = decodeURIComponent(line.tel).replace(/\D/g, '');
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
  const HTTP_ONLY = ['丸二陶料'];
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
    const units = ['mg/dm²', 'mg/L', 'µg/dm²', 'µg/L', 'µg/mL', 'µg/cm²', 'mg'];
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
        // A shop whose site has no https address is linked as it is, and only that one.
        if (HTTP_ONLY.includes(shop.name)) expect(shop.url, shop.name).to.match(/^http:\/\//);
        else checkedLately(shop, shop.name);
        expect(Date.parse(shop.checked), shop.name + ': check this again').to.be.above(yearAgo);
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

// Japan (docs/asia-plan.md, Phase C), from research_notes/Asia/japan-verification-2026-10-14.md.
describe('Japan', () => {
  const yearAgo = Date.now() - 366 * 24 * 60 * 60 * 1000;

  it('fires by SK cones, reads density in Baumé, and lists the US library until its own materials exist', () => {
    expect(regions.regionFor('JP')).to.eql({
      code: 'JP',
      name: 'Japan',
      languages: ['ja'],
      eu: false,
      temperature: 'C',
      cones: 'sk',
      density: 'baume',
      library: 'US'
    });
    expect(regions.formatLocaleFor('en', 'JP', 'auto')).to.equal('en-JP');
  });

  it("gives 119, the poison centre's two public lines (acute cases only) and #8000 for children", () => {
    const shown = safety.shownFor('JP')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['119']);
    expect(shown.poison.map((line) => [line.number, line.tel])).to.eql([
      ['072-727-2499', '+81727272499'],
      ['029-852-9999', '+81298529999']
    ]);
    for (const line of shown.poison) {
      expect(line.source).to.equal('https://www.j-poison-ic.jp/110serviece/service-guide-genelal/');
      expect(line.hours).to.equal('24 hours, every day, free');
      expect(line.note).to.match(/^Only for acute poisoning/);
      expect(line.who).to.equal('public');
    }
    expect(shown.advice).to.have.length(1);
    expect(shown.advice[0]).to.include({ number: '#8000', tel: '%238000', who: 'children' });
    // The professionals' lines are not shown.
    const numbers = JSON.stringify(safety.SAFETY['JP']);
    for (const professional of ['072-726-9923', '029-851-9999']) expect(numbers).not.to.contain(professional);
    expect(safety.ministryFor('JP')).to.include({ name: '厚生労働省', url: 'https://www.mhlw.go.jp/' });
  });

  it("gives the control concentration as the law's formula, 0.025 for all free silica, beside JSOH's 0.03", () => {
    const facts = workplace.workplaceFor('JP')!;
    const silica = facts.silica!;
    expect(silica).to.include({ kind: 'control', quartz: 0.025, status: 'verified' });
    expect(silica.cristobalite).to.equal(undefined);
    expect(silica.formula).to.eql({ numerator: 3.0, factor: 1.19 });
    // E = 3.0 / (1.19Q + 1) at Q = 100 is the value shown for all free silica.
    expect(silica.formula!.numerator / (silica.formula!.factor * 100 + 1)).to.be.closeTo(silica.quartz, 1e-12);
    expect(silica.law).to.contain('昭和63年労働省告示第79号');
    expect(silica.recommended).to.include({ value: 0.03, abbr: 'JSOH', status: 'verified' });
    expect(Date.parse(silica.recommended!.checked)).to.be.above(yearAgo);
    expect(facts.respirators).to.include({ status: 'verified' });
    expect(facts.respirators!.everyday).to.eql(['DS2', 'RS2']);
    expect(facts.respirators!.higher).to.eql(['DS3', 'RS3']);
    expect(Date.parse(facts.respirators!.checked)).to.be.above(yearAgo);
    // A recommended value that could not be confirmed is left out, not the limit with it.
    const recommended = workplace.WORKPLACE['JP']!.silica!.recommended as { status: string };
    recommended.status = 'unverified';
    try {
      expect(workplace.workplaceFor('JP')!.silica).to.include({ quartz: 0.025 });
      expect(workplace.workplaceFor('JP')!.silica!.recommended).to.equal(undefined);
    } finally {
      recommended.status = 'verified';
    }
  });

  it('gives the ceramic limits as the law states them: µg/cm² for flat ware, three sizes and cooking ware in µg/mL, each at most', () => {
    const { rules, own } = food.foodRulesFor('JP')!;
    expect(own).to.equal(true);
    expect(rules.atMost).to.equal(true);
    expect(rules.limits).to.eql([
      { category: 'jpFlat', lead: 8, cadmium: 0.7, unit: 'µg/cm²' },
      { category: 'jpSmall', lead: 2, cadmium: 0.5, unit: 'µg/mL' },
      { category: 'jpLarge', lead: 1, cadmium: 0.25, unit: 'µg/mL' },
      { category: 'jpStorage', lead: 0.5, cadmium: 0.25, unit: 'µg/mL' },
      { category: 'jpCooking', lead: 0.5, cadmium: 0.05, unit: 'µg/mL' }
    ]);
    // The law does not say whether pieces are judged each or on average.
    for (const limit of rules.limits) expect(limit.judged).to.equal(undefined);
    // No other region says "at most".
    for (const code of Object.keys(food.FOOD).filter((code) => code !== 'JP')) {
      expect(food.FOOD[code]!.atMost, code).to.equal(undefined);
    }
  });

  it("names three shops checked on their own sites, and no shop's town that was not read there", () => {
    const { shops } = suppliers.shopsFor('JP')!;
    expect(shops.map((shop) => shop.name)).to.eql(['陶芸百貨店', '丸二陶料', 'ヤマニファーストセラミック']);
    expect(shops[1]!.place).to.equal(undefined);
    expect(shops[1]!.packs).to.eql({ unit: 'kilogram', sizes: [1, 25, 30] });
  });

  it('never names cones in its safety data, so never as Seger and never with an Orton number', () => {
    const text = JSON.stringify([
      safety.SAFETY['JP'],
      workplace.WORKPLACE['JP'],
      food.FOOD['JP'],
      suppliers.SUPPLIERS['JP']
    ]);
    expect(text).not.to.match(/seger|orton|cone/i);
  });
});

// Adding a region, and the fields it needed, leaves every earlier region's data as it was:
// the regions before Japan, then Japan too, before Turkey.
describe('regions before Turkey', () => {
  it('keep their data exactly', () => {
    const codes = [
      'US', 'GB', 'AU', 'NZ', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
      'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'JP'
    ]; // prettier-ignore
    const data: unknown[] = codes.map((code) => [
      code,
      regions.regionFor(code),
      safety.SAFETY[code],
      safety.MINISTRIES[code] ?? null,
      workplace.WORKPLACE[code] ?? null,
      food.FOOD[code] ?? null,
      suppliers.SUPPLIERS[code] ?? null
    ]);
    data.push(['EU', food.FOOD['EU'], workplace.EU_SILICA]);
    const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    expect(hash).to.equal('b67632a22a57f9bd73f72e3af3ddf3abebdaacfb69f1a3fe20d0b071a9019340');
  });
});
