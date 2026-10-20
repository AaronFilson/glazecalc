import { Pipe, PipeTransform } from '@angular/core';
import { isolated } from './bidi';
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

/**
 * Text of its own direction (a name) kept apart from the text around it on a right-to-left page, where a
 * <bdi> cannot go: {{ recipe.title | gcIsolated }} in an <option> (shared/bidi.ts). As it is otherwise.
 */
@Pipe({ name: 'gcIsolated' })
export class IsolatedPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return isolated(value ?? '');
  }
}

const DATE_STYLES: Record<string, Intl.DateTimeFormatOptions> = {
  /** Thursday, October 8, 2026 */
  full: { dateStyle: 'full' },
  /** Thursday, October 8 */
  weekday: { weekday: 'long', month: 'long', day: 'numeric' },
  /** Oct 8, 2026: in a list */
  medium: { dateStyle: 'medium' },
  /** Oct 8, 2026, 3:04 PM: when something happened today */
  moment: { dateStyle: 'medium', timeStyle: 'short' },
  /** 3:04 PM */
  time: { timeStyle: 'short' }
};

/** A date as the reader writes it: {{ recipe.date | gcDate }}, {{ trial.expiresAt | gcDate: 'weekday' }}. */
@Pipe({ name: 'gcDate', pure: false })
export class DatePipe implements PipeTransform {
  transform(value: string | number | Date | null | undefined, style: keyof typeof DATE_STYLES = 'full'): string {
    return formatDate(value, DATE_STYLES[style]);
  }
}
