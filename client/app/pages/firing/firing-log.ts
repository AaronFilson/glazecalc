/**
 * The columns and rows of a firing log being recorded. Changing the columns
 * keeps every row's cells lined up under the same headings.
 */
export class FiringLog {
  fields: string[] = [];
  rows: string[][] = [];
  /** True until the log is changed by hand, so a starting set of columns can still follow the person's temperature scale. */
  pristine = false;

  /** A new log: Time, the temperature in the scale the person reads, and Cone. All can be removed. */
  static starter(scale: 'C' | 'F'): FiringLog {
    const log = new FiringLog();
    log.fields = ['Time', scale === 'F' ? 'Temperature F' : 'Temperature C', 'Cone'];
    log.pristine = true;
    return log;
  }

  /** Adds a column, once: a field already in the log is not added again. */
  addField(field: string): void {
    if (this.fields.includes(field)) return;
    this.fields = [...this.fields, field];
    this.rows = this.rows.map((row) => [...row, '']);
  }

  removeField(index: number): void {
    this.fields = this.fields.filter((_, i) => i !== index);
    this.rows = this.rows.map((row) => row.filter((_, i) => i !== index));
  }

  /** Moves a column one place left (-1) or right (+1), cells included. */
  moveField(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.fields.length) return;
    const swap = <T>(list: T[]) => {
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    };
    this.fields = swap(this.fields);
    this.rows = this.rows.map(swap);
  }

  addRow(): void {
    this.rows = [...this.rows, this.fields.map(() => '')];
  }

  removeRow(index: number): void {
    this.rows = this.rows.filter((_, i) => i !== index);
  }
}
