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
