import { hazardSources } from './recipe-hazards';

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
});
