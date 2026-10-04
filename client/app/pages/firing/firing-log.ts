/**
 * The columns and rows of a firing log being recorded. Changing the columns
 * keeps every row's cells lined up under the same headings.
 */
export class FiringLog {
  fields: string[] = [];
  rows: string[][] = [];

  addField(field: string): void {
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
