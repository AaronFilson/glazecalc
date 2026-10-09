import regions from '../../lib/regions/index.js';
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
