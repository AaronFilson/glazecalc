import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'chai';
import { type MessageFormatElement, TYPE, parse } from '@formatjs/icu-messageformat-parser';

const I18N = path.join(import.meta.dirname, '../../client/public/i18n');

type Messages = { [key: string]: string | Messages };
const flatten = (messages: Messages, prefix = '', into: Record<string, string> = {}) => {
  for (const [key, value] of Object.entries(messages)) {
    const name = prefix ? prefix + '.' + key : key;
    if (typeof value === 'string') into[name] = value;
    else flatten(value, name, into);
  }
  return into;
};
const readFlat = (file: string) => flatten(JSON.parse(fs.readFileSync(file, 'utf8')) as Messages);

/** Whether a branch shows the count (#), anywhere inside it. */
const showsCount = (nodes: MessageFormatElement[]): boolean =>
  nodes.some(
    (node) =>
      node.type === TYPE.pound ||
      ('options' in node && Object.values(node.options).some((option) => showsCount(option.value))) ||
      ('children' in node && showsCount(node.children))
  );

/** Each plural in a message, with its forms. */
const plurals = (
  nodes: MessageFormatElement[],
  into: Array<{ name: string; forms: Record<string, MessageFormatElement[]> }> = []
) => {
  for (const node of nodes) {
    if (node.type === TYPE.plural) {
      into.push({
        name: node.value,
        forms: Object.fromEntries(Object.entries(node.options).map(([form, option]) => [form, option.value]))
      });
    }
    if ('options' in node) for (const option of Object.values(node.options)) plurals(option.value, into);
    if ('children' in node) plurals(node.children, into);
  }
  return into;
};

// In Hindi and French, CLDR's `one` takes 0 as well as 1 (hi-one in round 8). An English `one`
// that does not show the count means exactly one ("your passkey"), so the translation gives that
// text as =1, and its `one` reads right for 0.
describe('plural messages for exactly one, where `one` also takes 0', () => {
  const scopes = fs
    .readdirSync(I18N, { recursive: true, encoding: 'utf8' })
    .map((file) => file.replaceAll('\\', '/'))
    .filter((file) => file === 'en.json' || file.endsWith('/en.json'))
    .map((file) => path.posix.dirname(file));
  const languages = [
    ...new Set(
      fs
        .readdirSync(I18N, { recursive: true, encoding: 'utf8' })
        .map((file) => path.basename(file))
        .filter((name) => name.endsWith('.json') && name !== 'en.json')
        .map((name) => name.slice(0, -'.json'.length))
    )
  ].filter((language) => {
    try {
      return new Intl.PluralRules(language).select(0) === 'one';
    } catch {
      return false;
    }
  });

  it('should find the languages it checks', () => {
    expect(languages).to.include.members(['fr', 'hi']);
  });

  it('should give =1 wherever the English `one` means exactly one', () => {
    const missing: string[] = [];
    for (const scope of scopes) {
      const english = readFlat(path.join(I18N, scope, 'en.json'));
      for (const language of languages) {
        const file = path.join(I18N, scope, language + '.json');
        if (!fs.existsSync(file)) continue;
        const theirs = readFlat(file);
        for (const [key, text] of Object.entries(english)) {
          if (!(key in theirs) || !/\bplural\b/.test(text)) continue;
          const exactlyOne = plurals(parse(text, { ignoreTag: true })).filter(
            (plural) => plural.forms['one'] && !showsCount(plural.forms['one']) && !plural.forms['=0']
          );
          const translated = plurals(parse(theirs[key]!, { ignoreTag: true }));
          for (const plural of exactlyOne) {
            if (!translated.some((t) => t.name === plural.name && t.forms['=1'])) {
              missing.push(`${language} ${scope || 'app'}:${key} (${plural.name})`);
            }
          }
        }
      }
    }
    expect(missing).to.eql([]);
  });
});
