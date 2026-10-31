import crypto from 'node:crypto';
import fs from 'node:fs';
import regions from '../../lib/regions/index.js';
import groups from '../../lib/regions/groups.js';
import languages from '../../lib/regions/languages.js';
import food from '../../lib/regions/food.js';
import suppliers from '../../lib/regions/suppliers.js';
import workplace from '../../lib/regions/workplace.js';
import safety from '../../lib/regions/safety.js';
import numbers from '../../lib/recipe/numbers.js';
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
      // Each language-region pair is a locale the runtime knows how to format (es-419 in Mexico: es-MX).
      for (const language of region.languages) {
        const locale = regions.formatLocaleFor(language, region.code, 'auto');
        expect(() => new Intl.NumberFormat(locale), region.code).not.to.throw();
        expect(locale, region.code).to.include('-' + region.code + '-u-');
      }
    }
    // Ireland's shops sell the UK's materials, so it lists the UK's, though it is in the EU.
    expect(regions.regionFor('IE')).to.include({ eu: true, cones: 'orton', library: 'UK' });
    expect(regions.formatLocaleFor('en', 'DE', 'auto')).to.equal('en-DE-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('pt', '', 'auto')).to.equal('pt-PT-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('en', 'DE', 'en-GB')).to.equal('en-GB-u-ca-gregory-nu-latn');
  });

  it('should price in each region’s own currency, which the runtime can write', () => {
    for (const region of regions.REGIONS) {
      expect(region.currency, region.name).to.match(/^[A-Z]{3}$/);
      expect(regions.CURRENCIES).to.include(region.currency);
      expect(() => new Intl.NumberFormat('en', { style: 'currency', currency: region.currency })).not.to.throw();
    }
    // The euro area, Bulgaria with it since 2026; the EU members outside it keep their own.
    for (const code of ['DE', 'IE', 'BG', 'HR']) expect(regions.regionFor(code)!.currency, code).to.equal('EUR');
    for (const [code, currency] of [
      ['SE', 'SEK'],
      ['PL', 'PLN'],
      ['CZ', 'CZK'],
      ['GB', 'GBP'],
      ['US', 'USD'],
      ['JP', 'JPY']
    ])
      expect(regions.regionFor(code)!.currency, code).to.equal(currency);
    expect(new Set(regions.CURRENCIES).size).to.equal(regions.CURRENCIES.length);
    // No region chosen: the format locale's region, or else the US dollar.
    expect(regions.currencyFor('GB', 'de-DE')).to.equal('GBP');
    expect(regions.currencyFor('', 'de-DE')).to.equal('EUR');
    expect(regions.currencyFor('', 'en')).to.equal('USD');
    expect(regions.currencyFor(null, 'not a locale')).to.equal('USD');
  });

  it("keeps the language's script in its format, and drops its own region for the reader's", () => {
    // Traditional Chinese read in Ireland is written as Traditional, not as zh-IE (Simplified).
    expect(regions.formatLocaleFor('zh-Hant', 'IE', 'auto')).to.equal('zh-Hant-IE-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('zh-Hans', 'NL', 'auto')).to.equal('zh-Hans-NL-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('zh-Hant', '', 'auto')).to.equal('zh-Hant-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('zh-Hant-TW', 'DE', 'auto')).to.equal('zh-Hant-DE-u-ca-gregory-nu-latn');
    // Portuguese stays European; a pseudo-locale is English.
    expect(regions.formatLocaleFor('pt-PT', 'FR', 'auto')).to.equal('pt-FR-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('pt-PT', '', 'auto')).to.equal('pt-PT-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('en-XA', 'DE', 'auto')).to.equal('en-DE-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('ar-XB', '', 'auto')).to.equal('en-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('', '', 'auto')).to.equal('en-u-ca-gregory-nu-latn');
    // Traditional and Simplified write the same date differently.
    const date = new Date(2026, 9, 12);
    const written = (locale: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date);
    expect(written(regions.formatLocaleFor('zh-Hant', 'IE', 'auto'))).not.to.equal(written('zh-IE'));
  });

  it('writes the pseudo-Arabic in Arabic-Indic digits, whatever the browser takes bare Arabic to mean', () => {
    expect(regions.formatLocaleFor('ar-XD', '', 'auto')).to.equal('ar-u-ca-gregory-nu-arab');
    // The Digits setting's 0-9 still wins over the language's own.
    expect(regions.formatLocaleFor('ar-XD', '', 'auto', 'gregory', 'western')).to.equal('ar-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('ar-XD', 'DE', 'auto', 'japanese')).to.equal('ar-DE-u-ca-japanese-nu-arab');
    expect(new Intl.NumberFormat(regions.formatLocaleFor('ar-XD', '', 'auto')).format(1240.5)).to.equal('١٬٢٤٠٫٥');
    // A format chosen in Settings is the reader's own; the pseudo-Hindi keeps Hindi's 0-9.
    expect(regions.formatLocaleFor('ar-XD', '', 'en-GB')).to.equal('en-GB-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('hi-XE', '', 'auto')).to.equal('hi-u-ca-gregory-nu-latn');
    // The pseudo-Tamil and pseudo-Kannada take their base's formats, and with a region, its grouping.
    expect(regions.formatLocaleFor('ta-XF', '', 'auto')).to.equal('ta-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('kn-XG', 'IN', 'auto')).to.equal('kn-IN-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('ml-XH', 'IN', 'auto')).to.equal('ml-IN-u-ca-gregory-nu-latn');
  });

  it('writes Thai dates in the Gregorian calendar, Western digits, until the Calendar setting exists', () => {
    const date = new Date(2026, 9, 16);
    const year = (locale: string) => new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(date);
    for (const locale of [
      regions.formatLocaleFor('th', '', 'auto'),
      regions.formatLocaleFor('th', 'DE', 'auto'),
      regions.formatLocaleFor('th', '', 'th-TH')
    ]) {
      expect(year(locale), locale).to.match(/2026/);
      expect(new Intl.NumberFormat(locale).format(1234.5), locale).to.equal('1,234.5');
    }
    // Every locale names the Gregorian calendar and its digits, and an explicit calendar is kept.
    expect(regions.formatLocaleFor('id', '', 'auto')).to.equal('id-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('vi', 'DE', 'auto')).to.equal('vi-DE-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('en', 'DE', 'auto')).to.equal('en-DE-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('th', '', 'th-TH-u-ca-buddhist')).to.equal('th-TH-u-ca-buddhist-nu-latn');
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
      for (const line of all(region.code)) {
        // Vietnam's numbers were "reported" (listed without their roles) until 2026-10-19: no status is
        // shown with a caution any more, and every line is verified or not shown.
        expect(['verified', 'extract', 'unverified'], line.name).to.include(line.status);
        if (line.status !== 'verified') {
          expect([...shown.emergency, ...shown.poison, ...shown.animals, ...shown.advice]).not.to.include(line);
        }
      }
    }
  });

  it("should dial what it shows: each link's digits match the number as written", () => {
    // A line's other number is checked the same way where it has its own link (Morocco's poison centre's).
    const numbers = (code: string) =>
      all(code).flatMap((l) => [
        { name: l.name, number: l.number, tel: l.tel },
        ...(l.also && l.alsoTel ? [{ name: l.name, number: l.also, tel: l.alsoTel }] : [])
      ]);
    expect(numbers('MA').map((l) => l.tel)).to.include('+212537686464');
    for (const region of regions.REGIONS) {
      for (const line of numbers(region.code).filter((l) => l.number)) {
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
  const HTTP_ONLY = ['丸二陶料', '太麟化工原料有限公司', 'Sam Mui Kuang Pottery'];
  const NO_SHOP_FOUND = [
    'MY',
    'CN',
    'ID',
    'VN',
    'PK',
    'BD',
    'EG',
    'MA',
    'DZ',
    'LK',
    'NP',
    ...['MX', 'BR', 'AR', 'CL'],
    ...['ZA', 'KE', 'GH']
  ];
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
      if (facts!.respirators) checkedLately(facts!.respirators, region.name + ' masks');
      // A limit that applies until a later one does: verified, checked lately, and ending the day before.
      if (silica.before) {
        expect(silica.from, region.name).to.match(/^\d{4}-\d{2}-\d{2}$/);
        checkedLately(silica.before, region.name + ' earlier limit');
        expect(silica.before.status, region.name).to.equal('verified');
        const dayAfter = new Date(Date.parse(silica.before.until) + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        expect(dayAfter, region.name).to.equal(silica.from);
      }
    }
    // An agency whose own page could not be read is left out.
    expect(workplace.workplaceFor('PT')!.agency).to.equal(null);
  });

  it('leaves out an earlier limit that could not be confirmed, and keeps the later one', () => {
    const before = workplace.WORKPLACE['TW']!.silica!.before as { status: string };
    before.status = 'secondary';
    try {
      expect(workplace.workplaceFor('TW')!.silica!.before).to.include({ status: 'secondary' });
      before.status = 'unverified';
      expect(workplace.workplaceFor('TW')!.silica).to.include({ quartz: 0.1, from: '2027-01-01' });
      expect(workplace.workplaceFor('TW')!.silica!.before).to.equal(undefined);
    } finally {
      before.status = 'verified';
    }
  });

  it("should give every member state food-contact rules, its own or the EU's, in the law's units", () => {
    const units = ['mg/dm²', 'mg/L', 'µg/dm²', 'µg/L', 'µg/mL', 'µg/cm²', 'mg', 'ppm'];
    for (const region of regions.REGIONS) {
      const found = food.foodRulesFor(region.code);
      if (region.eu) expect(found, region.name).not.to.equal(null);
      if (!found) continue;
      checkedLately(found.rules, region.name);
      // A region with no law that gives figures says so, from an official page, with no limits.
      if (found.rules.none) {
        expect(found.rules.limits, region.name).to.eql([]);
        expect(found.rules.status, region.name).to.equal('verified');
        expect(found.rules.note, region.name).to.be.a('string');
      } else expect(found.rules.limits.length, region.name).to.be.above(0);
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

  it('names laws and areas as their sources do: England’s regulations by name, Australia’s new limits, every French poison centre’s area', () => {
    // S.I. 2012/2619 is England's; the other three nations made matching regulations.
    expect(food.foodRulesFor('GB')!.rules.law).to.match(/^The Materials and Articles in Contact with Food \(England\)/);
    expect(workplace.workplaceFor('AU')!.silica!.law).to.include('workplace exposure limits from 1 December 2026');
    for (const centre of safety.SAFETY['FR']!.poison) {
      expect(centre.area, centre.name).to.be.a('string').and.not.equal('');
    }
  });

  it('should name shops checked on their own sites, or shops elsewhere that say they deliver', () => {
    for (const region of regions.REGIONS) {
      const entry = suppliers.shopsFor(region.code);
      expect(entry, region.name).not.to.equal(null);
      // Where no shop was found (Malaysia), the page says so.
      if (!NO_SHOP_FOUND.includes(region.code))
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
      library: 'US',
      currency: 'JPY'
    });
    expect(regions.formatLocaleFor('en', 'JP', 'auto')).to.equal('en-JP-u-ca-gregory-nu-latn');
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
    // Who answers (MHLW) and what it costs, as the prefectures' pages read say it.
    expect(shown.advice[0]!.note).to.contain('from nurses or doctors');
    expect(shown.advice[0]!.note).to.contain("The prefectures' pages we read say the advice is free");
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
    // Only Japan's 以下 and China's ≤ say "at most".
    for (const code of Object.keys(food.FOOD).filter((code) => code !== 'JP' && code !== 'CN')) {
      expect(food.FOOD[code]!.atMost, code).to.equal(undefined);
    }
    // The 2025 revision kept the 2008 limits, so no in-force date reads as if they were new; the note
    // says when the revision applies, and the transition to 2030.
    expect(rules.inForce).to.equal(undefined);
    expect(rules.note).to.contain('These limits date from 2008.');
    expect(rules.note).to.contain('1 June 2026').and.contain('1 June 2030').and.contain('Consumer Affairs Agency');
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

// Türkiye (docs/asia-plan.md), from research_notes/Asia/turkey-verification-2026-10-14.md.
describe('Türkiye', () => {
  const yearAgo = Date.now() - 366 * 24 * 60 * 60 * 1000;

  it('fires by temperature, reads density as specific gravity, and lists the EU library', () => {
    expect(regions.regionFor('TR')).to.eql({
      code: 'TR',
      name: 'Türkiye',
      languages: ['tr'],
      eu: false,
      temperature: 'C',
      cones: 'temperature',
      density: 'sg',
      library: 'EU',
      currency: 'TRY'
    });
    expect(regions.formatLocaleFor('en', 'TR', 'auto')).to.equal('en-TR-u-ca-gregory-nu-latn');
  });

  it('gives 112 for every emergency service and UZEM on 114, around the clock, free and for the public', () => {
    const shown = safety.shownFor('TR')!;
    expect(shown.emergency).to.have.length(1);
    expect(shown.emergency[0]).to.include({ number: '112', tel: '112', source: 'https://www.112.gov.tr/hakkimizda' });
    expect(shown.emergency[0]!.note).to.equal('One number for ambulance, fire, police, gendarmerie and coast guard.');
    expect(shown.poison).to.have.length(1);
    const uzem = shown.poison[0]!;
    // Free and for the public, read on official government pages on 2026-10-19 (the ministry's own did not answer).
    expect(uzem).to.include({
      number: '114',
      tel: '114',
      who: 'public',
      hours: '24 hours, every day, free',
      checked: '2026-10-19'
    });
    expect(uzem.name).to.contain('UZEM');
    expect(uzem.source).to.match(/^https:\/\/www\.[a-z]+\.gov\.tr\//);
    expect(uzem.note).to.equal('For the public and for health workers.');
    expect(uzem.fee).to.equal(undefined);
    expect(shown.animals).to.eql([]);
    expect(shown.advice).to.eql([]);
    expect(safety.ministryFor('TR')).to.include({ name: 'Sağlık Bakanlığı', url: 'https://www.saglik.gov.tr/' });
  });

  it("gives the binding limit as the law's formula, 10 / (Q + 2), with half for cristobalite", () => {
    const facts = workplace.workplaceFor('TR')!;
    const silica = facts.silica!;
    // Read again on 2026-10-19: no revision of the dust regulation is published.
    expect(silica).to.include({ kind: 'binding', status: 'verified', checked: '2026-10-19' });
    expect(silica.law).to.contain('Tozla Mücadele Yönetmeliği');
    expect(silica.source).to.equal('https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=18989&MevzuatTur=7&MevzuatTertip=5');
    expect(silica.formula).to.eql({ numerator: 10, factor: 1, offset: 2, places: 0 });
    // E = 10 / (Q + 2) at Q = 100 is the value shown for quartz, to three decimals; cristobalite's is half.
    const { numerator, factor, offset } = silica.formula!;
    const atHundred = numerator / (factor * 100 + offset!);
    expect(atHundred).to.be.closeTo(0.098, 0.0005);
    expect(silica.quartz).to.be.closeTo(atHundred, 0.0005);
    expect(silica.cristobalite).to.be.closeTo(atHundred / 2, 0.0005);
    expect(silica.recommended).to.equal(undefined);
    expect(silica.note).to.contain('2017/2398');
    expect(facts.eu).to.equal(false);
    expect(facts.agency).to.include({ abbr: 'ÇSGB İSGGM', url: 'https://csgb.gov.tr/' });
    expect(facts.agency!.silicaUrl).to.equal(undefined);
    // TS EN 149+A1 is in force (TSE's listing), but the FFP classes were read only in a secondary source.
    expect(facts.respirators).to.include({ status: 'secondary', checked: '2026-10-19' });
    expect(facts.respirators!.everyday).to.eql(['FFP2']);
    expect(facts.respirators!.higher).to.eql(['FFP3']);
    expect(Date.parse(facts.respirators!.checked)).to.be.above(yearAgo);
  });

  it("keeps Japan's formula as it was: offset 1 and one decimal where not given", () => {
    const formula = workplace.WORKPLACE['JP']!.silica!.formula!;
    expect(formula).to.eql({ numerator: 3.0, factor: 1.19 });
  });

  it("gives the Tebliğ's limits, the EU directive's figures, and its rule for three samples", () => {
    const { rules, own, eu } = food.foodRulesFor('TR')!;
    expect([own, eu]).to.eql([true, false]);
    expect(rules.law).to.contain('2012/30');
    expect(rules.limits).to.eql(food.FOOD['EU']!.limits);
    expect(rules.atMost).to.equal(undefined);
    expect(rules.note).to.match(/^At least three samples/);
  });

  it('names three shops checked on their own sites, and no town or pack size not read there', () => {
    const { shops, nearby } = suppliers.shopsFor('TR')!;
    expect(shops.map((shop) => shop.name)).to.eql(['Pega Seramik', 'Tecnodieci Shopping', 'Seramiksir']);
    expect(shops.map((shop) => shop.name)).not.to.include('Duygu Seramik');
    expect(shops[0]!.packs).to.eql({ unit: 'kilogram', sizes: [0.25, 0.5, 1] });
    expect(shops[1]!.packs).to.equal(undefined);
    expect(shops[2]!.place).to.equal(undefined);
    expect(shops[2]!.packs).to.eql({ unit: 'kilogram', sizes: [0.1, 0.5, 1] });
    for (const shop of shops) expect(shop.checked).to.equal('2026-10-14');
    expect(nearby).to.eql([]);
  });

  // "Seger piramidi" is what Turkish shops call Orton cones: no data here may say Seger.
  it('never names cones in its safety data, so never as Seger', () => {
    expect(regions.regionFor('TR')!.name).not.to.match(/seger/i);
    const text = JSON.stringify([
      safety.SAFETY['TR'],
      workplace.WORKPLACE['TR'],
      food.FOOD['TR'],
      suppliers.SUPPLIERS['TR']
    ]);
    expect(text).not.to.match(/seger|orton|cone/i);
  });
});

// Adding a region, and the fields it needed, leaves every earlier region's data as it was:
// the regions before Japan, then Japan too, before Turkey.

/** A region as these snapshots took it, before regions had a currency (checked on its own above). */
const asSnapshotted = (code: string): Record<string, unknown> => {
  const region: Record<string, unknown> = { ...regions.regionFor(code) };
  delete region.currency;
  return region;
};

describe('regions before Turkey', () => {
  it('keep their data exactly', () => {
    const codes = [
      'US', 'GB', 'AU', 'NZ', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
      'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'JP'
    ]; // prettier-ignore
    const data: unknown[] = codes.map((code) => [
      code,
      asSnapshotted(code),
      safety.SAFETY[code],
      safety.MINISTRIES[code] ?? null,
      workplace.WORKPLACE[code] ?? null,
      food.FOOD[code] ?? null,
      suppliers.SUPPLIERS[code] ?? null
    ]);
    data.push(['EU', food.FOOD['EU'], workplace.EU_SILICA]);
    const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    // Changed once on purpose: the verification pass of 2026-10-19 changed Japan's #8000 note (who answers,
    // what it costs), its food note (the 2025 revision's dates) and JSOH's check date; nothing else here.
    expect(hash).to.equal('f6f6dcdea2cad5e8dfbfaa3865aea8f80bd5465ef06a087fcb9e7abea03a6150');
  });
});

// The same, with Türkiye, before Korea, Taiwan, Singapore and Malaysia (docs/asia-plan.md, Phase C).
describe('regions before Korea', () => {
  it('keep their data exactly', () => {
    const codes = [
      'US', 'GB', 'AU', 'NZ', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
      'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'JP', 'TR'
    ]; // prettier-ignore
    const data: unknown[] = codes.map((code) => [
      code,
      asSnapshotted(code),
      safety.SAFETY[code],
      safety.MINISTRIES[code] ?? null,
      workplace.WORKPLACE[code] ?? null,
      food.FOOD[code] ?? null,
      suppliers.SUPPLIERS[code] ?? null
    ]);
    data.push(['EU', food.FOOD['EU'], workplace.EU_SILICA]);
    const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    // Changed once on purpose (2026-10-19): Japan's, as above, and Türkiye's UZEM (free, for the public),
    // its silica and mask check dates.
    expect(hash).to.equal('6e08ef4ca5228633c811d5ff9a29e0656ccc8396ac2173f9c464ebcc92c66bb2');
  });
});

// The same, with Korea, Taiwan, Singapore and Malaysia, before China, Hong Kong, Indonesia and Thailand.
describe('regions before China', () => {
  it('keep their data exactly', () => {
    const codes = [
      'US', 'GB', 'AU', 'NZ', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
      'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'JP', 'TR',
      'KR', 'TW', 'SG', 'MY'
    ]; // prettier-ignore
    const data: unknown[] = codes.map((code) => [
      code,
      asSnapshotted(code),
      safety.SAFETY[code],
      safety.MINISTRIES[code] ?? null,
      workplace.WORKPLACE[code] ?? null,
      food.FOOD[code] ?? null,
      suppliers.SUPPLIERS[code] ?? null
    ]);
    data.push(['EU', food.FOOD['EU'], workplace.EU_SILICA]);
    const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    // Changed once on purpose: Taiwan's 119 note now says when to dial 112 (2026-10-16). Again on
    // 2026-10-19: Japan's and Türkiye's, as above, and Taiwan's silica limit until 2027 (before).
    // Again on 2026-10-20: Taiwan's 112 note says plainly what 112 does when a mobile has no signal.
    expect(hash).to.equal('f0949b6b3e0b10dec5056af83dbb7d1857ea0953899336072d9b9aca0c5279c8');
  });
});

// The same, with China, Hong Kong, Indonesia, Thailand and the Philippines, before Vietnam.
describe('regions before Vietnam', () => {
  it('keep their data exactly', () => {
    const codes = [
      'US', 'GB', 'AU', 'NZ', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
      'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'JP', 'TR',
      'KR', 'TW', 'SG', 'MY', 'CN', 'HK', 'ID', 'TH', 'PH'
    ]; // prettier-ignore
    const data: unknown[] = codes.map((code) => [
      code,
      asSnapshotted(code),
      safety.SAFETY[code],
      safety.MINISTRIES[code] ?? null,
      workplace.WORKPLACE[code] ?? null,
      food.FOOD[code] ?? null,
      suppliers.SUPPLIERS[code] ?? null
    ]);
    data.push(['EU', food.FOOD['EU'], workplace.EU_SILICA]);
    const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    // Changed once on purpose: Indonesia's note says 118 reaches an ambulance only in some cities (2026-10-17).
    // Again on 2026-10-19, the verification pass: as above, and China's poison line, masks and food rules,
    // Hong Kong's food rules (none) and shop, Indonesia's in-force date, Thailand's and the Philippines'
    // shops, and the Philippines' silica limit. Again on 2026-10-20: Taiwan's 112 note.
    expect(hash).to.equal('890ce072179d317b8c8d15cbff30f12ffe2e3238b7faa5818259f6a5cf04425e');
  });
});

// The same, with Vietnam, after the verification pass of 2026-10-19 (docs/asia-plan.md, Phase C).
describe('regions after the verification pass of 2026-10-19', () => {
  it('keep their data exactly', () => {
    const codes = [
      'US', 'GB', 'AU', 'NZ', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
      'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'JP', 'TR',
      'KR', 'TW', 'SG', 'MY', 'CN', 'HK', 'ID', 'TH', 'PH', 'VN'
    ]; // prettier-ignore
    // Every region before the subcontinent's and the Arab world's (checked below, with theirs).
    const data: unknown[] = codes.map((code) => [
      code,
      asSnapshotted(code),
      safety.SAFETY[code],
      safety.MINISTRIES[code] ?? null,
      workplace.WORKPLACE[code] ?? null,
      food.FOOD[code] ?? null,
      suppliers.SUPPLIERS[code] ?? null
    ]);
    data.push(['EU', food.FOOD['EU'], workplace.EU_SILICA]);
    const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    // Changed on purpose on 2026-10-20: Taiwan's 112 note, and Vietnam's silica note reworded.
    expect(hash).to.equal('51953f47255b994f4303527c34134ce8378999ab5de09d975e15e064f4693185');
  });
});

// The Indian subcontinent's and the Arab world's first regions (docs/south-asia-mena-plan.md), frozen as
// added, with their currencies. Every region is in one snapshot or another, so a region added later
// gets one of its own.
const SOUTH_ASIA_MENA = ['IN', 'PK', 'BD', 'EG', 'AE', 'MA', 'DZ'];

describe('the subcontinent and the Arab world, as added', () => {
  it('keep their data exactly', () => {
    const data: unknown[] = SOUTH_ASIA_MENA.map((code) => [
      code,
      regions.regionFor(code),
      safety.SAFETY[code],
      safety.MINISTRIES[code] ?? null,
      workplace.WORKPLACE[code] ?? null,
      food.FOOD[code] ?? null,
      suppliers.SUPPLIERS[code] ?? null
    ]);
    const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    // Changed on purpose on 2026-10-21 (scratch/round8/india-data/report.md): India's state poison centres
    // (CMC Vellore, JSS Mysuru, Karamsad) and the states' silica limits under its no-limit note; and India
    // lists Tamil, Marathi and Kannada after Hindi and English. Changed on purpose on 2026-10-21 again (waves I2
    // and I3's groundwork): India lists Telugu, Gujarati, Malayalam, Punjabi and Odia after Kannada.
    expect(hash).to.equal('f92e073f82afbd4150758e2690fc38ee6422b215a77af8584e114abdcb9ef7b3');
  });
});

// Sri Lanka and Nepal (docs/south-asia-mena-plan.md, C3), frozen as added on 2026-10-21.
const SOUTH_ASIA_C3 = ['LK', 'NP'];

describe('Sri Lanka and Nepal, as added', () => {
  it('keep their data exactly', () => {
    const data: unknown[] = SOUTH_ASIA_C3.map((code) => [
      code,
      regions.regionFor(code),
      safety.SAFETY[code],
      safety.MINISTRIES[code] ?? null,
      workplace.WORKPLACE[code] ?? null,
      food.FOOD[code] ?? null,
      suppliers.SUPPLIERS[code] ?? null
    ]);
    const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    expect(hash).to.equal('d031d86c7163df32fff04626cfc9c7ea047ebfc746bdc78ca82f94a087ac0aa8');
  });
});

// Latin America and Africa's first regions (round 10, L0), frozen as added on 2026-10-30; refrozen on 2026-10-31,
// when Mexico, Argentina and Chile took Latin American Spanish (wave L1).
const LATAM_AFRICA_L0 = ['MX', 'BR', 'AR', 'CL', 'ZA', 'KE', 'GH'];

describe('Latin America and Africa, as added', () => {
  it('keep their data exactly', () => {
    const data: unknown[] = LATAM_AFRICA_L0.map((code) => [
      code,
      regions.regionFor(code),
      safety.SAFETY[code],
      safety.MINISTRIES[code] ?? null,
      workplace.WORKPLACE[code] ?? null,
      food.FOOD[code] ?? null,
      suppliers.SUPPLIERS[code] ?? null
    ]);
    const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    expect(hash).to.equal('28fbfa5e55dfa7b9063fb1395a2b02a1b717c29b3c981257e97980255641c08d');
  });

  it('are, with the earlier snapshots, every region', () => {
    const earlier = regions.REGION_CODES.slice(0, regions.REGION_CODES.indexOf('VN') + 1);
    expect(earlier).to.have.length(43);
    expect([...earlier, ...SOUTH_ASIA_MENA, ...SOUTH_ASIA_C3, ...LATAM_AFRICA_L0]).to.eql([...regions.REGION_CODES]);
  });
});

// South Korea (docs/asia-plan.md, Phase C), from research_notes/Asia/verification-KR-TW-SG-MY-2026-10-16.md.
describe('South Korea', () => {
  it('fires by temperature, reads density as specific gravity, and lists the US library', () => {
    expect(regions.regionFor('KR')).to.eql({
      code: 'KR',
      name: 'South Korea',
      languages: ['ko'],
      eu: false,
      temperature: 'C',
      cones: 'temperature',
      density: 'sg',
      library: 'US',
      currency: 'KRW'
    });
    expect(regions.formatLocaleFor('en', 'KR', 'auto')).to.equal('en-KR-u-ca-gregory-nu-latn');
  });

  it('gives 119, no poison line (none national was found), and 119 for medical advice', () => {
    const shown = safety.shownFor('KR')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['119']);
    expect(shown.poison).to.eql([]);
    expect(shown.advice.map((line) => [line.number, line.tel])).to.eql([['119', '119']]);
    expect(shown.advice[0]!.note).to.contain('no national public poison line');
    // The Seoul centre is known only from a journal report, and 02-3407-4050 only from a directory.
    expect(JSON.stringify(safety.SAFETY['KR'])).not.to.match(/1855|3407|Seoul Poison/);
    expect(safety.ministryFor('KR')).to.include({ name: '보건복지부', url: 'https://www.mohw.go.kr/' });
  });

  it('gives the exposure standard as indicative, 1급 and 특급 masks, and KF94 only as a health mask', () => {
    const facts = workplace.workplaceFor('KR')!;
    expect(facts.silica).to.include({ quartz: 0.05, kind: 'indicative', status: 'verified', checked: '2026-10-13' });
    expect(facts.silica!.cristobalite).to.equal(undefined);
    expect(facts.silica!.law).to.contain('제2020-48호');
    expect(facts.silica!.from).to.equal(undefined);
    expect(facts.agency).to.include({ name: '고용노동부', abbr: 'MoEL' });
    expect(facts.respirators).to.include({ status: 'verified' });
    expect(facts.respirators!.everyday).to.eql(['1급']);
    expect(facts.respirators!.higher).to.eql(['특급']);
    expect(facts.respirators!.note).to.contain('not certified dust masks for work');
  });

  it("gives the MFDS ceramic limits in the law's units, Japan's values, with no judging rule not read", () => {
    const { rules, own } = food.foodRulesFor('KR')!;
    expect(own).to.equal(true);
    expect(rules.limits.map((l) => [l.category, l.lead, l.cadmium, l.unit])).to.eql([
      ['krFlat', 8, 0.7, 'µg/cm²'],
      ['krSmall', 2, 0.5, 'mg/L'],
      ['krMedium', 1, 0.25, 'mg/L'],
      ['krStorage', 0.5, 0.25, 'mg/L'],
      ['krCooking', 0.5, 0.05, 'mg/L']
    ]);
    for (const limit of rules.limits) expect(limit.judged).to.equal(undefined);
    expect(rules.atMost).to.equal(undefined);
  });

  it('names two shops checked on their own sites, and not the feldspar producer', () => {
    const { shops, nearby } = suppliers.shopsFor('KR')!;
    expect(shops.map((shop) => shop.name)).to.eql(['중앙도재', '클레이어']);
    for (const shop of shops) expect(shop.place).to.equal(undefined);
    expect(JSON.stringify(suppliers.SUPPLIERS['KR'])).not.to.contain('세라믹미네랄');
    expect(nearby).to.eql([]);
  });
});

// Taiwan (docs/asia-plan.md, Phase C), from research_notes/Asia/verification-KR-TW-SG-MY-2026-10-16.md.
describe('Taiwan', () => {
  it('fires by temperature, reads density as specific gravity, and lists the US library', () => {
    expect(regions.regionFor('TW')).to.include({
      code: 'TW',
      name: 'Taiwan',
      temperature: 'C',
      cones: 'temperature',
      density: 'sg',
      library: 'US'
    });
    expect(regions.regionFor('TW')!.languages).to.eql(['zh-Hant']);
    expect(regions.formatLocaleFor('en', 'TW', 'auto')).to.equal('en-TW-u-ca-gregory-nu-latn');
  });

  it("gives 119 and the Taipei Veterans General Hospital's poison centre, around the clock and free", () => {
    const shown = safety.shownFor('TW')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['119']);
    expect(shown.poison.map((line) => [line.number, line.tel])).to.eql([['02-2871-7121', '+886228717121']]);
    expect(shown.poison[0]).to.include({ who: 'public', hours: '24 hours, every day, free' });
    expect(shown.poison[0]!.also).to.equal(undefined);
    expect(safety.ministryFor('TW')).to.include({ name: '衛生福利部' });
  });

  it('gives the 2027 limit with its start date, and the earlier formula until then, read in the law site’s own table', () => {
    const silica = workplace.workplaceFor('TW')!.silica!;
    expect(silica).to.include({ quartz: 0.1, kind: 'binding', status: 'verified', from: '2027-01-01' });
    expect(silica.checked).to.equal('2026-10-19');
    expect(silica.formula).to.equal(undefined);
    expect(silica.cristobalite).to.equal(undefined);
    // The table in force until 2026-12-31 (the 2018 text), read in the 2025 amendment's comparison table.
    expect(silica.before).to.eql({
      quartz: 0.098,
      formula: { numerator: 10, factor: 1, offset: 2, places: 0 },
      until: '2026-12-31',
      law: '勞工作業場所容許暴露標準，附表二（2018年3月14日修正），第一種粉塵',
      source: 'https://law.moj.gov.tw/LawClass/LawGetFile.ashx?FileId=0000387834&lan=C&type=1&date=20250411',
      status: 'verified',
      checked: '2026-10-19'
    });
    const { numerator, factor, offset } = silica.before!.formula!;
    expect(silica.before!.quartz).to.be.closeTo(numerator / (factor * 100 + offset!), 0.0005);
    expect(silica.note).to.match(/^Until 31 December 2026 the limit is for the whole respirable dust/);
    expect(silica.note).not.to.contain('not shown');
    // Every start date is a day; a limit that starts later says what applies until then.
    for (const [code, entry] of Object.entries(workplace.WORKPLACE)) {
      if (!entry.silica?.from) continue;
      expect(entry.silica.from, code).to.match(/^\d{4}-\d{2}-\d{2}$/);
      if (Date.parse(entry.silica.from) > Date.now()) expect(entry.silica.note, code).to.match(/^Until /);
    }
  });

  it('names the CNS 14755 classes as secondary, without percentages', () => {
    const respirators = workplace.workplaceFor('TW')!.respirators!;
    expect(respirators).to.include({ status: 'secondary' });
    expect([respirators.everyday, respirators.higher]).to.eql([['D2'], ['D3']]);
    expect(respirators.note).to.contain('CNS 14755');
    expect(respirators.note).not.to.match(/%/);
  });

  it("gives the hygiene standard's limits in ppm and µg/cm², with no cooking ware", () => {
    const { rules } = food.foodRulesFor('TW')!;
    expect(rules.limits.map((l) => [l.category, l.lead, l.cadmium, l.unit])).to.eql([
      ['twFlat', 17, 1.7, 'µg/cm²'],
      ['twSmall', 5, 0.5, 'ppm'],
      ['twLarge', 2.5, 0.25, 'ppm']
    ]);
    for (const limit of rules.limits) expect(limit.judged).to.equal(undefined);
  });

  it('names one shop, linked at the http address its site has, and not the one read only in an extract', () => {
    const { shops } = suppliers.shopsFor('TW')!;
    expect(shops.map((shop) => [shop.name, shop.url])).to.eql([['太麟化工原料有限公司', 'http://www.tai-lin.com.tw/']]);
    expect(JSON.stringify(suppliers.SUPPLIERS['TW'])).not.to.contain('glazes.com.tw');
  });
});

// Singapore (docs/asia-plan.md, Phase C), from research_notes/Asia/verification-KR-TW-SG-MY-2026-10-16.md.
describe('Singapore', () => {
  it('stays in English, fires by temperature, and lists the US library', () => {
    expect(regions.regionFor('SG')).to.include({ temperature: 'C', cones: 'temperature', library: 'US' });
    expect(regions.regionFor('SG')!.languages[0]).to.equal('en');
    expect(regions.formatLocaleFor('en', 'SG', 'auto')).to.equal('en-SG-u-ca-gregory-nu-latn');
  });

  it('gives 995, no poison line (none is on an official page), and the health ministry', () => {
    const shown = safety.shownFor('SG')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['995']);
    expect(shown.poison).to.eql([]);
    expect(shown.advice).to.eql([]);
    expect(JSON.stringify(safety.SAFETY['SG'])).not.to.match(/6423|6262|1777/);
    expect(safety.ministryFor('SG')).to.include({ url: 'https://www.moh.gov.sg/' });
  });

  it('keeps the earlier check date for the statutes, which could not be read again', () => {
    const facts = workplace.workplaceFor('SG')!;
    expect(facts.silica).to.include({ quartz: 0.1, cristobalite: 0.05, kind: 'binding', checked: '2026-10-12' });
    expect(facts.agency).to.include({ abbr: 'MOM' });
    // SS 548's classes were not read, and N95 was seen only in a search extract.
    expect(facts.respirators).to.equal(null);
    expect(food.foodRulesFor('SG')!.rules.checked).to.equal('2026-10-12');
  });

  it('gives lead only, in the US kinds of piece, each of six within the limit', () => {
    const { rules } = food.foodRulesFor('SG')!;
    expect(rules.limits.map((l) => [l.category, l.lead, l.unit, l.judged])).to.eql([
      ['flatware', 3, 'µg/mL', 'each'],
      ['smallHollow', 2, 'µg/mL', 'each'],
      ['cups', 0.5, 'µg/mL', 'each'],
      ['largeHollow', 1, 'µg/mL', 'each'],
      ['pitchers', 0.5, 'µg/mL', 'each']
    ]);
    for (const limit of rules.limits) expect(limit.cadmium).to.equal(undefined);
    expect(rules.note).to.contain('lead only');
  });

  it('names two shops, and not the one known only from an extract', () => {
    const { shops } = suppliers.shopsFor('SG')!;
    expect(shops.map((shop) => shop.name)).to.eql(['Sam Mui Kuang Pottery', "The Potters' Guilt"]);
    expect(shops[1]!.sells).not.to.include('materials');
    expect(JSON.stringify(suppliers.SUPPLIERS['SG'])).not.to.contain('Wei Chuan');
  });
});

// Malaysia (docs/asia-plan.md, Phase C), from research_notes/Asia/verification-KR-TW-SG-MY-2026-10-16.md.
describe('Malaysia', () => {
  it('stays in English, fires by temperature, and lists the US library', () => {
    expect(regions.regionFor('MY')).to.include({ temperature: 'C', cones: 'temperature', library: 'US' });
    expect(regions.regionFor('MY')!.languages).to.eql(['ms', 'en']);
    expect(regions.formatLocaleFor('en', 'MY', 'auto')).to.equal('en-MY-u-ca-gregory-nu-latn');
  });

  it('gives 999, and the National Poison Centre with its hours, not 24 hours, and no claim on cost', () => {
    const shown = safety.shownFor('MY')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['999']);
    expect(shown.emergency.map((line) => line.number)).not.to.include('112');
    expect(shown.poison.map((line) => [line.number, line.tel])).to.eql([['04-6536 999', '+6046536999']]);
    const centre = shown.poison[0]!;
    expect(centre.hours).to.contain('Monday to Friday 8:00 to 22:00');
    expect(centre.hours).not.to.match(/24/);
    expect(centre.fee).to.equal(undefined);
    expect(JSON.stringify(safety.SAFETY['MY'])).not.to.match(/free/i);
    expect(centre.online).to.eql({ name: 'Telegram', url: 'https://t.me/usm_prn_bot' });
    expect(safety.ministryFor('MY')).to.include({ name: 'Kementerian Kesihatan Malaysia' });
  });

  it("gives the USECHH limits and DOSH's mask classes", () => {
    const facts = workplace.workplaceFor('MY')!;
    expect(facts.silica).to.include({ quartz: 0.1, cristobalite: 0.05, kind: 'binding' });
    expect(facts.agency).to.include({ abbr: 'JKKP', url: 'https://dosh.gov.my/' });
    expect(facts.respirators).to.include({ status: 'verified' });
    expect(facts.respirators!.everyday).to.eql(['N95']);
  });

  it('gives the 2026 limits, four pieces judged, from 1 August 2026, without the 1.1 L line not read', () => {
    const { rules } = food.foodRulesFor('MY')!;
    expect(rules.inForce).to.equal('2026-08-01');
    expect(rules.limits.map((l) => [l.category, l.lead, l.cadmium, l.unit, l.judged, l.pieces])).to.eql([
      ['myFlat', 0.8, 0.07, 'mg/dm²', 'average', 4],
      ['mySmall', 2, 0.5, 'mg/L', 'each', 4],
      ['myLarge', 1, 0.25, 'mg/L', 'each', 4],
      ['myCooking', 0.5, 0.05, 'mg/L', 'each', 4]
    ]);
    expect(JSON.stringify(rules)).not.to.contain('1.1');
  });

  it('lists no shop, since none was found', () => {
    expect(suppliers.shopsFor('MY')).to.eql({ shops: [], nearby: [] });
  });
});

// China (docs/asia-plan.md, Phase C), from research_notes/Asia/regions-CN-HK-ID-TH-VN-PH-2026-10-16.md.
describe('China', () => {
  it('fires by temperature, reads density as specific gravity, and lists the US library', () => {
    expect(regions.regionFor('CN')).to.include({
      name: 'China',
      temperature: 'C',
      cones: 'temperature',
      density: 'sg',
      library: 'US'
    });
    expect(regions.regionFor('CN')!.languages).to.eql(['zh-Hans']);
    expect(regions.formatLocaleFor('zh-Hans', 'CN', 'auto')).to.equal('zh-Hans-CN-u-ca-gregory-nu-latn');
  });

  it("gives 120 and China CDC's poison line, saying plainly that no official page gives its hours or cost", () => {
    const shown = safety.shownFor('CN')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['120']);
    expect(shown.poison.map((line) => [line.number, line.tel])).to.eql([['010-83132345', '+861083132345']]);
    const line = shown.poison[0]!;
    // China CDC's own article gives the number with its area code and tells the public to call it.
    expect(line).to.include({
      who: 'public',
      status: 'verified',
      checked: '2026-10-19',
      source: 'https://www.chinacdc.cn/jkkp/zyjk/zdzs/202508/t20250826_309858.html'
    });
    expect(line.hours).to.equal(undefined);
    expect(line.fee).to.equal(undefined);
    expect(line.note).to.contain('No official page gives its hours or its cost');
    expect(line.note).to.contain('call 120');
    expect(safety.ministryFor('CN')).to.equal(null);
  });

  it("gives GBZ 2.1's binding limits by band of free silica, the top band's as quartz's", () => {
    const facts = workplace.workplaceFor('CN')!;
    const silica = facts.silica!;
    expect(silica).to.include({ quartz: 0.2, kind: 'binding', status: 'verified' });
    expect(silica.cristobalite).to.equal(undefined);
    expect(silica.bands).to.eql([
      { from: 10, fromIncluded: true, to: 50, value: 0.7 },
      { from: 50, fromIncluded: false, to: 80, value: 0.3 },
      { from: 80, fromIncluded: false, value: 0.2 }
    ]);
    // Bands run upward without gaps, and the top one is quartz's.
    for (const [code, entry] of Object.entries(workplace.WORKPLACE)) {
      const bands = entry.silica?.bands;
      if (!bands) continue;
      bands.slice(1).forEach((band, i) => expect(band.from, code).to.equal(bands[i]!.to));
      expect(bands.at(-1)!.to, code).to.equal(undefined);
      expect(bands.at(-1)!.value, code).to.equal(entry.silica!.quartz);
    }
    expect(facts.agency).to.equal(null);
    // KN95 is named on an official page, KN100 only in a secondary summary of GB 2626-2019.
    expect(facts.respirators).to.include({ status: 'secondary', checked: '2026-10-19' });
    expect([facts.respirators!.everyday, facts.respirators!.higher]).to.eql([['KN95'], ['KN100']]);
    expect(facts.respirators!.note).to.contain('GB 2626-2019');
  });

  it("gives GB 4806.4—2016's six kinds of piece, at most, with cooking ware's hot test and figures", () => {
    const { rules, own } = food.foodRulesFor('CN')!;
    expect(own).to.equal(true);
    expect(rules).to.include({ status: 'verified', checked: '2026-10-19', inForce: '2017-04-19', atMost: true });
    expect(rules.law).to.contain('GB 4806.4—2016');
    expect(rules.source).to.match(/^https:\/\/www\.anan\.gov\.cn\//);
    expect(rules.limits.map((l) => [l.category, l.lead, l.cadmium, l.unit])).to.eql([
      ['cnFlat', 0.8, 0.07, 'mg/dm²'],
      ['cnSmall', 2, 0.3, 'mg/L'],
      ['cnLarge', 1, 0.25, 'mg/L'],
      ['cnStorage', 0.5, 0.25, 'mg/L'],
      ['cnCups', 0.5, 0.25, 'mg/L'],
      // Not the 0.5 / 0.05 of an earlier note from memory: the standard's own table says 3.0 / 0.30.
      ['cnCooking', 3, 0.3, 'mg/L']
    ]);
    for (const limit of rules.limits) expect(limit.judged).to.equal(undefined);
    expect(rules.note).to.contain('98 °C').and.contain('Guangdong');
  });

  it('lists no shop, since none was found on its own site', () => {
    expect(suppliers.shopsFor('CN')).to.eql({ shops: [], nearby: [] });
  });
});

describe('Hong Kong', () => {
  it("reads Traditional Chinese and English, formats as Hong Kong's, and comes after Taiwan", () => {
    expect(regions.regionFor('HK')).to.include({ temperature: 'C', cones: 'temperature', library: 'US' });
    expect(regions.regionFor('HK')!.languages).to.eql(['zh-Hant', 'en']);
    expect(regions.formatLocaleFor('zh-Hant', 'HK', 'auto')).to.equal('zh-Hant-HK-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('en', 'HK', 'auto')).to.equal('en-HK-u-ca-gregory-nu-latn');
    // Traditional Chinese pages are prerendered for the first region listing it first: Taiwan.
    expect(regions.REGION_CODES.indexOf('TW')).to.be.below(regions.REGION_CODES.indexOf('HK'));
  });

  it('gives 999 and the Department of Health, since the poison centre answers only professionals', () => {
    const shown = safety.shownFor('HK')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['999']);
    expect(shown.poison).to.eql([]);
    expect(safety.ministryFor('HK')).to.include({ url: 'https://www.dh.gov.hk/' });
  });

  it("gives the Labour Department's guide values, quartz 0.1 and cristobalite 0.05", () => {
    const facts = workplace.workplaceFor('HK')!;
    expect(facts.silica).to.include({ quartz: 0.1, cristobalite: 0.05, kind: 'indicative' });
    expect(facts.agency).to.include({ silicaUrl: 'https://www.labour.gov.hk/eng/public/oh/silicosis.pdf' });
  });

  it('says there is no law with figures for ceramic ware, from the Centre for Food Safety, with no limits', () => {
    const { rules, own, eu } = food.foodRulesFor('HK')!;
    expect([own, eu]).to.eql([true, false]);
    expect(rules).to.include({
      none: true,
      status: 'verified',
      checked: '2026-10-19',
      source: 'https://www.cfs.gov.hk/english/food_leg/files/Guidelines_Tray_liner.pdf'
    });
    expect(rules.limits).to.eql([]);
    expect(rules.law).to.contain('Centre for Food Safety');
    expect(rules.note).to.contain('Cap. 132').and.contain('Cap. 456').and.contain('2009');
    // Only Hong Kong says there is no law.
    for (const code of Object.keys(food.FOOD).filter((code) => code !== 'HK')) {
      expect(food.FOOD[code]!.none, code).to.equal(undefined);
    }
  });

  it('names Hearty Ceramic, checked on its own site, with its town and packs', () => {
    const { shops, nearby } = suppliers.shopsFor('HK')!;
    expect(shops.map((shop) => [shop.name, shop.place])).to.eql([
      ['Hearty Ceramic (Hearty Arts International Limited)', 'Tai Kok Tsui (Kowloon)']
    ]);
    expect(shops[0]!.packs).to.eql({ unit: 'kilogram', sizes: [1, 5, 10] });
    expect(shops[0]!.checked).to.equal('2026-10-19');
    expect(JSON.stringify(suppliers.SUPPLIERS['HK'])).not.to.contain('Paton');
    expect(nearby).to.eql([]);
  });
});

describe('Indonesia', () => {
  it('fires by temperature and lists the US library', () => {
    expect(regions.regionFor('ID')).to.include({ temperature: 'C', cones: 'temperature', library: 'US' });
    expect(regions.regionFor('ID')!.languages).to.eql(['id']);
    expect(regions.formatLocaleFor('id', 'ID', 'auto')).to.equal('id-ID-u-ca-gregory-nu-latn');
  });

  it('gives 119, no poison line, and the health ministry', () => {
    const shown = safety.shownFor('ID')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['119']);
    expect(shown.poison).to.eql([]);
    expect(JSON.stringify(safety.SAFETY['ID'])).not.to.contain('500533');
    expect(safety.ministryFor('ID')).to.include({ name: 'Kementerian Kesehatan' });
  });

  it("gives Permenaker 5/2018's NAB of 0.025 for quartz and cristobalite", () => {
    const facts = workplace.workplaceFor('ID')!;
    expect(facts.silica).to.include({ quartz: 0.025, kind: 'binding' });
    expect(facts.silica!.cristobalite).to.equal(undefined);
    expect(facts.agency).to.include({ abbr: 'Kemnaker' });
  });

  it("gives BPOM 11/2026's limits, the same for both hollow sizes, in force from its promulgation, with a year for ware on the market", () => {
    const { rules } = food.foodRulesFor('ID')!;
    expect(rules.limits.map((l) => [l.category, l.lead, l.cadmium, l.unit])).to.eql([
      ['idFlat', 0.8, 0.07, 'mg/dm²'],
      ['idSmall', 0.5, 0.25, 'mg/L'],
      ['idLarge', 0.5, 0.25, 'mg/L']
    ]);
    expect(rules).to.include({ inForce: '2026-06-30', checked: '2026-10-19' });
    expect(rules.note).to.contain('third');
    expect(rules.note).to.contain('Ware already on the market has until 30 June 2027 to comply.');
  });

  it('keeps HALOBPOM out, since no official page gives it as a poison line today', () => {
    expect(JSON.stringify(safety.SAFETY['ID'])).not.to.match(/1500.?533|HALO/i);
  });
});

describe('Thailand', () => {
  it('fires by temperature and lists the US library', () => {
    expect(regions.regionFor('TH')).to.include({ temperature: 'C', cones: 'temperature', library: 'US' });
    expect(regions.regionFor('TH')!.languages).to.eql(['th']);
    expect(regions.formatLocaleFor('th', 'TH', 'auto')).to.equal('th-TH-u-ca-gregory-nu-latn');
  });

  it('gives 1669 and the Ramathibodi Poison Center, 1367, around the clock, with no claim on cost', () => {
    const shown = safety.shownFor('TH')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['1669']);
    expect(shown.poison.map((line) => [line.number, line.tel])).to.eql([['1367', '1367']]);
    expect(shown.poison[0]).to.include({ who: 'public', hours: '24 hours, every day' });
    expect(JSON.stringify(safety.SAFETY['TH'])).not.to.match(/free/i);
  });

  it("gives the labour department's limit of 0.025 for quartz and cristobalite", () => {
    const facts = workplace.workplaceFor('TH')!;
    expect(facts.silica).to.include({ quartz: 0.025, kind: 'binding' });
    expect(facts.agency).to.include({ url: 'https://osh.labour.go.th/' });
  });

  it("gives Notification No. 92's five kinds of piece, all in mg/L", () => {
    const { rules } = food.foodRulesFor('TH')!;
    expect(rules.inForce).to.equal('1985-09-03');
    expect(rules.limits.map((l) => [l.category, l.lead, l.cadmium, l.unit])).to.eql([
      ['thFlat', 7, 0.7, 'mg/L'],
      ['thSmall', 5, 0.5, 'mg/L'],
      ['thLarge', 2.5, 0.25, 'mg/L'],
      ['thInfant', 2.5, 0.25, 'mg/L'],
      ['thCooking', 5, 0.5, 'mg/L']
    ]);
  });

  it('names two shops checked on their own sites, Cerawan at its full address', () => {
    const { shops, nearby } = suppliers.shopsFor('TH')!;
    expect(shops.map((shop) => [shop.name, shop.place])).to.eql([
      ['Pottery Clay Thailand', undefined],
      ['Cerawan (เซล่าวัล ซัพพลาย)', 'Krathum Baen (Samut Sakhon)']
    ]);
    // The short address without the Thai words answers 404.
    expect(shops[1]!.url).to.equal('https://www.cerawan.com/14360596/เคมีภัณฑ์-chemical-วัตถุดิบในงานเคลือบและทดลอง');
    expect(shops[1]!.packs).to.equal(undefined);
    expect(shops[1]!.note).to.equal('Priced by the kilogram.');
    for (const shop of shops) expect(shop.checked).to.equal('2026-10-19');
    expect(nearby).to.eql([]);
  });
});

describe('Philippines', () => {
  it('stays in English, fires by temperature, and lists the US library', () => {
    expect(regions.regionFor('PH')).to.include({ temperature: 'C', cones: 'temperature', library: 'US' });
    expect(regions.regionFor('PH')!.languages).to.eql(['fil', 'en']);
    expect(regions.formatLocaleFor('en', 'PH', 'auto')).to.equal('en-PH-u-ca-gregory-nu-latn');
  });

  it('gives 911 and the National Poison Management and Control Center, 24 hours and free', () => {
    const shown = safety.shownFor('PH')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['911']);
    expect(shown.poison.map((line) => [line.number, line.tel])).to.eql([['(02) 8524 1078', '+63285241078']]);
    expect(shown.poison[0]).to.include({ who: 'public', hours: '24 hours, every day, free' });
  });

  it("gives the OSH Standards' silica formula, 10 / (Q + 2), half for cristobalite, read in an archived copy of DOLE's own file", () => {
    const facts = workplace.workplaceFor('PH')!;
    const silica = facts.silica!;
    expect(silica).to.include({ kind: 'binding', status: 'verified', checked: '2026-10-19', cristobalite: 0.049 });
    expect(silica.law).to.contain('Rule 1070, Table 8a');
    expect(silica.source).to.match(/^https:\/\/web\.archive\.org\/web\/\d+\/https:\/\/www\.dole\.gov\.ph\//);
    expect(silica.formula).to.eql({ numerator: 10, factor: 1, offset: 2, places: 0 });
    expect(silica.quartz).to.be.closeTo(10 / 102, 0.0005);
    expect(silica.cristobalite).to.be.closeTo(silica.quartz / 2, 0.0005);
    expect(silica.note).to.contain("Internet Archive's copy").and.contain('48 hours');
    // DOLE's and the OSHC's own pages could not be read: no agency, and no mask classes were read.
    expect(facts.agency).to.equal(null);
    expect(facts.respirators).to.equal(null);
  });

  it('gives no food-contact rules, since none was found', () => {
    expect(food.foodRulesFor('PH')).to.equal(null);
  });

  it('names a shop for raw materials and one for clay and ready-made glazes, both in Quezon City', () => {
    const { shops } = suppliers.shopsFor('PH')!;
    expect(shops.map((shop) => [shop.name, shop.place])).to.eql([
      ['Tahanan Pottery', 'Quezon City'],
      ['Odangputik Pottery', 'Quezon City']
    ]);
    expect(shops[0]!.packs).to.eql({ unit: 'kilogram', sizes: [0.25, 0.5, 1] });
    expect(shops[1]!.sells).to.eql(['clays', 'glazes']);
    // The same words as Singapore's shop for clay and glazes, so its translations serve both.
    expect(shops[1]!.note).to.equal(suppliers.SUPPLIERS['SG']!.shops[1]!.note);
  });
});

// Vietnam (docs/asia-plan.md, Phase C), from research_notes/Asia/region-VN-2026-10-17.md.
describe('Vietnam', () => {
  it('stays in English, fires by temperature, lists the US library, and prices in dong', () => {
    expect(regions.regionFor('VN')).to.include({
      temperature: 'C',
      cones: 'temperature',
      library: 'US',
      currency: 'VND'
    });
    expect(regions.regionFor('VN')!.languages).to.eql(['vi']);
    expect(regions.formatLocaleFor('en', 'VN', 'auto')).to.equal('en-VN-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('vi', 'VN', 'auto')).to.equal('vi-VN-u-ca-gregory-nu-latn');
  });

  it('gives 115, verified with its role on an official page, with 113, 114 and the merger into 113 in its note', () => {
    const shown = safety.shownFor('VN')!;
    expect(shown.emergency.map((line) => [line.number, line.status])).to.eql([['115', 'verified']]);
    const line = shown.emergency[0]!;
    // Điện Biên's provincial police give each number's role, and that the calls are free.
    expect(line.source).to.match(/^https:\/\/congan\.dienbien\.gov\.vn\//);
    expect(line.checked).to.equal('2026-10-19');
    expect(line.note).to.include('For the police, call 113; for a fire or a rescue, 114.');
    expect(line.note).to.include('the call is free');
    expect(line.note).to.include('merged into 113').and.include('2027–2028').and.include('all three still work');
    expect(shown.poison).to.eql([]);
    expect(safety.ministryFor('VN')).to.equal(null);
  });

  it("gives QCVN 02:2019/BYT's 0.1 for free silica in respirable dust, still from a legal database's copy, and FFP masks", () => {
    const facts = workplace.workplaceFor('VN')!;
    expect(facts.silica).to.include({ quartz: 0.1, kind: 'binding', status: 'secondary', checked: '2026-10-19' });
    expect(facts.silica!.law).to.include('QCVN 02:2019/BYT');
    expect(facts.agency).to.equal(null);
    // TCVN 13409:2021 is EN 149 word for word; its text was not read.
    expect(facts.respirators).to.include({ status: 'secondary', checked: '2026-10-19' });
    expect([facts.respirators!.everyday, facts.respirators!.higher]).to.eql([['FFP2'], ['FFP3']]);
    expect(facts.respirators!.note).to.contain('TCVN 13409:2021');
  });

  it("gives QCVN 12-4:2015/BYT's limits for ceramic ware, read in the Official Gazette, in force since 2016-05-01", () => {
    const rules = food.foodRulesFor('VN')!;
    expect(rules.own).to.equal(true);
    expect(rules.rules).to.include({ status: 'verified', inForce: '2016-05-01', checked: '2026-10-19' });
    expect(rules.rules.source).to.match(/^https:\/\/congbaocdn\.chinhphu\.vn\//);
    // The regulation's test methods are not mandatory: the note does not say "the test is".
    expect(rules.rules.note).to.contain('allows others of the same accuracy');
    expect(rules.rules.note).not.to.match(/The test is|legal database/);
    expect(rules.rules.limits.map((l) => [l.category, l.lead, l.cadmium, l.unit])).to.eql([
      ['vnFlat', 0.8, 0.07, 'mg/dm²'],
      ['vnSmall', 2, 0.5, 'mg/L'],
      ['vnMedium', 1, 0.25, 'mg/L'],
      ['vnStorage', 0.5, 0.25, 'mg/L'],
      ['vnCooking', 0.5, 0.05, 'mg/L'],
      ['vnCups', 0.5, 0.25, 'mg/L']
    ]);
  });

  it('lists no shop, since none was found', () => {
    expect(suppliers.shopsFor('VN')).to.eql({ shops: [], nearby: [] });
  });
});

// The Indian subcontinent and the Arab world, in English first (docs/south-asia-mena-plan.md), from
// scratch/round6/research/in-pk-bd.md and eg-ae-ma-dz.md, with the owner's and the lead's decisions of
// 2026-10-20.
describe('the subcontinent and the Arab world', () => {
  const NONE = { silica: null, agency: null, respirators: null, eu: false };

  it('fire by temperature but India, by Orton cones, in °C, with the US library and their own currencies', () => {
    const expected: Array<[string, string, string[], string, string]> = [
      ['IN', 'India', ['hi', 'en', 'ta', 'mr', 'kn', 'te', 'gu', 'ml', 'pa', 'or'], 'orton', 'INR'],
      ['PK', 'Pakistan', ['ur', 'en'], 'temperature', 'PKR'],
      ['BD', 'Bangladesh', ['bn'], 'temperature', 'BDT'],
      ['EG', 'Egypt', ['ar'], 'temperature', 'EGP'],
      ['AE', 'United Arab Emirates', ['ar', 'en'], 'temperature', 'AED'],
      ['MA', 'Morocco', ['ar', 'fr'], 'temperature', 'MAD'],
      ['DZ', 'Algeria', ['ar', 'fr'], 'temperature', 'DZD']
    ];
    for (const [code, name, languages, cones, currency] of expected) {
      expect(regions.regionFor(code), code).to.eql({
        code,
        name,
        languages,
        eu: false,
        temperature: 'C',
        cones,
        density: 'sg',
        library: 'US',
        currency
      });
      expect(regions.CURRENCIES, code).to.include(currency);
      expect(regions.formatLocaleFor('en', code, 'auto'), code).to.match(new RegExp('^en-' + code));
    }
  });

  it('leave the region each live language is written for as it was: Arabic, not live, is written for Egypt', () => {
    const first = (language: string) => regions.REGIONS.find((r) => r.languages[0] === language)?.code;
    expect(first('fr')).to.equal('FR');
    expect(first('en')).to.equal('US');
    expect(first('ar')).to.equal('EG');
    expect([first('hi'), first('ur'), first('bn')]).to.eql(['IN', 'PK', 'BD']);
  });

  it('show no unverified entry: every line, ministry and fact shown was read, and the leads are not shown', () => {
    for (const code of SOUTH_ASIA_MENA) {
      const shown = safety.shownFor(code)!;
      for (const line of [...shown.emergency, ...shown.poison, ...shown.advice, ...shown.animals]) {
        expect(line.status, code + ' ' + line.name).to.equal('verified');
        // India's state centres were read on 2026-10-21.
        expect(line.checked, code + ' ' + line.name).to.match(/^2026-10-(19|20|21)$/);
      }
      const ministry = safety.ministryFor(code);
      if (ministry) expect(ministry.status, code).to.equal('verified');
      const facts = workplace.workplaceFor(code)!;
      for (const fact of [facts.silica, facts.agency, facts.respirators, facts.noLimit].filter((f) => !!f)) {
        expect(['verified', 'secondary'], code).to.include(fact!.status);
      }
      // No silica limit is shown for any of them: none was read in a law (Egypt's only in a paper).
      expect(facts.silica, code).to.equal(null);
      expect(workplace.WORKPLACE[code]!.silica, code).to.equal(undefined);
      const rules = food.foodRulesFor(code);
      if (rules) expect(rules.rules.status, code).to.equal('verified');
    }
    // The UAE's federal ministry and Algeria's were read only in the Internet Archive: not linked.
    expect(safety.MINISTRIES['AE']!.status).to.equal('unverified');
    expect(safety.ministryFor('AE')).to.equal(null);
    expect(safety.ministryFor('DZ')).to.equal(null);
  });

  it('India: 112, and the National Poisons Information Centre, toll free around the clock, for the public', () => {
    const shown = safety.shownFor('IN')!;
    expect(shown.emergency.map((line) => [line.number, line.tel])).to.eql([['112', '112']]);
    expect(shown.emergency[0]!.note).to.include('police, fire and ambulance');
    expect(shown.poison).to.have.length(4);
    expect(shown.poison[0]).to.include({
      number: '1800 116 117',
      tel: '1800116117',
      who: 'public',
      hours: '24 hours, every day, toll free',
      also: '011 2658 9391',
      alsoTel: '+911126589391',
      source: 'https://aiims.edu/index.php/en/npic_intro'
    });
    expect(safety.ministryFor('IN')).to.include({ name: 'Ministry of Health and Family Welfare' });
  });

  it("India: the state centres after NPIC, CMC Vellore's for all India, JSS Mysuru's and Karamsad's with their areas", () => {
    const [, cmc, jss, karamsad] = safety.shownFor('IN')!.poison;
    expect(cmc).to.include({
      number: '1800 425 1213',
      tel: '18004251213',
      who: 'public',
      hours: '24 hours, every day, toll free',
      status: 'verified',
      checked: '2026-10-21'
    });
    expect(cmc!.name).to.include('Vellore');
    expect(cmc!.area).to.equal(undefined);
    expect(jss).to.include({ number: '1800 425 0207', tel: '18004250207', area: 'Karnataka', checked: '2026-10-21' });
    expect(jss!.hours).to.equal('Monday to Friday 9:00 to 17:00, Saturday 9:00 to 13:00, free');
    expect(karamsad).to.include({
      number: '1800 233 0232',
      tel: '18002330232',
      area: 'Charotar region, Gujarat',
      hours: '24 hours, every day, free',
      checked: '2026-10-21'
    });
    // The leads not shown: Hinduja (doctors only), R. G. Kar (an undated list), Chennai's 1054 (a 2011 trial).
    expect(JSON.stringify(safety.SAFETY['IN'])).not.to.match(/1800 345 0033|2446 4600|\b1054\b/);
    // The areas are translated, as the rest of a line's words.
    expect(safety.texts()).to.include.members(['Karnataka', 'Charotar region, Gujarat']);
  });

  it('India: no silica limit, since each state sets its own; DGOSH, and IS 9473 masks from a scan', () => {
    const facts = workplace.workplaceFor('IN')!;
    expect(facts.silica).to.equal(null);
    expect(facts.noLimit).to.include({ status: 'secondary', checked: '2026-10-19' });
    expect(facts.noLimit!.note).to.include('each state sets the limits').and.include('no national limit');
    expect(facts.noLimit!.law).to.include('section 88');
    expect(facts.agency).to.include({ name: 'Directorate General Occupational Safety and Health', abbr: 'DGOSH' });
    expect(facts.respirators).to.include({ status: 'secondary' });
    expect([facts.respirators!.everyday, facts.respirators!.higher]).to.eql([['FFP2'], ['FFP3']]);
    expect(facts.respirators!.note).to.include('IS 9473:2002');
    // The note is translated, as its English; a region with a limit never shows one.
    expect(workplace.texts()).to.include(facts.noLimit!.note);
    expect(workplace.workplaceFor('VN')).not.to.have.property('noLimit');
  });

  it("India: Andhra Pradesh's and Rajasthan's limits under the no-limit note, secondary, Rajasthan's respirable cell said to be cut off", () => {
    const states = workplace.workplaceFor('IN')!.noLimit!.states!;
    expect(states.map((state) => state.area)).to.eql(['Andhra Pradesh', 'Rajasthan']);
    const [ap, rajasthan] = states;
    expect(ap).to.include({ status: 'secondary', checked: '2026-10-21' });
    expect(ap!.law).to.include('rule 136').and.include('G.O.Rt.No.146').and.include('No. 432');
    expect(ap!.respirable).to.eql({ numerator: 10, factor: 1, offset: 2, places: 0 });
    expect(ap!.total).to.eql({ numerator: 30, factor: 1, offset: 3, places: 0 });
    expect(ap!.clipped).to.equal(undefined);
    expect(ap!.note).to.include('Lakshmikumaran & Sridharan');
    expect(rajasthan).to.include({ status: 'secondary', checked: '2026-10-21' });
    expect(rajasthan!.law).to.include('rule 111').and.include('S.O.23');
    // Only what can be read: no respirable formula, and the note says why.
    expect(rajasthan!.respirable).to.equal(undefined);
    expect(rajasthan!.clipped).to.eql(['respirable']);
    expect(rajasthan!.total).to.eql({ numerator: 30, factor: 1, offset: 3, places: 0 });
    expect(rajasthan!.note).to.include('cut off').and.include('sgcms.com');
    for (const state of states) expect(workplace.texts(), state.area).to.include(state.note);
    // The national note stays: there is no national limit.
    expect(workplace.workplaceFor('IN')!.silica).to.equal(null);
  });

  it('shows only the states whose limits may be shown, and none when no state may', () => {
    const states = workplace.WORKPLACE['IN']!.noLimit!.states!;
    const was = states.map((state) => state.status);
    try {
      states[1]!.status = 'unverified';
      expect(workplace.workplaceFor('IN')!.noLimit!.states!.map((state) => state.area)).to.eql(['Andhra Pradesh']);
      expect(workplace.texts()).not.to.include(states[1]!.note);
      states[0]!.status = 'extract';
      expect(workplace.workplaceFor('IN')!.noLimit).not.to.have.property('states');
      expect(workplace.workplaceFor('IN')!.noLimit!.note).to.include('each state sets the limits');
    } finally {
      states.forEach((state, i) => (state.status = was[i]!));
    }
  });

  it('India: no food-contact rules (IS 9806 is a voluntary standard), and two shops checked on their own sites', () => {
    expect(food.foodRulesFor('IN')).to.equal(null);
    expect(food.FOOD['IN']).to.equal(undefined);
    const { shops } = suppliers.shopsFor('IN')!;
    expect(shops.map((shop) => [shop.name, shop.place])).to.eql([
      ['Bhoomi Pottery', undefined],
      ['Clay Station', 'Bangalore']
    ]);
  });

  it("Pakistan: Rescue 1122, each province's own, and 15 for the police in Punjab only; no poison line", () => {
    const shown = safety.shownFor('PK')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['1122']);
    expect(shown.emergency[0]!.source).to.match(/^https:\/\/www\.rescue\.gov\.pk\//);
    expect(shown.emergency[0]!.note).to.include('Each province runs its own').and.include('In Punjab, call 15');
    expect([shown.poison, shown.advice]).to.eql([[], []]);
    expect(safety.ministryFor('PK')).to.include({ url: 'https://www.nhsrc.gov.pk/' });
    expect(workplace.workplaceFor('PK')).to.eql(NONE);
    expect(food.foodRulesFor('PK')).to.equal(null);
    expect(suppliers.shopsFor('PK')).to.eql({ shops: [], nearby: [] });
  });

  it("Bangladesh: 999, its roles said to be from the ITU's list; 16263 as medical advice, not a poison line", () => {
    const shown = safety.shownFor('BD')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['999']);
    expect(shown.emergency[0]!.note).to.include('ITU').and.include('102');
    expect(shown.poison).to.eql([]);
    expect(shown.advice.map((line) => [line.number, line.who])).to.eql([['16263', 'public']]);
    expect(shown.advice[0]!.note).to.include('It is not a poison line');
    expect(safety.ministryFor('BD')).to.include({ url: 'https://mohfw.gov.bd/' });
    expect(workplace.workplaceFor('BD')).to.include({ silica: null, respirators: null });
    expect(workplace.workplaceFor('BD')!.agency).to.include({ abbr: 'DIFE', url: 'https://dife.gov.bd/' });
    expect(food.foodRulesFor('BD')).to.equal(null);
    expect(suppliers.shopsFor('BD')).to.eql({ shops: [], nearby: [] });
  });

  it('Egypt: 123 for an ambulance, with 122 and 180, and not 112 or 911; no poison line, the ministry', () => {
    const shown = safety.shownFor('EG')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['123']);
    expect(shown.emergency[0]!.note).to.include('122').and.include('180');
    expect(JSON.stringify(safety.SAFETY['EG'])).not.to.match(/\b(112|911)\b/);
    expect(shown.poison).to.eql([]);
    expect(safety.ministryFor('EG')).to.include({ url: 'https://www.mohp.gov.eg/' });
    expect(workplace.workplaceFor('EG')).to.eql(NONE);
    expect(food.foodRulesFor('EG')).to.equal(null);
    expect(suppliers.shopsFor('EG')).to.eql({ shops: [], nearby: [] });
  });

  it("the UAE: 998, and not Abu Dhabi's poison line; no ministry read; two shops in Abu Dhabi", () => {
    const shown = safety.shownFor('AE')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['998']);
    expect(shown.emergency[0]!.note).to.include('999').and.include('997');
    expect(shown.poison).to.eql([]);
    expect(JSON.stringify(safety.SAFETY['AE'])).not.to.include('800');
    expect(workplace.workplaceFor('AE')).to.eql(NONE);
    expect(food.foodRulesFor('AE')).to.equal(null);
    const { shops } = suppliers.shopsFor('AE')!;
    expect(shops.map((shop) => [shop.name, shop.place])).to.eql([
      ['Art Central Pottery', 'Abu Dhabi'],
      ['Abu Dhabi Pottery', 'Abu Dhabi']
    ]);
    expect(shops[1]!.note).to.include('no raw glaze materials seen');
  });

  it("Morocco: 141, and the poison centre's two numbers, around the clock, at the price of a local call", () => {
    const shown = safety.shownFor('MA')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['141']);
    expect(shown.poison).to.have.length(1);
    const capm = shown.poison[0]!;
    // The 0801 number is linked as dialled in Morocco; the Rabat number in its international form.
    expect(capm).to.include({
      number: '0801 000 180',
      tel: '0801000180',
      also: '05 37 68 64 64',
      alsoTel: '+212537686464',
      who: 'public',
      hours: '24 hours, every day'
    });
    expect(capm.fee).to.include('local call');
    // capm.ma is no longer the centre's domain.
    expect(capm.source).to.match(/^https:\/\/www\.capm-sante\.ma\//);
    expect(JSON.stringify(safety.SAFETY['MA'])).not.to.match(/\/\/(www\.)?capm\.ma/);
    expect(workplace.workplaceFor('MA')).to.eql(NONE);
    expect(food.foodRulesFor('MA')).to.equal(null);
    expect(suppliers.shopsFor('MA')).to.eql({ shops: [], nearby: [] });
  });

  it("Algeria: 14 for civil protection, no poison line, and the 2019 order's limits with its rule for a piece up to 50% over", () => {
    const shown = safety.shownFor('DZ')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['14']);
    expect(shown.emergency[0]!.note).to.match(/^Civil protection/);
    expect(shown.poison).to.eql([]);
    expect(workplace.workplaceFor('DZ')).to.eql(NONE);
    const found = food.foodRulesFor('DZ')!;
    expect(found.own).to.equal(true);
    expect(found.rules).to.include({ status: 'verified', inForce: '2019-06-06', checked: '2026-10-20' });
    expect(found.rules.law).to.include('16 janvier 2019').and.include('JO n° 36');
    expect(found.rules.source).to.match(/^https:\/\/www\.joradp\.dz\//);
    expect(found.rules.limits.map((l) => [l.category, l.lead, l.cadmium, l.unit])).to.eql([
      ['flat', 0.8, 0.07, 'mg/dm²'],
      ['fillable', 4, 0.3, 'mg/L'],
      ['cooking', 1.5, 0.1, 'mg/L']
    ]);
    expect(found.rules.note).to.include('50%').and.include('at least three');
    expect(suppliers.shopsFor('DZ')).to.eql({ shops: [], nearby: [] });
  });
});

// Sri Lanka and Nepal (docs/south-asia-mena-plan.md, C3), in English first, from
// scratch/round8/india-data/report.md with the owner's decisions of 2026-10-21.
describe('Sri Lanka and Nepal', () => {
  it('fire by temperature, in °C, with the US library and their own currencies, in Asia', () => {
    for (const [code, name, languages, currency] of [
      ['LK', 'Sri Lanka', ['si', 'ta', 'en'], 'LKR'],
      ['NP', 'Nepal', ['ne', 'en'], 'NPR']
    ] as Array<[string, string, string[], string]>) {
      expect(regions.regionFor(code), code).to.eql({
        code,
        name,
        languages,
        eu: false,
        temperature: 'C',
        cones: 'temperature',
        density: 'sg',
        library: 'US',
        currency
      });
      expect(regions.CURRENCIES, code).to.include(currency);
      expect(groups.regionGroup(code), code).to.equal('asia');
    }
    // Sinhala, Tamil and Nepali are in the language list's South Asia group, ahead of their translations.
    for (const language of ['si', 'ta', 'ne']) expect(groups.languageGroup(language)).to.equal('south-asia');
  });

  it('leave the region each live language is written for as it was: Tamil for India, English for none', () => {
    const first = (language: string) => regions.REGIONS.find((r) => r.languages[0] === language)?.code;
    expect(first('en')).to.equal('US');
    expect(first('si')).to.equal('LK');
    expect(first('ne')).to.equal('NP');
  });

  it("Sri Lanka: 1990 Suwa Seriya, with 119 and 110 from the ITU's list of 2012; no poison line; the ministry and NIOSH", () => {
    const shown = safety.shownFor('LK')!;
    expect(shown.emergency.map((line) => [line.number, line.tel, line.status, line.checked])).to.eql([
      ['1990', '1990', 'verified', '2026-10-21']
    ]);
    expect(shown.emergency[0]!.source).to.equal('https://1990.lk/');
    expect(shown.emergency[0]!.note).to.include('119').and.include('110').and.include('last updated in 2012');
    expect([shown.poison, shown.advice, shown.animals]).to.eql([[], [], []]);
    // The poison centres known only from news, or with no hours, are not shown.
    expect(JSON.stringify(safety.SAFETY['LK'])).not.to.match(/2886143|2676193|2958337/);
    expect(safety.ministryFor('LK')).to.include({
      name: 'Ministry of Health and Mass Media',
      url: 'https://www.health.gov.lk/'
    });
    const facts = workplace.workplaceFor('LK')!;
    expect(facts).to.include({ silica: null, respirators: null, eu: false });
    expect(facts).not.to.have.property('noLimit');
    expect(facts.agency).to.include({ abbr: 'NIOSH', url: 'https://www.niosh.gov.lk/', status: 'verified' });
    expect(facts.agency!.silicaUrl).to.equal(undefined);
    expect(food.foodRulesFor('LK')).to.equal(null);
    expect(suppliers.shopsFor('LK')).to.eql({ shops: [], nearby: [] });
  });

  it("Nepal: 102, with 100 and 101, from the ITU's list of 2012; no poison line; the ministry and the labour department", () => {
    const shown = safety.shownFor('NP')!;
    expect(shown.emergency.map((line) => [line.number, line.tel, line.status, line.checked])).to.eql([
      ['102', '102', 'verified', '2026-10-21']
    ]);
    expect(shown.emergency[0]!.source).to.match(/^https:\/\/www\.itu\.int\/.*country=173/);
    expect(shown.emergency[0]!.note).to.include('100').and.include('101').and.include('last updated in 2012');
    expect([shown.poison, shown.advice, shown.animals]).to.eql([[], [], []]);
    expect(JSON.stringify(safety.SAFETY['NP'])).not.to.match(/4502011|1115/);
    expect(safety.ministryFor('NP')).to.include({ url: 'https://mohp.gov.np/' });
    const facts = workplace.workplaceFor('NP')!;
    expect(facts).to.include({ silica: null, respirators: null });
    expect(facts.agency).to.include({ url: 'https://dol.gov.np/', status: 'verified' });
    expect(facts.agency!.name).to.include('Department of Labour and Occupational Safety');
    expect(food.foodRulesFor('NP')).to.equal(null);
    expect(suppliers.shopsFor('NP')).to.eql({ shops: [], nearby: [] });
  });
});

// The Calendar setting (docs/asia-plan.md, Phase E item 1): Gregorian by default everywhere, the Thai
// Buddhist era or Japan's eras when chosen; numbers are written the same either way.
describe('calendars', () => {
  const day = new Date(2026, 9, 17);
  const shown = (locale: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(day);

  it('offer the Gregorian first, then the Thai Buddhist era and Japanese eras', () => {
    expect(regions.CALENDARS).to.eql(['gregory', 'buddhist', 'japanese']);
  });

  it('write dates in the Gregorian calendar by default, Thai too, and name it in every locale', () => {
    expect(regions.formatLocaleFor('en', 'US', 'auto')).to.equal('en-US-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('en', 'US', 'auto', 'gregory')).to.equal('en-US-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('ja', 'JP', 'auto', 'gregory')).to.equal('ja-JP-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('th', 'TH', 'auto', 'gregory')).to.equal('th-TH-u-ca-gregory-nu-latn');
    expect(shown(regions.formatLocaleFor('th', 'TH', 'auto'))).to.include('2026');
    // Not a calendar offered: the Gregorian.
    expect(regions.formatLocaleFor('en', 'US', 'auto', 'islamic')).to.equal('en-US-u-ca-gregory-nu-latn');
  });

  it('write the Thai Buddhist era when chosen, in any language', () => {
    const thai = regions.formatLocaleFor('th', 'TH', 'auto', 'buddhist');
    expect(thai).to.equal('th-TH-u-ca-buddhist-nu-latn');
    expect(shown(thai)).to.include('2569').and.not.include('2026');
    expect(shown(regions.formatLocaleFor('en', 'TH', 'auto', 'buddhist'))).to.include('2569');
    expect(regions.formatLocaleFor('en', null, 'th-TH', 'buddhist')).to.equal('th-TH-u-ca-buddhist-nu-latn');
  });

  it('write Japanese eras when chosen, in any language', () => {
    const japanese = regions.formatLocaleFor('ja', 'JP', 'auto', 'japanese');
    expect(japanese).to.equal('ja-JP-u-ca-japanese-nu-latn');
    expect(shown(japanese)).to.equal('令和8年10月17日');
    expect(shown(regions.formatLocaleFor('en', 'US', 'auto', 'japanese'))).to.include('Reiwa');
  });

  it('write numbers the same in every calendar', () => {
    for (const calendar of regions.CALENDARS) {
      expect(new Intl.NumberFormat(regions.formatLocaleFor('de', 'DE', 'auto', calendar)).format(12345.6)).to.equal(
        '12.345,6'
      );
    }
  });

  // The language and region pickers list by group (client/app/shared/picker.ts). A language or region added
  // without its line in lib/regions/groups.js would fall into "Other", which is for the pseudo-locales.
  it('should put every language and every region in a group of the pickers', () => {
    for (const language of languages.LANGUAGES.filter((l: { pseudo?: boolean }) => !l.pseudo)) {
      const group = groups.languageGroup(language.code);
      expect(group === '' || (groups.LANGUAGE_GROUPS.includes(group) && group !== 'other'), language.code).to.equal(
        true
      );
    }
    for (const region of regions.REGIONS) {
      const group = groups.regionGroup(region.code);
      expect(groups.REGION_GROUPS.includes(group) && group !== 'other', region.code).to.equal(true);
    }
    // English is the only language listed apart; the pseudo-locales are in "Other", which is last.
    expect(Object.entries(groups.LANGUAGE_GROUP_OF).filter(([, group]) => group === '')).to.deep.equal([['en', '']]);
    expect(groups.languageGroup('en-XA')).to.equal('other');
    expect(groups.LANGUAGE_GROUPS.at(-1)).to.equal('other');
    expect(groups.REGION_GROUPS.at(-1)).to.equal('other');
    // Every group named is one the pickers list, and each is named once.
    for (const group of Object.values(groups.LANGUAGE_GROUP_OF)) {
      expect(group === '' || groups.LANGUAGE_GROUPS.includes(group), group).to.equal(true);
    }
    for (const group of Object.values(groups.REGION_GROUP_OF)) expect(groups.REGION_GROUPS, group).to.include(group);
    expect(new Set(groups.LANGUAGE_GROUPS).size).to.equal(groups.LANGUAGE_GROUPS.length);
    expect(new Set(groups.REGION_GROUPS).size).to.equal(groups.REGION_GROUPS.length);
  });
});

// India's regional languages (wave I1: Tamil, Marathi, Kannada, live since round 8;
// scratch/round8/in-langs/plan.md).
describe("India's regional languages", () => {
  it('are offered, grouped with the subcontinent and written for India', () => {
    for (const code of ['ta', 'mr', 'kn']) {
      const language = languages.languageFor(code)!;
      expect(language, code).to.include({ code, dir: 'ltr', live: true });
      expect(groups.languageGroup(code), code).to.equal('south-asia');
      expect(languages.LIVE_LANGUAGES, code).to.include(code);
      expect(regions.regionFor('IN')!.languages, code).to.include(code);
    }
    // Hindi and English stay first: Hindi's pages are still written for India.
    expect(regions.regionFor('IN')!.languages.slice(0, 2)).to.eql(['hi', 'en']);
    expect(groups.languageGroup('or')).to.equal('south-asia');
    expect(languages.languageFor('ta')).to.include({ name: 'தமிழ்', english: 'Tamil' });
  });

  it('have a pseudo-locale each for the two scripts that need taller lines, on their own language’s rules', () => {
    expect(languages.languageFor('ta-XF')).to.include({ base: 'ta', pseudo: true, live: false });
    expect(languages.languageFor('kn-XG')).to.include({ base: 'kn', pseudo: true, live: false });
    expect(languages.textLanguage('kn-XG')).to.equal('kn');
    expect(groups.languageGroup('kn-XG')).to.equal('other');
  });

  it('show 0–9 by default and Marathi in Devanagari, each script’s own digits when chosen', () => {
    const number = (locale: string, digits?: string) =>
      new Intl.NumberFormat(regions.formatLocaleFor('en', '', locale, 'gregory', digits)).format(1234567.5);
    expect(number('ta-IN')).to.equal('12,34,567.5');
    expect(number('mr-IN')).to.equal('१२,३४,५६७.५');
    expect(number('mr-IN', 'western')).to.equal('12,34,567.5');
    expect(number('ta-IN', 'native')).to.equal('௧௨,௩௪,௫௬௭.௫');
    expect(number('kn-IN', 'native')).to.equal('೧,೨೩೪,೫೬೭.೫');
    // CLDR 48 groups Kannada in threes, unlike every other Indian locale; pinned so a change of data is seen.
    expect(number('kn-IN')).to.equal('1,234,567.5');
    expect(regions.numberingSystemFor('or-IN', 'native')).to.equal('orya');
    expect(regions.numberingSystemFor('si-LK', 'native')).to.equal('latn');
  });
});

// India's next waves (waves I2: Telugu, Gujarati, Malayalam, I3: Punjabi, Odia, and I4: Nepali, Sinhala, all
// live since round 9; scratch/round8/in-langs/plan.md).
describe('waves I2 to I4', () => {
  const NAMES: Record<string, [string, string]> = {
    te: ['తెలుగు', 'Telugu'],
    gu: ['ગુજરાતી', 'Gujarati'],
    ml: ['മലയാളം', 'Malayalam'],
    pa: ['ਪੰਜਾਬੀ', 'Punjabi'],
    or: ['ଓଡ଼ିଆ', 'Odia'],
    ne: ['नेपाली', 'Nepali'],
    si: ['සිංහල', 'Sinhala']
  };

  it('are known in their own names, grouped with the subcontinent, and all seven offered', () => {
    for (const [code, [name, english]] of Object.entries(NAMES)) {
      const language = languages.languageFor(code)!;
      expect(language, code).to.include({ code, english, dir: 'ltr', live: true });
      // Each name as the browser's own data gives it, in NFC (Odia's ଡ଼ is ଡ and a nukta).
      expect(language.name, code).to.equal(name.normalize('NFC'));
      expect(language.name, code).to.equal(new Intl.DisplayNames([code], { type: 'language' }).of(code));
      expect(groups.languageGroup(code), code).to.equal('south-asia');
      expect(languages.LIVE_LANGUAGES, code).to.include(code);
    }
  });

  it('give all seven the standard notice (owner, 2026-10-30)', () => {
    const plain = Object.keys(NAMES).filter((code) => languages.languageFor(code)!.plainNotice);
    expect(plain).to.eql([]);
  });

  it('are written for India, Nepal and Sri Lanka, with Hindi and English first in India', () => {
    expect(regions.regionFor('IN')!.languages).to.eql(['hi', 'en', 'ta', 'mr', 'kn', 'te', 'gu', 'ml', 'pa', 'or']);
    expect(regions.regionFor('NP')!.languages[0]).to.equal('ne');
    expect(regions.regionFor('LK')!.languages[0]).to.equal('si');
    for (const locale of ['te-IN', 'gu-IN', 'ml-IN', 'pa-IN', 'or-IN', 'ne-NP', 'si-LK']) {
      expect(regions.FORMAT_LOCALES, locale).to.include(locale);
    }
  });

  it('have the pseudo-Malayalam, on Malayalam’s rules, under a letter of its own', () => {
    expect(languages.languageFor('ml-XH')).to.include({ base: 'ml', pseudo: true, live: false });
    expect(languages.textLanguage('ml-XH')).to.equal('ml');
    expect(groups.languageGroup('ml-XH')).to.equal('other');
    const pseudo = languages.LANGUAGES.filter((language: { pseudo?: boolean }) => language.pseudo);
    const letters = pseudo.map((language: { code: string }) => language.code.slice(-1));
    expect(new Set(letters).size).to.equal(letters.length);
  });

  it('show 0–9 by default and Nepali in Devanagari, each script’s own digits when chosen, Sinhala 0–9 always', () => {
    const number = (locale: string, digits?: string) =>
      new Intl.NumberFormat(regions.formatLocaleFor('en', '', locale, 'gregory', digits)).format(1234567.5);
    for (const locale of ['te-IN', 'gu-IN', 'ml-IN', 'pa-IN', 'or-IN'])
      expect(number(locale), locale).to.equal('12,34,567.5');
    expect(number('ne-NP')).to.equal('१२,३४,५६७.५');
    expect(number('ne-NP', 'western')).to.equal('12,34,567.5');
    expect(number('gu-IN', 'native')).to.equal('૧૨,૩૪,૫૬૭.૫');
    expect(number('ml-IN', 'native')).to.equal('൧൨,൩൪,൫൬൭.൫');
    expect(number('pa-IN', 'native')).to.equal('੧੨,੩੪,੫੬੭.੫');
    expect(number('or-IN', 'native')).to.equal('୧୨,୩୪,୫୬୭.୫');
    // CLDR 48 groups Telugu's own digits in threes, though its 0–9 take the Indian groups; pinned so a change is seen.
    expect(number('te-IN', 'native')).to.equal('౧,౨౩౪,౫౬౭.౫');
    // Sinhala's own digits are historical: 0–9 under every choice, grouped in threes as CLDR has it.
    for (const digits of ['auto', 'western', 'native']) expect(number('si-LK', digits), digits).to.equal('1,234,567.5');
  });
});

// Latin America and Africa (round 10, wave L0: scratch/round10/c-africa-latam/plan.md), regions first, no
// language offered yet.
describe('Latin America and Africa', () => {
  const NEW_LANGUAGES = ['pt-BR', 'es-419', 'sw', 'am', 'af', 'ha', 'yo', 'zu', 'ig', 'so', 'qu'];

  it('fire by Orton cones in °C in Mexico, Brazil and South Africa, by temperature elsewhere, with the US library', () => {
    for (const [code, name, languages, cones, currency, group] of [
      // Wave L1: Mexico, Argentina and Chile read Latin American Spanish; Brazil waits for pt-BR.
      ['MX', 'Mexico', ['es-419'], 'orton', 'MXN', 'americas'],
      ['BR', 'Brazil', ['pt'], 'orton', 'BRL', 'americas'],
      ['AR', 'Argentina', ['es-419'], 'temperature', 'ARS', 'americas'],
      ['CL', 'Chile', ['es-419'], 'temperature', 'CLP', 'americas'],
      ['ZA', 'South Africa', ['en', 'af', 'zu'], 'orton', 'ZAR', 'africa'],
      ['KE', 'Kenya', ['en', 'sw'], 'temperature', 'KES', 'africa'],
      ['GH', 'Ghana', ['en'], 'temperature', 'GHS', 'africa']
    ] as Array<[string, string, string[], string, string, string]>) {
      expect(regions.regionFor(code), code).to.eql({
        code,
        name,
        languages,
        eu: false,
        temperature: 'C',
        cones,
        density: 'sg',
        library: 'US',
        currency
      });
      expect(groups.regionGroup(code), code).to.equal(group);
    }
    // Puerto Rico takes the United States' data; the regions with no confirmed emergency number wait.
    for (const code of ['PR', 'CO', 'PE', 'NG', 'ET']) expect(regions.regionFor(code), code).to.equal(undefined);
  });

  it("writes Chile's peso without decimals, and leaves Spanish and Portuguese pages written for Spain and Portugal", () => {
    const peso = new Intl.NumberFormat(regions.formatLocaleFor('es', 'CL', 'auto'), {
      style: 'currency',
      currency: 'CLP'
    });
    expect(peso.resolvedOptions().maximumFractionDigits).to.equal(0);
    expect(peso.format(1234.5)).to.equal('$1.235');
    const first = (language: string) => regions.REGIONS.find((r) => r.languages[0] === language)?.code;
    expect([first('es'), first('pt'), first('en')]).to.eql(['ES', 'PT', 'US']);
  });

  it('writes Brazilian Portuguese and Latin American Spanish in their own formats where no region is chosen', () => {
    expect(regions.formatLocaleFor('pt-BR', '', 'auto')).to.equal('pt-BR-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('es-419', '', 'auto')).to.equal('es-419-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('pt-BR', 'MX', 'auto')).to.equal('pt-MX-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('es-419', 'AR', 'auto')).to.equal('es-AR-u-ca-gregory-nu-latn');
    // As before: Portugal's, Spain's, and a pseudo-locale's base.
    expect(regions.formatLocaleFor('pt-PT', '', 'auto')).to.equal('pt-PT-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('es', '', 'auto')).to.equal('es-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('en-XA', '', 'auto')).to.equal('en-u-ca-gregory-nu-latn');
  });

  it('knows eleven languages, grouped, Latin American Spanish offered since wave L1, six of Africa and Quechua with the plain notice', () => {
    for (const code of NEW_LANGUAGES) {
      const language = languages.languageFor(code)!;
      const live = code === 'es-419';
      expect(language, code).to.include({ code, dir: 'ltr', live });
      if (live) expect(languages.LIVE_LANGUAGES, code).to.include(code);
      else expect(languages.LIVE_LANGUAGES, code).not.to.include(code);
      expect(groups.languageGroup(code), code).to.equal(
        ['pt-BR', 'es-419', 'qu'].includes(code) ? 'latin-america' : 'africa'
      );
      expect(language.name, code).to.equal(language.name.normalize('NFC'));
    }
    const plain = NEW_LANGUAGES.filter((code) => languages.languageFor(code)!.plainNotice);
    expect(plain).to.eql(['am', 'ha', 'yo', 'zu', 'ig', 'so', 'qu']);
    // Brazil's plural rules, not Portugal's: 0 is singular.
    expect(new Intl.PluralRules(languages.textLanguage('pt-BR')).select(0)).to.equal('one');
    expect(new Intl.PluralRules(languages.textLanguage('pt-PT')).select(0)).to.equal('other');
    // Spain's Spanish and Portugal's Portuguese stay in Europe's group.
    expect([groups.languageGroup('es'), groups.languageGroup('pt-PT')]).to.eql(['europe', 'europe']);
  });

  it('gives each emergency number read on an official page, and only the poison lines confirmed', () => {
    const numbers = (code: string) => {
      const shown = safety.shownFor(code)!;
      return [shown.emergency.map((l) => l.number), shown.poison.map((l) => l.number)];
    };
    expect(numbers('MX')).to.eql([['911'], []]);
    expect(numbers('BR')).to.eql([['192'], ['0800 722 6001']]);
    expect(numbers('AR')).to.eql([['911'], ['0800 333 0160']]);
    expect(numbers('CL')).to.eql([['131'], []]);
    expect(numbers('ZA')).to.eql([['10177'], ['0861 555 777']]);
    expect(numbers('KE')).to.eql([['922'], []]);
    expect(numbers('GH')).to.eql([['112'], []]);
    // The poison line's own hours, not the "24 hours" of secondary sources.
    expect(safety.shownFor('ZA')!.poison[0]!.hours).to.not.match(/24/);
    // Not confirmed on an official page, so never in the data.
    const text = JSON.stringify(LATAM_AFRICA_L0.map((code) => safety.SAFETY[code]));
    for (const unconfirmed of ['800 009 2800', '0800 444 8694', '2635 3800', '0800 720021', '244 733'])
      expect(text).not.to.contain(unconfirmed);
    for (const code of LATAM_AFRICA_L0) {
      expect(safety.ministryFor(code), code).to.include({ status: 'verified' });
      expect(food.foodRulesFor(code), code).to.equal(null);
      expect(workplace.workplaceFor(code), code).to.include({ silica: null, respirators: null });
    }
  });
});

// The Digits setting (docs/i18n-plan.md, Digits): each country's usual digits, as CLDR has them, named in the
// format locale so that no browser's own CLDR decides them; 0–9, or the language's own, when chosen.
describe('digits', () => {
  const sample = (locale: string) => new Intl.NumberFormat(locale).format(1234.5);
  const system = (locale: string) => new Intl.NumberFormat(locale).resolvedOptions().numberingSystem;

  it('offer the usual digits first, then 0–9 and the language’s own', () => {
    expect(regions.DIGIT_CHOICES).to.eql(['auto', 'western', 'native']);
  });

  it('follow each country, and give 0–9 or the language’s own digits when chosen', () => {
    // The format chosen, then its digits as usual, as 0–9 and as the language's own.
    const pairs: [string, string, string, string][] = [
      ['ar-EG', 'arab', 'latn', 'arab'],
      ['ar-IQ', 'arab', 'latn', 'arab'],
      ['ar-JO', 'arab', 'latn', 'arab'],
      ['ar-AE', 'latn', 'latn', 'arab'],
      ['ar-MA', 'latn', 'latn', 'arab'],
      ['ar-DZ', 'latn', 'latn', 'arab'],
      ['ar-TN', 'latn', 'latn', 'arab'],
      ['bn-BD', 'beng', 'latn', 'beng'],
      ['mr-IN', 'deva', 'latn', 'deva'],
      ['ne-NP', 'deva', 'latn', 'deva'],
      ['hi-IN', 'latn', 'latn', 'deva'],
      ['en-IN', 'latn', 'latn', 'latn'],
      ['ur-PK', 'latn', 'latn', 'arabext'],
      ['ur-IN', 'arabext', 'latn', 'arabext'],
      ['en-PK', 'latn', 'latn', 'latn'],
      ['fr-MA', 'latn', 'latn', 'latn'],
      ['fr-DZ', 'latn', 'latn', 'latn'],
      ['si-LK', 'latn', 'latn', 'latn'],
      ['ta-LK', 'latn', 'latn', 'tamldec'],
      // India's regional languages: 0–9 as CLDR has them, Devanagari for Marathi (above), and each script's own
      // under "native".
      ['ta-IN', 'latn', 'latn', 'tamldec'],
      ['kn-IN', 'latn', 'latn', 'knda'],
      ['te-IN', 'latn', 'latn', 'telu'],
      ['ml-IN', 'latn', 'latn', 'mlym'],
      ['gu-IN', 'latn', 'latn', 'gujr'],
      ['pa-IN', 'latn', 'latn', 'guru'],
      // Punjabi in Pakistan is written in Shahmukhi: Extended Arabic-Indic digits, and its own under "native".
      ['pa-PK', 'arabext', 'latn', 'arabext'],
      ['or-IN', 'latn', 'latn', 'orya'],
      ['th-TH', 'latn', 'latn', 'thai'],
      ['ja-JP', 'latn', 'latn', 'latn'],
      ['de-DE', 'latn', 'latn', 'latn']
    ];
    for (const [format, ...systems] of pairs) {
      regions.DIGIT_CHOICES.forEach((digits, i) => {
        const locale = regions.formatLocaleFor('en', '', format, 'gregory', digits);
        expect(locale, format + ' ' + digits).to.equal(`${format}-u-ca-gregory-nu-${systems[i]}`);
        expect(system(locale), locale).to.equal(systems[i]);
        expect(regions.numberingSystemFor(format, digits), locale).to.equal(systems[i]);
      });
    }
    // As shown: Arabic-Indic in Egypt, 0–9 in Morocco, Indian groups in Bengali digits.
    expect(sample(regions.formatLocaleFor('en', '', 'ar-EG'))).to.equal('١٬٢٣٤٫٥');
    expect(sample(regions.formatLocaleFor('en', '', 'ar-EG', null, 'western'))).to.equal('1,234.5');
    expect(sample(regions.formatLocaleFor('en', '', 'ar-MA'))).to.equal('1.234,5');
    expect(sample(regions.formatLocaleFor('en', '', 'ar-MA', null, 'native'))).to.equal('١٬٢٣٤٫٥');
    expect(new Intl.NumberFormat(regions.formatLocaleFor('en', '', 'bn-BD')).format(1234567.5)).to.equal('১২,৩৪,৫৬৭.৫');
    expect(new Intl.NumberFormat(regions.formatLocaleFor('en', '', 'hi-IN')).format(1234567.5)).to.equal('12,34,567.5');
    // Not a choice offered: as usual. A calendar chosen keeps the digits.
    expect(regions.formatLocaleFor('en', '', 'ar-EG', 'gregory', 'roman')).to.equal('ar-EG-u-ca-gregory-nu-arab');
    expect(regions.formatLocaleFor('th', 'TH', 'auto', 'buddhist', 'native')).to.equal('th-TH-u-ca-buddhist-nu-thai');
    // A locale that names its own digits keeps them, unless others are chosen.
    expect(regions.formatLocaleFor('en', '', 'ar-EG-u-nu-latn')).to.equal('ar-EG-u-ca-gregory-nu-latn');
    expect(regions.formatLocaleFor('en', '', 'ar-EG-u-nu-latn', null, 'native')).to.equal('ar-EG-u-ca-gregory-nu-arab');
  });

  it('pin what CLDR gives every language Glazecalc offers or plans, in every country', () => {
    const planned = ['ar', 'hi', 'ur', 'bn', 'ta', 'te', 'mr', 'gu', 'pa', 'or', 'ne', 'si', 'kn', 'ml'];
    const offered = languages.LANGUAGES.map((language) => languages.baseLanguage(language.code));
    const names = new Intl.DisplayNames(['en'], { type: 'region' });
    const countries = [];
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        if (names.of(code) !== code) countries.push(code);
      }
    }
    expect(countries.length).to.be.above(240);
    for (const language of new Set([...planned, ...offered])) {
      for (const locale of [language, ...countries.map((code) => language + '-' + code)]) {
        expect(regions.numberingSystemFor(locale), locale).to.equal(system(locale));
      }
    }
  });

  it('change nothing for the languages and formats offered: the same numbers, percents and dates', () => {
    const day = new Date(2026, 9, 17);
    const numbersIn = (locale: string) =>
      new Intl.NumberFormat(locale, { useGrouping: 'min2' } as Intl.NumberFormatOptions).format(-1234567.5) +
      ' ' +
      new Intl.NumberFormat(locale, { style: 'percent' }).format(0.05);
    const dateIn = (locale: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(day);
    // As formatLocaleFor wrote them before it named the digits: a calendar named only where it was not the
    // Gregorian, and for Thai.
    const before = (locale: string, calendar: string) => {
      const tag = new Intl.Locale(locale);
      return calendar !== 'gregory' || tag.language === 'th' ? tag.baseName + '-u-ca-' + calendar : tag.baseName;
    };
    // Each live language in each region and in none, and each format chosen (which stands for the language).
    const asked = [
      ...languages.LIVE_LANGUAGES.flatMap((language) =>
        ['', ...regions.REGION_CODES].map((region) => [language, region, 'auto'])
      ),
      ...regions.FORMAT_LOCALES.map((format) => ['en', '', format])
    ];
    expect(asked.length).to.be.above(1400);
    for (const [language, region, format] of asked) {
      for (const calendar of regions.CALENDARS) {
        const locale = regions.formatLocaleFor(language!, region, format, calendar);
        // Named, so the browser's own data never decides the calendar or the digits.
        const tag = new Intl.Locale(locale);
        expect([tag.calendar, tag.numberingSystem], locale).to.eql([calendar, regions.numberingSystemFor(locale)]);
        if (calendar === 'gregory') expect(numbersIn(locale), locale).to.equal(numbersIn(before(locale, calendar)));
        expect(dateIn(locale), locale).to.equal(dateIn(before(locale, calendar)));
      }
    }
  }).timeout(30000);

  it('read back every number it writes, in every format and digits', () => {
    for (const format of regions.FORMAT_LOCALES) {
      for (const digits of regions.DIGIT_CHOICES) {
        const locale = regions.formatLocaleFor('en', '', format, 'gregory', digits);
        for (const value of [-3, 0.125, 12.5, 1234.5, 100000, 1234567.5]) {
          const shown = new Intl.NumberFormat(locale, {
            maximumFractionDigits: 3,
            useGrouping: 'min2'
          } as Intl.NumberFormatOptions).format(value);
          expect(numbers.parseNumber(shown, 'either', locale), locale + ' ' + shown).to.equal(value);
        }
        // A percentage reads as its number: 5 %, %5 and ٥٪ are 5.
        const percent = new Intl.NumberFormat(locale, { style: 'percent' }).format(0.05);
        expect(numbers.parseNumber(percent, 'either', locale), locale + ' ' + percent).to.equal(5);
      }
    }
  });
});
