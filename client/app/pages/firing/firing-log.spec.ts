import { FiringLog } from './firing-log';

describe('FiringLog', () => {
  const logWith = (fields: string[], rows: string[][]) => Object.assign(new FiringLog(), { fields, rows });

  it('adds empty rows with one cell per field', () => {
    const log = logWith(['Time', 'Cone'], []);
    log.addRow();
    expect(log.rows).toEqual([['', '']]);
  });

  it('adds a cell to every existing row when a field is added', () => {
    const log = logWith(['Time'], [['1:00'], ['2:00']]);
    log.addField('Cone');
    expect(log.fields).toEqual(['Time', 'Cone']);
    expect(log.rows).toEqual([
      ['1:00', ''],
      ['2:00', '']
    ]);
  });

  it('removes a field together with its column of cells', () => {
    const log = logWith(['Time', 'Cone', 'Damper'], [['1:00', '6', 'open']]);
    log.removeField(1);
    expect(log.fields).toEqual(['Time', 'Damper']);
    expect(log.rows).toEqual([['1:00', 'open']]);
  });

  it('moves a field and its cells left or right', () => {
    const log = logWith(['Time', 'Cone', 'Damper'], [['1:00', '6', 'open']]);
    log.moveField(2, -1);
    expect(log.fields).toEqual(['Time', 'Damper', 'Cone']);
    expect(log.rows).toEqual([['1:00', 'open', '6']]);
    log.moveField(0, 1);
    expect(log.fields).toEqual(['Damper', 'Time', 'Cone']);
    expect(log.rows).toEqual([['open', '1:00', '6']]);
  });

  it('ignores moves past either end', () => {
    const log = logWith(['Time', 'Cone'], [['1:00', '6']]);
    log.moveField(0, -1);
    log.moveField(1, 1);
    expect(log.fields).toEqual(['Time', 'Cone']);
    expect(log.rows).toEqual([['1:00', '6']]);
  });

  it('removes a row', () => {
    const log = logWith(['Time'], [['1:00'], ['2:00'], ['3:00']]);
    log.removeRow(1);
    expect(log.rows).toEqual([['1:00'], ['3:00']]);
  });

  it('replaces arrays instead of mutating them, so signals see a change', () => {
    const log = logWith(['Time'], [['1:00']]);
    const { fields, rows } = log;
    log.addField('Cone');
    expect(log.fields).not.toBe(fields);
    expect(log.rows).not.toBe(rows);
    expect(fields).toEqual(['Time']);
  });
});
