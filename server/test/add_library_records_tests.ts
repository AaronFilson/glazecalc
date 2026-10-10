import * as chai from 'chai';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const expect = chai.expect;

// scripts/add-library-records.js, run on a copy of the library so the real
// data files are never touched.
describe('adding records to the standard library', () => {
  let dir: string;
  const run = (records: object[], ...flags: string[]) => {
    const file = path.join(dir, 'records.json');
    fs.writeFileSync(file, JSON.stringify(records));
    return execFileSync(process.execPath, ['scripts/add-library-records.js', file, ...flags], {
      cwd: dir,
      encoding: 'utf8'
    });
  };
  const lines = (file: string) => fs.readFileSync(path.join(dir, file), 'utf8').trim().split('\n');

  const kaolin = {
    name: 'Test Kaolin EU',
    aliases: ['TK 1', 'Grolleg'],
    kind: 'material',
    category: 'clay',
    region: ['EU'],
    status: 'current',
    substitutes: ['EPK', 'Nowhere Clay'],
    source: { name: 'Test sheet', url: 'https://example.com/tk.pdf', date: '2025-01', type: 'manufacturer' },
    analysis: { SiO2: 47, Al2O3: 37, Fe2O3: 0.8, K2O: 1.5, TiO2: 0.2, CaO: 0 },
    loi: 13.5,
    notes: 'A kaolin for testing.',
    hazards: 'Fine dust.'
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glazecalc-library-'));
    for (const part of [
      'scripts/add-library-records.js',
      'lib/chemistry',
      'data/materials.ndjson',
      'data/additives.ndjson'
    ]) {
      fs.cpSync(part, path.join(dir, part), { recursive: true });
    }
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('says what it would add, skip and refuse, and writes nothing without --write', () => {
    const before = lines('data/materials.ndjson').length;
    const output = run([
      kaolin,
      { ...kaolin, name: 'Bad Frit', aliases: [], category: 'frit', analysis: { SiO2: 50, Unobtainium: 10 }, loi: 0 },
      // Another name that is a record's own name: that record again.
      { ...kaolin, name: 'Second Grolleg', aliases: ['Grolleg China Clay'] },
      // The year goes into a sentence in each language, so it is only a year.
      { ...kaolin, name: 'Old Kaolin', aliases: [], status: 'discontinued', discontinuedSince: 'by 2016' }
    ]);
    expect(output).to.contain('add   records.json: Test Kaolin EU (material, clay, 5 oxides)');
    expect(output).to.contain('other names already taken, left off: Grolleg');
    expect(output).to.contain('FAIL  records.json: Bad Frit: unknown oxide Unobtainium; analysis and LOI come to 60%');
    expect(output).to.contain('skip  records.json: Second Grolleg (already in the library as Grolleg China Clay)');
    expect(output).to.contain('FAIL  records.json: Old Kaolin: discontinuedSince "by 2016" is not a year');
    expect(output).to.contain('substitutes "Nowhere Clay" is not in the library, left off');
    expect(output).to.contain('Nothing written.');
    expect(lines('data/materials.ndjson').length).to.equal(before);
  });

  it('appends the record with its chemistry worked out, and leaves the others as they were', () => {
    const before = lines('data/materials.ndjson');
    run([kaolin], '--write');
    const after = lines('data/materials.ndjson');
    expect(after.slice(0, before.length)).to.eql(before);
    const record = JSON.parse(after[after.length - 1]);
    expect(record).to.include({
      name: 'Test Kaolin EU',
      ownedBy: 'Standard',
      category: 'clay',
      percentmole: 'percent'
    });
    expect(record._id.$oid).to.match(/^[0-9a-f]{24}$/);
    expect(record.aliases).to.eql(['TK 1']);
    // Other names resolve to the record's own name; ones that name nothing go.
    expect(record.substitutes).to.eql(['EPK Kaolin']);
    expect(record.fields.map((f: { name: string }) => f.name)).to.eql(['SiO2', 'Al2O3', 'Fe2O3', 'K2O', 'TiO2']);
    expect(record.loi).to.equal(13.5);
    expect(record.source).to.eql({
      name: 'Test sheet',
      url: 'https://example.com/tk.pdf',
      date: '2025-01',
      kind: 'manufacturer'
    });
    expect(record.rawformula).to.equal('SiO₂ 47%, Al₂O₃ 37%, Fe₂O₃ 0.8%, K₂O 1.5%, TiO₂ 0.2%, LOI 13.5%');
  });
});
