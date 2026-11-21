// What the catalog gives over its own data (data/*.ndjson) and text as potters type it, for the three-engine
// check (scripts/engines.mjs): the same calls run in Node, JavaScriptCore and SpiderMonkey must give the same
// text. Numbers and words written in a locale use the engine's Intl, so this is where engines most often differ.
// It uses nothing of Node's, so it can be bundled and run in a bare engine shell; the runner hands it the data.
import * as catalog from '../index.ts';

const HOST = Object.freeze({
  ...catalog.READERS,
  oxides: catalog.OXIDES,
  cones: catalog.CONES,
  limits: catalog.LIMITS,
  stull: catalog.STULL,
  densities: catalog.DENSITIES,
  expansion: catalog.EXPANSION,
  policy: catalog.POLICY
});

/** What a call gives, or what it threw: its code and values, or for an error with no code its name and message. */
const run = (work) => {
  try {
    return work();
  } catch (error) {
    if (error?.code) return { threw: error.code, ...(error.params && { params: error.params }) };
    return { threw: error?.name ?? 'Error', message: String(error?.message ?? error) };
  }
};

const LOCALES = ['en', 'de', 'fr', 'ar', 'hi', 'ja'];

/** Each output as [key, value], in a fixed order; `files` is the text of each standard file, by collection. */
export function* outputs(files) {
  for (const name of [
    'ATOMIC_WEIGHTS',
    'MOLAR_MASS',
    'OXIDE_GROUPS',
    'VOLATILES',
    'CONE_CHARTS',
    'SK_MEASURED',
    'DENSITIES',
    'GLASS_VOLUMES',
    'MINERALS',
    'EXPANSION',
    'LIMIT_SETS',
    'STULL',
    'FORMULA_MATERIALS',
    'GENERIC_NAMES',
    'PASTE_LIMITS',
    'ALSO_LISTS',
    'CONE_FIT_POLICY',
    'SG_TARGET_RANGE',
    'MESSAGES'
  ])
    yield [`table ${name}`, catalog[name]];

  const records = Object.fromEntries(
    catalog.STANDARD_COLLECTIONS.map((collection) => [collection, catalog.readRecords(files[collection])])
  );
  const standard = records.materials;
  for (const [collection, list] of Object.entries(records))
    for (const r of list)
      yield [
        `${collection} ${r.uuid}`,
        {
          record: r,
          id: catalog.idOf(r),
          label: catalog.labelOf(r),
          density: run(() => catalog.densityOf(r)),
          traits: run(() => catalog.traitsFromName(r)),
          names: [r.name, ...(r.aliases ?? [])].map((n) => [
            catalog.nameKey(n),
            catalog.foldedName(n),
            catalog.compactName(n)
          ])
        }
      ];
  for (const oxide of Object.keys(catalog.OXIDE_GROUPS)) yield [`oxide ${oxide}`, catalog.formatFormula(oxide)];

  // Unity formulas as typed, from a few standard materials' oxides.
  const targets = standard.slice(0, 30).map((m) => {
    const fields = (m.fields ?? []).filter((f) => Number(f.amount) > 0);
    return [
      fields.map((f) => `${Number(f.amount).toFixed(3)} ${f.name}`).join('\n'),
      fields.map((f) => `${catalog.formatFormula(f.name)} ${Number(f.amount).toFixed(2)}`).join(', '),
      fields.map((f) => `${f.name}: ${f.amount}`).join('; ')
    ];
  });
  yield ['targets', targets.flat().map((text) => run(() => catalog.parseTarget(HOST, text)))];

  const firings = [
    'Cone 6 oxidation',
    '^6 ox',
    'Δ10 reduction',
    'C/6 electric',
    'cone 04-06',
    'Cone 5½',
    'cone 6 to 7',
    'SK 8',
    'SK 6a',
    '1222°C',
    '1222 °C (cone 6)',
    '2232°F',
    'Firing: cone 6 (1222 °C), oxidation',
    'cone 10 reduction, wood',
    'Bisque 04, glaze 6',
    'Raku',
    'mid-fire',
    '1.222,5 °C',
    'cone 6, 1.222,5 °C',
    'Silica 20'
  ];
  for (const decimalComma of [false, true])
    yield [
      `firing text ${decimalComma ? 'comma' : 'point'}`,
      firings.map((line) => ({
        firing: run(() => catalog.readFiring(HOST, line, { decimalComma })),
        isLine: run(() => catalog.isFiringLine(HOST, line, { decimalComma })),
        orton: run(() => catalog.readCone(HOST, line, 'orton')),
        sk: run(() => catalog.readCone(HOST, line, 'sk')),
        skToken: run(() => catalog.skCone(HOST, line))
      }))
    ];

  const names = new Set(standard.flatMap((m) => [m.name, ...(m.aliases ?? [])]).map(catalog.foldedName));
  const match = catalog.nameMatcher();
  const options = (locale, mark) => ({
    locale,
    mark,
    isName: (text) => names.has(catalog.foldedName(text)),
    known: (text) => match(text, standard).how !== 'none'
  });
  for (let i = 0; i + 4 <= 120; i += 4) {
    const lines = standard.slice(i, i + 4).map((m, j) => ({ name: m.name, amount: String(10 + j * 7.5) }));
    const texts = {
      plain: lines.map((l) => `${l.name} ${l.amount}`).join('\n'),
      titled: ['Glaze ' + i, 'Cone 6 oxidation', ...lines.map((l) => `${l.amount}\t${l.name}`), 'Total 100'].join('\n'),
      grams: lines.map((l) => `${l.name}: ${l.amount} g`).join('\n'),
      comma: lines.map((l) => `${l.name} ${l.amount.replace('.', ',')}`).join('\n')
    };
    yield [
      `paste ${i}`,
      Object.entries(texts).map(([how, text]) => {
        const pasted = run(() =>
          catalog.parsePaste(HOST, text, how === 'comma' ? options('de', 'comma') : options('en', 'point'))
        );
        return {
          pasted,
          amounts: Array.isArray(pasted) ? pasted.map((p) => run(() => catalog.importAmounts(p))) : null
        };
      })
    ];
  }

  const typed = [
    '0.25',
    '1,5',
    '1.500',
    '1,500',
    '1 500',
    '1 500,25',
    '12.345,6',
    '½',
    '1½',
    '-2',
    '1e3',
    '٠٫٥',
    '१२',
    '',
    'x'
  ];
  for (const locale of LOCALES)
    for (const mark of ['either', 'comma', 'point'])
      yield [
        `numbers ${locale} ${mark}`,
        {
          read: typed.map((text) => run(() => catalog.parseNumber(text, mark, locale))),
          typing: ['0.25', '1500.5', '12345.678'].map((n) => run(() => catalog.forTyping(n, mark, locale))),
          separators: run(() => catalog.separators(locale))
        }
      ];

  const sample = (text) =>
    Object.fromEntries(
      [...String(text).matchAll(/\{(\w+)/g)].map(([, name], i) => [name, i % 2 ? 1.23456 : `<${name}>`])
    );
  yield ['english', Object.entries(catalog.MESSAGES).map(([code, text]) => catalog.english(code, sample(text)))];
  yield [
    'figures',
    LOCALES.map((locale) => [1 / 3, 1234.5678, 0.001, 1e6].map((v) => run(() => catalog.figureText(v, locale))))
  ];
}
