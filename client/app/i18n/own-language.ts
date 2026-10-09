import { LIVE_LANGUAGES } from '../../../lib/regions/languages';
import { languageOfPath, pathIn } from './language';
import { readsEnglish } from './translation-notice';

/**
 * Where a reader who chose a language goes from an English page: the same
 * page in their language (docs/i18n-plan.md). Only from the plain English
 * addresses, which every old link and search result uses, never from another
 * language's, and never after they asked for the English in this tab. A
 * visitor who chose nothing stays where they are: no language is guessed.
 */
export function ownLanguagePage(
  chosen: string | null,
  where: Pick<Location, 'pathname' | 'search' | 'hash'> = location,
  english = readsEnglish()
): string | null {
  if (!chosen || chosen === 'en' || !LIVE_LANGUAGES.includes(chosen) || english) return null;
  if (languageOfPath(where.pathname) !== 'en') return null;
  return pathIn(chosen, where.pathname, where.search + where.hash);
}

/** The language this browser has chosen, from its copy of the account's choices. */
export function chosenLanguage(storage: Pick<Storage, 'getItem'> = localStorage): string | null {
  try {
    return storage.getItem('language');
  } catch {
    return null;
  }
}
