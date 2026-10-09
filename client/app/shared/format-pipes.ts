import { Pipe, PipeTransform } from '@angular/core';
import { fixed, formatDate, formatPlain } from './format';

// Templates' way to shared/format.ts, in place of Angular's number and date
// pipes (whose locale is fixed when the app starts). Not pure, so a change of
// format in Settings shows at once; the formatters are cached, so this is cheap.

/** A number to exactly `places` decimals, as the reader writes it: {{ value | gcFixed: 3 }}. */
@Pipe({ name: 'gcFixed', pure: false })
export class FixedPipe implements PipeTransform {
  transform(value: number | null | undefined, places: number): string {
    return value === null || value === undefined || !Number.isFinite(value) ? '' : fixed(value, places);
  }
}

/** A saved plain number, the reader's way: {{ line.amount | gcPlain }} shows 12,5 for "12.5" in German. */
@Pipe({ name: 'gcPlain', pure: false })
export class PlainPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    return formatPlain(value);
  }
}

const DATE_STYLES: Record<string, Intl.DateTimeFormatOptions> = {
  /** Thursday, October 8, 2026 */
  full: { dateStyle: 'full' },
  /** Thursday, October 8 */
  weekday: { weekday: 'long', month: 'long', day: 'numeric' }
};

/** A date as the reader writes it: {{ recipe.date | gcDate }}, {{ trial.expiresAt | gcDate: 'weekday' }}. */
@Pipe({ name: 'gcDate', pure: false })
export class DatePipe implements PipeTransform {
  transform(value: string | number | Date | null | undefined, style: keyof typeof DATE_STYLES = 'full'): string {
    return formatDate(value, DATE_STYLES[style]);
  }
}
