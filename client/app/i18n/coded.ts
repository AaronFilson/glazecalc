import { TranslocoService } from '@jsverse/transloco';
import type { ChemistryError, ChemistryMessage } from '../../../lib/chemistry';
import { fixed } from '../shared/format';

// Messages that come with a code: the server's (server/lib/messages.ts), the
// chemistry's (lib/chemistry/messages.js), and the words of who to call
// (lib/regions/safety.js, keyed by textKey). Each comes with its English; a
// page in another language shows its translation where there is one
// (client/public/i18n/server/<language>.json, chemistry/ and safety/), loaded
// with the page's own messages (i18n/provide-i18n.ts, and the home-safety
// guide's route for safety/).

let transloco: TranslocoService | null = null;

/** Called once the page's messages are loaded; null in tests, which see the English. */
export function useCodedMessages(service: TranslocoService | null): void {
  transloco = service;
}

/** The translation of a coded message, or null where the page's language has none. */
export function codedMessage(
  scope: 'server' | 'chemistry' | 'safety' | 'regions' | 'records',
  code: string,
  params: Record<string, string | number> = {}
): string | null {
  if (!transloco) return null;
  const language = transloco.getActiveLang();
  const key = scope + '.' + code;
  if (!transloco.getTranslation(language)[key]) return null;
  return transloco.translate(key, params, language);
}

/** A chemistry error or warning as the reader reads it: translated, with numbers as Settings write them. */
export function chemistryText(problem: ChemistryMessage | ChemistryError): string {
  if (!problem.code) return problem.message;
  const params = Object.fromEntries(
    Object.entries(problem.params ?? {}).map(([name, value]) => [
      name,
      typeof value === 'number' ? fixed(value, 2) : value
    ])
  );
  return codedMessage('chemistry', problem.code, params) ?? problem.message;
}
