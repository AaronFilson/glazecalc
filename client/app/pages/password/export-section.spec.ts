import { TestBed } from '@angular/core/testing';
import { testProviders } from '../../testing/test-providers';
import { ExportSection } from './export-section';

describe('ExportSection', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  it('links to the three files, each a download', async () => {
    const fixture = TestBed.createComponent(ExportSection);
    await fixture.whenStable();
    const links = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/api/export',
      '/api/export/recipes.csv',
      '/api/export/materials.csv'
    ]);
    expect(links.every((link) => link.hasAttribute('download'))).toBe(true);
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Download my data');
  });
});
