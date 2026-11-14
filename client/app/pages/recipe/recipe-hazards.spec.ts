import { TestBed } from '@angular/core/testing';
import { testProviders, text } from '../../testing/test-providers';
import { RecipeHazards, hazardSources } from './recipe-hazards';

describe('RecipeHazards', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  it('heads the hazards at the level the page asks for, the shared page’s second, by the id it gives', async () => {
    const fixture = TestBed.createComponent(RecipeHazards);
    fixture.componentRef.setInput('sources', [
      { name: 'Silica', ownedBy: 'Standard', hazards: 'Contains crystalline silica; do not breathe the dust.' }
    ]);
    fixture.componentRef.setInput('level', 2);
    fixture.componentRef.setInput('headingId', 'shared-hazards');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h3')).toBeNull();
    expect(root.querySelector('h2')?.id).toBe('shared-hazards');
    expect(root.querySelector('section')?.getAttribute('aria-labelledby')).toBe('shared-hazards');
    expect(text(fixture, 'h2')).toBe('Hazards');
    expect(text(fixture, '.recipe-hazards-list')).toBe('Silica: Contains crystalline silica; do not breathe the dust.');
  });
});

describe('hazardSources', () => {
  it("reads a standard material's hazards from the library as it is now, and a potter's own as written", () => {
    const standard = [{ _id: 's', ownedBy: 'Standard', name: 'Silica', hazards: 'Current sheet.' }];
    const lines = [
      { _id: 's', ownedBy: 'Standard', name: 'Silica (300 mesh)', hazards: 'Old sheet.' },
      { _id: 'gone', ownedBy: 'Standard', name: 'Old frit', hazards: 'As saved.' },
      { _id: 'm', ownedBy: 'me', name: 'My ash', hazards: 'Wear gloves.' },
      { name: 'Unknown clay' }
    ];
    expect(hazardSources(lines, standard).map((source) => [source.name, source.hazards])).toEqual([
      // The name stays as the recipe gives it.
      ['Silica (300 mesh)', 'Current sheet.'],
      ['Old frit', 'As saved.'],
      ['My ash', 'Wear gloves.'],
      ['Unknown clay', undefined]
    ]);
  });

  it("reads a potter's own material's hazards from its current record, and from the saved copy once it is deleted", () => {
    const own = [{ _id: 'm', ownedBy: 'me', name: 'My ash', hazards: 'Now: wear a mask.' }];
    const lines = [
      { _id: 'm', ownedBy: 'me', name: 'My ash (old name)', hazards: 'Wear gloves.' },
      { _id: 'deleted', ownedBy: 'me', name: 'My clay', hazards: 'As saved.' }
    ];
    expect(hazardSources(lines, [], own).map((source) => [source.name, source.hazards])).toEqual([
      ['My ash (old name)', 'Now: wear a mask.'],
      ['My clay', 'As saved.']
    ]);
  });
});
