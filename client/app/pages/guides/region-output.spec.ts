import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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
    });
  }
});
