import { Injectable, isDevMode } from '@angular/core';
import { TranslocoMissingHandler } from '@jsverse/transloco';

/**
 * A key with no English is a mistake: while developing and in tests it stops
 * the page, so it is found at once (the keys manager finds the rest in CI). A
 * key missing in another language shows the English, before this is asked.
 */
@Injectable()
export class MissingKey implements TranslocoMissingHandler {
  handle(key: string): string {
    if (isDevMode()) throw new Error(`No English for the message ${key} (client/public/i18n)`);
    return '';
  }
}
