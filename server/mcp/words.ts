// What the recipe tools say (lib/recipe, docs/adr/0019), in the language an
// MCP caller asks for (docs/integrations-plan.md, item 22): each message's code
// is its key in the app's recipe messages (client/public/i18n/recipe/<lang>.json),
// formatted with intl-messageformat as the app formats it, and its figures
// written the language's way. A language not offered, or a message not yet
// translated, is said in English. The files are read once per language from
// the built client (dist/, as production has them) or, before a build, from
// client/public.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { IntlMessageFormat } from 'intl-messageformat';
import recipe from '../../lib/recipe/index.js';
import type { Caution, RecipeMessage } from '../../lib/recipe/index.js';
import languages from '../../lib/regions/languages.js';

const ROOT = path.join(import.meta.dirname, '..', '..');
const PLACES = [path.join(ROOT, 'dist', 'glazecalc', 'browser', 'i18n'), path.join(ROOT, 'client', 'public', 'i18n')];

type Flat = Record<string, string>;

const flatten = (messages: Record<string, unknown>, prefix = '', into: Flat = {}): Flat => {
  for (const [key, value] of Object.entries(messages)) {
    const name = prefix ? prefix + '.' + key : key;
    if (value && typeof value === 'object') flatten(value as Record<string, unknown>, name, into);
    else if (typeof value === 'string') into[name] = value;
  }
  return into;
};

const cache = new Map<string, Flat>();

/** A scope's messages in a language, flat; {} when there is no file. */
const messagesOf = (scope: string, language: string): Flat => {
  const key = scope + '/' + language;
  let found = cache.get(key);
  if (!found) {
    found = {};
    for (const place of PLACES) {
      try {
        found = flatten(JSON.parse(readFileSync(path.join(place, scope, language + '.json'), 'utf8')));
        break;
      } catch {
        // Not built yet, or no such language: the next place, or English.
      }
    }
    cache.set(key, found);
  }
  return found;
};

/** The language to answer in: one the app offers (as written there), or English. */
export const languageOf = (asked: string | undefined): string => {
  if (!asked) return 'en';
  const offered = languages.languageOfTag(asked, languages.LIVE_LANGUAGES);
  return offered ?? 'en';
};

/** A message from the recipe tools in the language, or in English. */
export const recipeText = (message: RecipeMessage, language = 'en'): string => {
  const own = messagesOf('recipe', language)[message.code];
  const text = own ?? messagesOf('recipe', 'en')[message.code] ?? message.code;
  const locale = own ? language : 'en';
  try {
    return String(new IntlMessageFormat(text, locale).format(recipe.paramsText(message, locale)));
  } catch {
    return String(
      new IntlMessageFormat(messagesOf('recipe', 'en')[message.code] ?? message.code, 'en').format(
        recipe.paramsText(message)
      )
    );
  }
};

/** A caution's sentences, one after another. */
export const cautionText = (caution: Caution, language = 'en'): string =>
  caution.sentences.map((sentence) => recipeText(sentence, language)).join(' ');

/** A chemistry message (lib/chemistry: unknown oxide, no flux) in the language, or its English. */
export const chemistryText = (
  message: { code?: string; params?: Record<string, string | number>; message: string },
  language = 'en'
): string => {
  const text = message.code ? messagesOf('chemistry', language)[message.code] : undefined;
  if (!text) return message.message;
  try {
    return String(new IntlMessageFormat(text, language).format(message.params ?? {}));
  } catch {
    return message.message;
  }
};
