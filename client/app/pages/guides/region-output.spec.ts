import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NOW } from '../../core/clock';
import { PreferencesService } from '../../core/preferences.service';
import { testProviders } from '../../testing/test-providers';
import { FoodLimits } from './food-limits';
import { PoisonLines } from './poison-lines';
import { ShopList } from './shop-list';
import { SilicaLimit } from './silica-limit';

// Adding a region, or a field a new region needs, must not change what any
// region already shown says. These are the four region blocks' HTML for every
// region there was before Turkey (Japan added once Japan was done), kept in
// __snapshots__: a change to any of them fails here and is either a mistake or
// a deliberate update (vitest -u).
const BEFORE_TURKEY = [
  'US', 'GB', 'AU', 'NZ', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'JP'
]; // prettier-ignore

const BLOCKS: Array<[string, Type<unknown>]> = [
  ['poison', PoisonLines],
  ['silica', SilicaLimit],
  ['food', FoodLimits],
  ['shops', ShopList]
];

/** A block's HTML for a region, without Angular's generated attributes or the region picker. */
const html = async (component: Type<unknown>, region: string): Promise<string> => {
  TestBed.inject(PreferencesService).remember('region', region);
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  // The list of regions to choose from grows with each region, by design.
  return element.innerHTML
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/ _ng(content|host)-[\w-]+(="")?/g, '')
    .replace(/ (id|for|aria-labelledby|aria-describedby)="[^"]*"/g, '')
    .replace(/<gc-region-select>[\s\S]*?<\/gc-region-select>/g, '');
};

// The region chosen here is kept in this browser's storage: none is left for the next file's tests.
afterEach(() => localStorage.clear());

describe('region blocks before Turkey', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });

  for (const [name, component] of BLOCKS) {
    it(`says exactly what it said before for every earlier region: ${name}`, async () => {
      const all: Record<string, string> = {};
      for (const region of BEFORE_TURKEY) all[region] = await html(component, region);
      expect(all).toMatchSnapshot();
      // Thirty-two regions, each with the list of every region to choose from: slow on a busy machine.
    }, 30_000);
  }
});

// Türkiye, frozen the same way before Korea, Taiwan, Singapore and Malaysia were added.
describe('region blocks before Korea', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });

  for (const [name, component] of BLOCKS) {
    it(`says exactly what it said before for Türkiye: ${name}`, async () => {
      expect(await html(component, 'TR')).toMatchSnapshot();
    });
  }
});

// Korea, Taiwan, Singapore and Malaysia, frozen before China, Hong Kong, Indonesia and Thailand. The
// day is fixed, since Taiwan's limit says the day it applies from only until that day.
describe('region blocks before China', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [...testProviders(), { provide: NOW, useValue: () => new Date('2026-10-16T12:00:00Z') }]
    });
  });

  for (const [name, component] of BLOCKS) {
    it(`says exactly what it said before for Korea, Taiwan, Singapore and Malaysia: ${name}`, async () => {
      const all: Record<string, string> = {};
      for (const region of ['KR', 'TW', 'SG', 'MY']) all[region] = await html(component, region);
      expect(all).toMatchSnapshot();
    }, 15_000);
  }
});

// China, Hong Kong, Indonesia, Thailand and the Philippines, frozen before Vietnam, on the same fixed day.
// Updated on purpose once, with the earlier regions' above, by the verification pass of 2026-10-19
// (docs/asia-plan.md): Japan's #8000 and food notes, Türkiye's UZEM, Taiwan's limit until 2027, China's
// poison line, masks and food rules, Hong Kong's food rules (none) and shop, Indonesia's in-force date,
// Thailand's and the Philippines' shops and the Philippines' silica limit.
describe('region blocks before Vietnam', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [...testProviders(), { provide: NOW, useValue: () => new Date('2026-10-16T12:00:00Z') }]
    });
  });

  for (const [name, component] of BLOCKS) {
    it(`says exactly what it said before for China, Hong Kong, Indonesia, Thailand and the Philippines: ${name}`, async () => {
      const all: Record<string, string> = {};
      for (const region of ['CN', 'HK', 'ID', 'TH', 'PH']) all[region] = await html(component, region);
      expect(all).toMatchSnapshot();
    }, 15_000);
  }
});

// Vietnam, frozen after the verification pass of 2026-10-19, on the same fixed day.
describe('region blocks after the verification pass of 2026-10-19', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [...testProviders(), { provide: NOW, useValue: () => new Date('2026-10-16T12:00:00Z') }]
    });
  });

  for (const [name, component] of BLOCKS) {
    it(`says exactly what it said for Vietnam: ${name}`, async () => {
      expect(await html(component, 'VN')).toMatchSnapshot();
    });
  }
});

// The Indian subcontinent's and the Arab world's first regions, frozen as added (docs/south-asia-mena-plan.md),
// on the same fixed day.
describe('region blocks for the subcontinent and the Arab world, as added', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [...testProviders(), { provide: NOW, useValue: () => new Date('2026-10-16T12:00:00Z') }]
    });
  });

  for (const [name, component] of BLOCKS) {
    it(`says exactly what it said for India, Pakistan, Bangladesh, Egypt, the UAE, Morocco and Algeria: ${name}`, async () => {
      const all: Record<string, string> = {};
      for (const region of ['IN', 'PK', 'BD', 'EG', 'AE', 'MA', 'DZ']) all[region] = await html(component, region);
      expect(all).toMatchSnapshot();
    }, 15_000);
  }
});
