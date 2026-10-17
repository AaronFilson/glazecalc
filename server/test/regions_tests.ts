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
    // Other languages are as they were, and an explicit calendar is kept.
    expect(regions.formatLocaleFor('id', '', 'auto')).to.equal('id');
    expect(regions.formatLocaleFor('vi', 'DE', 'auto')).to.equal('vi-DE');
    expect(regions.formatLocaleFor('en', 'DE', 'auto')).to.equal('en-DE');
    expect(regions.formatLocaleFor('th', '', 'th-TH-u-ca-buddhist')).to.equal('th-TH-u-ca-buddhist');
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
  const HTTP_ONLY = ['丸二陶料', '太麟化工原料有限公司', 'Sam Mui Kuang Pottery'];
  const NO_SHOP_FOUND = ['MY', 'CN', 'HK', 'ID', 'TH', 'PH'];
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
    const units = ['mg/dm²', 'mg/L', 'µg/dm²', 'µg/L', 'µg/mL', 'µg/cm²', 'mg', 'ppm'];
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
      library: 'EU'
    });
    expect(regions.formatLocaleFor('en', 'TR', 'auto')).to.equal('en-TR');
  });

  it('gives 112 for every emergency service and UZEM on 114, around the clock, with no claim on cost', () => {
    const shown = safety.shownFor('TR')!;
    expect(shown.emergency).to.have.length(1);
    expect(shown.emergency[0]).to.include({ number: '112', tel: '112', source: 'https://www.112.gov.tr/hakkimizda' });
    expect(shown.emergency[0]!.note).to.equal('One number for ambulance, fire, police, gendarmerie and coast guard.');
    expect(shown.poison).to.have.length(1);
    const uzem = shown.poison[0]!;
    expect(uzem).to.include({ number: '114', tel: '114', who: 'public', hours: '24 hours, every day' });
    expect(uzem.name).to.contain('UZEM');
    // Neither the cost nor a limit on who may call was read on an official page.
    expect(uzem.fee).to.equal(undefined);
    expect(uzem.note).to.equal(undefined);
    expect(JSON.stringify(safety.SAFETY['TR'])).not.to.match(/free|ücretsiz/i);
    expect(shown.animals).to.eql([]);
    expect(shown.advice).to.eql([]);
    expect(safety.ministryFor('TR')).to.include({ name: 'Sağlık Bakanlığı', url: 'https://www.saglik.gov.tr/' });
  });

  it("gives the binding limit as the law's formula, 10 / (Q + 2), with half for cristobalite", () => {
    const facts = workplace.workplaceFor('TR')!;
    const silica = facts.silica!;
    expect(silica).to.include({ kind: 'binding', status: 'verified', checked: '2026-10-14' });
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
    // The FFP classes were read only in a secondary source.
    expect(facts.respirators).to.include({ status: 'secondary' });
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

// The same, with Türkiye, before Korea, Taiwan, Singapore and Malaysia (docs/asia-plan.md, Phase C).
describe('regions before Korea', () => {
  it('keep their data exactly', () => {
    const codes = [
      'US', 'GB', 'AU', 'NZ', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
      'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'JP', 'TR'
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
    expect(hash).to.equal('019ecd75b9d1fbae7cd4090b7a2cd8f3bbacae6a5dff5b4c748b266557919f91');
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
      regions.regionFor(code),
      safety.SAFETY[code],
      safety.MINISTRIES[code] ?? null,
      workplace.WORKPLACE[code] ?? null,
      food.FOOD[code] ?? null,
      suppliers.SUPPLIERS[code] ?? null
    ]);
    data.push(['EU', food.FOOD['EU'], workplace.EU_SILICA]);
    const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    // Changed once on purpose: Taiwan's 119 note now says when to dial 112 (2026-10-16).
    expect(hash).to.equal('78a40b67ef1ab8b683926873f242f85e67202d6bc66d38ac77f9340f21c0c980');
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
      library: 'US'
    });
    expect(regions.formatLocaleFor('en', 'KR', 'auto')).to.equal('en-KR');
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
    expect(regions.formatLocaleFor('en', 'TW', 'auto')).to.equal('en-TW');
  });

  it("gives 119 and the Taipei Veterans General Hospital's poison centre, around the clock and free", () => {
    const shown = safety.shownFor('TW')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['119']);
    expect(shown.poison.map((line) => [line.number, line.tel])).to.eql([['02-2871-7121', '+886228717121']]);
    expect(shown.poison[0]).to.include({ who: 'public', hours: '24 hours, every day, free' });
    expect(shown.poison[0]!.also).to.equal(undefined);
    expect(safety.ministryFor('TW')).to.include({ name: '衛生福利部' });
  });

  it('gives the 2027 limit with its start date, and not the earlier formula read only secondhand', () => {
    const silica = workplace.workplaceFor('TW')!.silica!;
    expect(silica).to.include({ quartz: 0.1, kind: 'binding', status: 'verified', from: '2027-01-01' });
    expect(silica.formula).to.equal(undefined);
    expect(silica.cristobalite).to.equal(undefined);
    expect(silica.note).to.contain('Until 31 December 2026');
    expect(silica.note).to.contain('not shown here');
    expect(JSON.stringify(silica)).not.to.match(/SiO2 \+ 2|\(Q \+ 2\)/);
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
    expect(regions.formatLocaleFor('en', 'SG', 'auto')).to.equal('en-SG');
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
    expect(regions.formatLocaleFor('en', 'MY', 'auto')).to.equal('en-MY');
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
    expect(regions.formatLocaleFor('zh-Hans', 'CN', 'auto')).to.equal('zh-Hans-CN');
  });

  it('gives 120, and neither the poison line whose hours and callers no page states nor an unread ministry', () => {
    const shown = safety.shownFor('CN')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['120']);
    expect(shown.poison).to.eql([]);
    expect(JSON.stringify(safety.SAFETY['CN'])).not.to.contain('8313');
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
    expect(facts.respirators).to.equal(null);
  });

  it('gives no food-contact rules and no shop, since neither could be confirmed', () => {
    expect(food.foodRulesFor('CN')).to.equal(null);
    expect(suppliers.shopsFor('CN')).to.eql({ shops: [], nearby: [] });
  });
});

describe('Hong Kong', () => {
  it("reads Traditional Chinese and English, formats as Hong Kong's, and comes after Taiwan", () => {
    expect(regions.regionFor('HK')).to.include({ temperature: 'C', cones: 'temperature', library: 'US' });
    expect(regions.regionFor('HK')!.languages).to.eql(['zh-Hant', 'en']);
    expect(regions.formatLocaleFor('zh-Hant', 'HK', 'auto')).to.equal('zh-Hant-HK');
    expect(regions.formatLocaleFor('en', 'HK', 'auto')).to.equal('en-HK');
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

  it('gives no food-contact rules, since none of its own were found', () => {
    expect(food.foodRulesFor('HK')).to.equal(null);
  });
});

describe('Indonesia', () => {
  it('fires by temperature and lists the US library', () => {
    expect(regions.regionFor('ID')).to.include({ temperature: 'C', cones: 'temperature', library: 'US' });
    expect(regions.regionFor('ID')!.languages).to.eql(['id']);
    expect(regions.formatLocaleFor('id', 'ID', 'auto')).to.equal('id-ID');
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

  it("gives BPOM 11/2026's limits, the same for both hollow sizes, with no in-force date not read", () => {
    const { rules } = food.foodRulesFor('ID')!;
    expect(rules.limits.map((l) => [l.category, l.lead, l.cadmium, l.unit])).to.eql([
      ['idFlat', 0.8, 0.07, 'mg/dm²'],
      ['idSmall', 0.5, 0.25, 'mg/L'],
      ['idLarge', 0.5, 0.25, 'mg/L']
    ]);
    expect(rules.inForce).to.equal(undefined);
    expect(rules.note).to.contain('third');
  });
});

describe('Thailand', () => {
  it('fires by temperature and lists the US library', () => {
    expect(regions.regionFor('TH')).to.include({ temperature: 'C', cones: 'temperature', library: 'US' });
    expect(regions.regionFor('TH')!.languages).to.eql(['th']);
    expect(regions.formatLocaleFor('th', 'TH', 'auto')).to.equal('th-TH-u-ca-gregory');
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
});

describe('Philippines', () => {
  it('stays in English, fires by temperature, and lists the US library', () => {
    expect(regions.regionFor('PH')).to.include({ temperature: 'C', cones: 'temperature', library: 'US' });
    expect(regions.regionFor('PH')!.languages).to.eql(['fil', 'en']);
    expect(regions.formatLocaleFor('en', 'PH', 'auto')).to.equal('en-PH');
  });

  it('gives 911 and the National Poison Management and Control Center, 24 hours and free', () => {
    const shown = safety.shownFor('PH')!;
    expect(shown.emergency.map((line) => line.number)).to.eql(['911']);
    expect(shown.poison.map((line) => [line.number, line.tel])).to.eql([['(02) 8524 1078', '+63285241078']]);
    expect(shown.poison[0]).to.include({ who: 'public', hours: '24 hours, every day, free' });
  });

  it('gives no silica limit, food-contact rules or shop, since none could be read', () => {
    expect(workplace.workplaceFor('PH')).to.eql({ silica: null, agency: null, respirators: null, eu: false });
    expect(food.foodRulesFor('PH')).to.equal(null);
    expect(suppliers.shopsFor('PH')).to.eql({ shops: [], nearby: [] });
  });
});
