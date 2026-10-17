'use strict';

// Paste-in import: recipes pasted as text or CSV, read into lines of a name
// and an amount, and each name found in the library. Nothing here saves
// anything: the app shows what was read and the person confirms it.
//
// What is read:
//   "Custer Feldspar 25", "EPK 20.5 %", "25 g Silica", "Whiting: 20",
//   "- Silica .... 30", "1. EPK 20", tab- or semicolon-separated columns, CSV
//   (quoted or not), decimal commas (by the reader's decimal mark), weights in
//   g, kg, lb and oz (as grams), and additions marked "+" or under a heading
//   such as "Add", "Additions" or "Colorants". A title is the first line that
//   is not a material; a line of text after the materials with materials
//   below it starts another recipe, as does a line of dashes, or a blank line
//   followed by a material the recipe already has. Totals, column headings,
//   firing notes and links are set aside, so they can be shown.

const { parseNumber } = require('./numbers');
const { GENERIC_NAMES } = require('./generic-names');
const { readFiring } = require('../cones/firing');

/**
 * The most a paste can be: characters, lines, and characters in a line that
 * can be a material (a longer line is text, so no pattern is run on it).
 */
const PASTE_LIMITS = { chars: 50000, lines: 2000, line: 300 };

/** Which limit a paste is over ('chars' or 'lines'), or null. */
function pasteTooLong(text) {
  const all = String(text ?? '');
  if (all.length > PASTE_LIMITS.chars) return 'chars';
  let lines = 1;
  for (let i = all.indexOf('\n'); i >= 0; i = all.indexOf('\n', i + 1)) lines++;
  return lines > PASTE_LIMITS.lines ? 'lines' : null;
}

// A number that could be a decimal or digit groups: "1,500" is 1.5 or 1500.
const AMBIGUOUS = /^[1-9]\d{0,2}[.,]\d{3}$/;

/**
 * How a paste writes its numbers, from all of them at once: a number with one
 * separator and other than three digits after it ("22,5", "0.500") is a
 * decimal in that mark; two kinds ("1.234,5") or a repeated one ("1,234,567")
 * say which mark groups. Nothing else is evidence.
 */
function decimalEvidence(text) {
  const seen = { comma: false, point: false };
  const tokens = String(text ?? '')
    .normalize('NFKC')
    .match(/(?<![\d.,])\d[\d.,]*\d(?![\d.,])/g);
  for (const token of tokens ?? []) {
    const commas = (token.match(/,/g) ?? []).length;
    const points = (token.match(/\./g) ?? []).length;
    if (commas && points) seen[token.lastIndexOf(',') > token.lastIndexOf('.') ? 'comma' : 'point'] = true;
    else if (commas > 1) seen.point = true;
    else if (points > 1) seen.comma = true;
    else if ((commas || points) && !AMBIGUOUS.test(token)) seen[commas ? 'comma' : 'point'] = true;
  }
  return seen;
}

/** Whether an ambiguous number, given the evidence, is decided: digit groups where the other mark is the decimal one. */
const groupedByEvidence = (token, seen) =>
  token.includes(',') ? seen.point && !seen.comma : seen.comma && !seen.point;

/**
 * The numbers of a paste that can be read two ways even after reading all of
 * them ("1,500" in a paste whose other numbers use decimal commas: 1.5 or
 * 1500), as pasted, each once, in order. Only for a reader whose mark is
 * 'either'; a chosen mark decides them. parsePaste reads them as the reader's
 * locale does unless told options.reading ('decimal' or 'group').
 */
function ambiguousNumbers(text, mark = 'either') {
  if (mark !== 'either') return [];
  const seen = decimalEvidence(text);
  const found = [];
  for (const token of String(text ?? '')
    .normalize('NFKC')
    .match(/(?<![\d.,])\d[\d.,]*\d(?![\d.,])/g) ?? []) {
    if (AMBIGUOUS.test(token) && !groupedByEvidence(token, seen) && !found.includes(token)) found.push(token);
  }
  return found;
}

/** Grams in each weight a line can be given in; the rest are proportions. */
const WEIGHTS = { g: 1, kg: 1000, lb: 453.59237, oz: 28.349523125 };

/** The words a unit can be written as, and what each is. */
const UNIT_WORDS = {
  '%': '%',
  percent: '%',
  pct: '%',
  g: 'g',
  gr: 'g',
  gm: 'g',
  gms: 'g',
  gram: 'g',
  grams: 'g',
  gramm: 'g',
  gramos: 'g',
  grammes: 'g',
  kg: 'kg',
  lb: 'lb',
  lbs: 'lb',
  oz: 'oz',
  part: 'parts',
  parts: 'parts',
  pt: 'parts',
  pts: 'parts',
  teile: 'parts',
  parties: 'parts',
  partes: 'parts',
  parti: 'parts',
  delen: 'parts'
};
const UNIT =
  '(%|percent|pct|grams|gramm|gramos|grammes|gram|gms|gm|gr|g|kg|lbs|lb|oz|parts|part|pts|pt|teile|parties|partes|parti|delen)';

// A number as pasted: digits with points or commas in them, in any script.
const NUMBER = '((?:\\p{Nd}[\\p{Nd}.,٫]*)|(?:[.,٫]\\p{Nd}+))';
// Between a name and its amount: spaces, a tab, a colon or equals sign, dot leaders, or a dash with spaces.
const GAP = '(?:\\s*(?:\\.{2,}|…+|[:=]|[-–—](?=\\s))\\s*|\\s+)';
const NAME_FIRST = new RegExp('^(.*?\\S)' + GAP + NUMBER + '\\s*' + UNIT + '?\\.?$', 'iu');
const NUMBER_FIRST = new RegExp(
  '^' + NUMBER + '\\s*(?:' + UNIT + '(?![\\p{L}\\p{Nd}]))?\\s*[-–—:x×]?\\s+(\\S.*)$',
  'iu'
);

/** Text as names are compared: NFKC (full-width letters are plain ones), in lower case, spaces as one. */
const folded = (text) =>
  String(text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Text with only its letters and digits, without accents, for a looser
 * comparison: "G-200" is "G200", "Feldspath" and "Feldspäth" are alike, and a
 * Turkish dotless ı is an i.
 */
const compact = (text) =>
  folded(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/ı/g, 'i')
    .replace(/[^\p{L}\p{Nd}]/gu, '');

/** The words of a name as compared: letters and digits apart ("G200" is "g", "200"). */
const wordsOf = (text) =>
  folded(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/ı/g, 'i')
    .replace(/(\p{L})(?=\p{Nd})|(\p{Nd})(?=\p{L})/gu, '$1$2 ')
    .split(/[^\p{L}\p{Nd}]+/u)
    .filter((word) => word && !STOP_WORDS.has(word));

// Words that say nothing about which material it is.
const STOP_WORDS = new Set(['the', 'of', 'and', 'mesh', 'm', 'x']);

/** A heading, as compared: without a colon, brackets or a percent sign at the end. */
const headingOf = (text) =>
  folded(text)
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/[:%*#=_\-–—.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Headings over additions, in the languages the app is in or that potters paste from.
const ADD_HEADINGS = new Set(
  (
    '+|add|adds|add ins|add in|added|addition|additions|additive|additives|colorant|colorants|colourant|colourants|' +
    'color|colors|colour|colours|stain|stains|oxide|oxides|opacifier|opacifiers|extra|extras|plus|' +
    'zusatz|zusätze|zugabe|zugaben|ajout|ajouts|aggiunte|aggiunta|añadidos|adiciones|aditivos|adições|' +
    'toevoegingen|toevoeging|tillsatser|tilsætninger|tilsetninger|lisäaineet|lisäykset|dodatki|přísady|prísady|' +
    'adalékok|lisandid|priedai|piedevas|dodaci|dodatki|aditivi|πρόσθετα|добавки|aditivi|katkılar|ilaveler|' +
    '添加|添加物|添加剂|添加劑|첨가물|첨가제'
  ).split('|')
);
const BASE_HEADINGS = new Set(
  (
    'base|base glaze|base recipe|glaze|recipe|ingredients|materials|batch|basis|grundglasur|grundrezept|rezept|' +
    'recette|base de l émail|ricetta|base|receta|recept|basisglazuur|resepti|przepis|receptura|alap|retsept|' +
    'базова|основа|taban|基础釉|基礎釉|基礎|기본 유약|基礎釉薬'
  ).split('|')
);
// Words of a column heading row: "Material, Amount", "Ingredient %".
const MATERIAL_COLUMNS = new Set(
  'material|materials|ingredient|ingredients|name|raw material|raw materials|rohstoff|rohstoffe|matière|matières|matière première|materiale|materia prima|materias primas|grondstof|grondstoffen|materiaal|råvara|surowiec|surovina|原料|원료'.split(
    '|'
  )
);
const AMOUNT_COLUMNS = new Set(
  '%|amount|amounts|percent|percentage|weight|parts|qty|quantity|batch|grams|g|menge|anteil|gewicht|teile|quantité|poids|pourcentage|quantità|peso|cantidad|porcentaje|hoeveelheid|gewicht|mängd|ilość|množství|量|配合|함량|비율'.split(
    '|'
  )
);
const RECIPE_COLUMNS = new Set(
  'recipe|glaze|recipe name|glaze name|title|rezept|glasur|recette|émail|ricetta|smalto|receta|esmalte|recept|glazuur|glasyr|釉|유약'.split(
    '|'
  )
);
const ADDITION_COLUMNS = new Set('addition|add|additive|type|role'.split('|'));

/** A total line: "Total 100", "Summe: 100,0". */
const TOTAL =
  /^(?:total|totals|sum|subtotal|grand total|gesamt|summe|insgesamt|totaal|totale|somme|suma|razem|celkem|spolu|yhteensä|i alt|totalt|összesen|kokku|iš viso|kopā|ukupno|skupaj|σύνολο|итого|общо|toplam|合计|合計|总计|總計|합계)(?![\p{L}\p{Nd}])/u;

/** A line about the firing or the glaze, not a material: "Cone 6", "^6", "SG 1.45", "1240 °C". */
const NOT_A_MATERIAL =
  /^(?:(?:\^|δ|△)\s*\p{Nd}|(?:cone|cones|kegel|seger|orton|sk|temp|temperature|firing|fired|atmosphere|oxidation|reduction|sg|s\.g\.|specific gravity|loi|coe|si:al|cost|price|source|notes?|glazy|digitalfire|brennen|brand|cuisson|cottura|cocción)(?![\p{L}\p{Nd}]))/u;

/** A line that only separates two recipes: dashes, equals signs, stars or underscores. */
const SEPARATOR = /^\s*(?:[-=*_~#]\s*){3,}$/;

/** "1. ", "2) ", "- ", "* ", "• " before a line. */
const LIST_MARK = /^\s*(?:[-*•·◦▪‣]+\s+|\(?\d{1,2}[.)]\s+(?=\D))/u;

/**
 * Cells of a delimited row: tab, semicolon or comma separated, with CSV's
 * quotes ("Feldspar, potash","25"). Null for a line with no delimiter.
 */
function cellsOf(text) {
  // A comma between digits is a decimal comma ("25,5"), not a column.
  const commas = /,/.test(text.replace(/(?<=\p{Nd}),(?=\p{Nd})/gu, ''));
  const delimiter = text.includes('\t') ? '\t' : text.includes(';') ? ';' : commas ? ',' : null;
  if (!delimiter) return null;
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && !cell.trim()) {
      quoted = true;
      cell = '';
    } else if (char === delimiter) {
      cells.push(cell.trim());
      cell = '';
    } else cell += char;
  }
  cells.push(cell.trim());
  return { delimiter, cells };
}

/** A pasted number with its unit after it ("20,5 %", "250g"), or null. */
function amountCell(text, options) {
  const match = String(text)
    .normalize('NFKC')
    .trim()
    .match(new RegExp('^' + NUMBER + '\\s*' + UNIT + '?\\.?$', 'iu'));
  if (!match) return null;
  const value = options.read(match[1]);
  if (value === null || value < 0) return null;
  return { value, unit: match[2] ? UNIT_WORDS[match[2].toLowerCase()] : null };
}

/** An amount in grams for a weight, or as it is; its unit as the import keeps it. */
function inUnits(amount) {
  if (amount.unit && WEIGHTS[amount.unit]) return { value: amount.value * WEIGHTS[amount.unit], unit: 'g' };
  return { value: amount.value, unit: amount.unit };
}

/** Whether a row of cells (or the words of a line) is a column heading row, and which column is which. */
function headingRow(cells) {
  const names = cells.map(headingOf);
  if (!names.some((name) => MATERIAL_COLUMNS.has(name) || AMOUNT_COLUMNS.has(name))) return null;
  const known = (name) =>
    !name ||
    MATERIAL_COLUMNS.has(name) ||
    AMOUNT_COLUMNS.has(name) ||
    RECIPE_COLUMNS.has(name) ||
    ADDITION_COLUMNS.has(name) ||
    /^(?:code|id|no|nr|#|notes?|comment|comments|oxide|analysis|cost|price|supplier)$/.test(name);
  if (!names.every(known)) return null;
  const find = (set) => names.findIndex((name) => set.has(name));
  return {
    material: find(MATERIAL_COLUMNS),
    amount: find(AMOUNT_COLUMNS),
    recipe: names.findIndex((name, i) => RECIPE_COLUMNS.has(name) && i !== find(MATERIAL_COLUMNS)),
    addition: find(ADDITION_COLUMNS)
  };
}

/** Whether a cell marks its row as an addition: "+", "add", "addition", "yes". */
const marksAddition = (cell) => /^(?:\+|add|addition|additive|yes)$/i.test(headingOf(cell) || cell.trim());

/**
 * A line of text as a material and an amount: "Custer Feldspar 25",
 * "EPK 20.5 %", "25 g Silica". Null when there is no amount at its end or start.
 */
function textItem(text, options) {
  const line = text.normalize('NFKC').trim();
  const nameFirst = line.match(NAME_FIRST);
  if (nameFirst) {
    const value = options.read(nameFirst[2]);
    if (
      value !== null &&
      value >= 0 &&
      /(?<![\p{L}\p{Nd}])mesh$/iu.test(nameFirst[1]) &&
      !/\p{Nd}/u.test(nameFirst[1])
    ) {
      // "Silica mesh 200": the number is the mesh, part of the name, never the amount.
      return { name: line, value: null, unit: null };
    }
    if (value !== null && value >= 0) {
      // A column of grams before the percent ("Custer 250.0 25.0%"): the name stops before it.
      let name = nameFirst[1].trim();
      for (let more; !options.isName(name) && (more = name.match(/^(.*\S)\s+\p{Nd}+[.,]\p{Nd}+\s*(?:%|g)?$/u));) {
        name = more[1];
      }
      return { name, ...inUnits({ value, unit: nameFirst[3] ? UNIT_WORDS[nameFirst[3].toLowerCase()] : null }) };
    }
  }
  const numberFirst = line.match(NUMBER_FIRST);
  if (numberFirst) {
    const value = options.read(numberFirst[1]);
    // "325 mesh silica": the 325 is the mesh, not an amount.
    if (
      value !== null &&
      value >= 0 &&
      /\p{L}/u.test(numberFirst[3]) &&
      !/^mesh(?![\p{L}\p{Nd}])/iu.test(numberFirst[3])
    ) {
      return {
        name: numberFirst[3].trim(),
        ...inUnits({ value, unit: numberFirst[2] ? UNIT_WORDS[numberFirst[2].toLowerCase()] : null })
      };
    }
  }
  // A mesh size with no amount ("Silica 200 mesh", "325 mesh silica"): a name alone.
  if (
    /\p{Nd}\s*mesh(?![\p{L}\p{Nd}])|(?<![\p{L}\p{Nd}])mesh\s*\p{Nd}/iu.test(line) &&
    /\p{L}/u.test(line.replace(/mesh/gi, ''))
  ) {
    return { name: line, value: null, unit: null };
  }
  return null;
}

/**
 * A delimited row as a material and an amount, by the heading row's columns
 * when there was one; otherwise the first cell of text is the name and the
 * first number after it the amount. Null when it has no name and amount.
 */
function rowItem(row, columns, options) {
  let cells = row.cells;
  // An unquoted decimal comma in a comma-separated row ("EPK,20,5"), where the reader writes commas for decimals.
  if (
    row.delimiter === ',' &&
    cells.length === 3 &&
    /^\d+$/.test(cells[1]) &&
    /^\d+$/.test(cells[2]) &&
    (options.mark === 'comma' || (options.mark !== 'point' && options.decimal === ','))
  ) {
    cells = [cells[0], cells[1] + ',' + cells[2]];
  }
  // "+ Tin oxide" in a name's cell: an addition.
  const plus = (cell) => /^\+\s*/.test(cell.trim());
  const named = (cell) => cell.trim().replace(/^\+\s*/, '');
  if (columns && columns.material >= 0 && columns.amount >= 0) {
    const cell = cells[columns.material] ?? '';
    const name = named(cell);
    const amount = amountCell(cells[columns.amount] ?? '', options);
    if (!name || !amount || !/\p{L}/u.test(name)) return null;
    return {
      name,
      ...inUnits(amount),
      recipe: columns.recipe >= 0 ? (cells[columns.recipe] ?? '').trim() : '',
      addition: plus(cell) || (columns.addition >= 0 && marksAddition(cells[columns.addition] ?? ''))
    };
  }
  const nameAt = cells.findIndex((cell) => /\p{L}/u.test(cell) && !amountCell(cell, options) && !marksAddition(cell));
  if (nameAt < 0) return null;
  let amountAt = cells.findIndex((cell, i) => i > nameAt && amountCell(cell, options));
  if (amountAt < 0) amountAt = cells.findIndex((cell) => amountCell(cell, options));
  if (amountAt < 0) return null;
  const others = cells.filter((cell, i) => i !== nameAt && i !== amountAt);
  return {
    name: named(cells[nameAt]),
    ...inUnits(amountCell(cells[amountAt], options)),
    addition: plus(cells[nameAt]) || others.some(marksAddition)
  };
}

/**
 * Recipes read from pasted text, each with its title (or null), its notes
 * (lines of text that are not materials), its lines, and what was set aside.
 *
 * options.mark and options.locale say how the reader writes numbers (see
 * numbers.js). options.isName(text) may say whether text is a material's
 * whole name, so "Frit 3134" alone is a material with no amount rather than
 * "Frit" at 3134.
 */
function parsePaste(text, options = {}) {
  const settings = {
    mark: options.mark ?? 'either',
    locale: options.locale ?? 'en',
    isName: options.isName ?? (() => false)
  };
  // One decision for the whole paste: a number that could be a decimal or digit groups is read by what the
  // rest of the paste writes, else as chosen (options.reading), else as the reader's locale does.
  const seen = decimalEvidence(text);
  settings.read = (token) => {
    if (settings.mark === 'either' && AMBIGUOUS.test(token.trim())) {
      const sep = token.includes(',') ? ',' : '.';
      if (groupedByEvidence(token, seen) || options.reading === 'group') return Number(token.trim().replace(sep, ''));
      if (options.reading === 'decimal') return Number(token.trim().replace(sep, '.'));
    }
    return parseNumber(token, settings.mark, settings.locale);
  };
  settings.decimal = new Intl.NumberFormat(settings.locale).formatToParts(1.5).find((p) => p.type === 'decimal')?.value;
  // Past the limits nothing is read: the app says so (pasteTooLong), and a caller that does not still cannot be slowed.
  if (pasteTooLong(text)) return [];
  const rows = String(text ?? '')
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\r|\n/);

  const recipes = [];
  let recipe = null;
  let inAdditions = false;
  // Whether the additions section has had a line yet: a blank line before one is part of the heading's gap.
  let additionsStarted = false;
  let columns = null;
  let afterBlank = false;
  const start = (title) => {
    recipe = { title: title || null, notes: [], lines: [], skipped: [] };
    recipes.push(recipe);
    inAdditions = false;
    additionsStarted = false;
    return recipe;
  };
  const current = () => recipe ?? start(null);

  // What each line is, read once: the next material decides what a line of text before it is.
  const read = rows.map((raw, index) => classify(raw, index));
  function classify(raw, index) {
    const line = index + 1;
    const text = raw.replace(/\s+$/, '');
    const trimmed = text.trim();
    if (!trimmed) return { kind: 'blank', line, text };
    if (SEPARATOR.test(trimmed)) return { kind: 'separator', line, text };
    // Too long to be a material: set aside as text before any pattern runs on it.
    if (trimmed.length > PASTE_LIMITS.line) return { kind: 'text', line, text };
    const row = cellsOf(trimmed);
    const delimited = row && row.cells.filter(Boolean).length > 1 ? row : null;
    const heading = delimited
      ? headingRow(delimited.cells)
      : (headingRow([trimmed]) ?? headingRow(trimmed.split(/\s{2,}/)) ?? headingRow(trimmed.split(/\s+/)));
    if (heading && !/\p{Nd}/u.test(trimmed.replace(/%/g, ''))) return { kind: 'columns', line, text, columns: heading };
    const head = headingOf(trimmed);
    if (ADD_HEADINGS.has(head)) return { kind: 'add', line, text };
    if (BASE_HEADINGS.has(head)) return { kind: 'base', line, text };
    if (/:\/\//.test(trimmed)) return { kind: 'text', line, text };

    let body = trimmed.replace(LIST_MARK, '');
    let addition = false;
    const plus = body.match(/^\+\s*(.*)$/) ?? body.match(/^(?:add|additions?)\s*:\s*(.+)$/i);
    if (plus && plus[1]) {
      body = plus[1];
      addition = true;
    }
    if (TOTAL.test(folded(body))) return { kind: 'total', line, text };
    if (NOT_A_MATERIAL.test(folded(body)) || /°\s*[cf]\b|\d\s*°/i.test(body)) return { kind: 'text', line, text };
    // Nothing but a firing ("06", "C/6", "6½ ox", "ox/red"): a note, read into the recipe's firing on import.
    if (readFiring(body)?.whole) return { kind: 'text', line, text };

    let item = null;
    if (delimited) item = rowItem(delimited, null, settings);
    if (!item && settings.isName(body)) item = { name: body, value: null, unit: null };
    if (!item) item = textItem(body, settings);
    if (!item) {
      if (amountCell(body.replace(/^[^\p{L}\p{Nd}]+/u, ''), settings)) return { kind: 'total', line, text };
      return { kind: 'text', line, text, delimited };
    }
    if (TOTAL.test(folded(item.name)) || NOT_A_MATERIAL.test(folded(item.name))) {
      return { kind: TOTAL.test(folded(item.name)) ? 'total' : 'text', line, text };
    }
    return { kind: 'item', line, text, item: { ...item, addition: addition || !!item.addition }, delimited };
  }

  const nextItem = (from) => {
    for (let i = from; i < read.length; i++) {
      if (read[i].kind === 'item') return read[i];
      if (read[i].kind !== 'blank' && read[i].kind !== 'add' && read[i].kind !== 'base') return null;
    }
    return null;
  };

  for (let i = 0; i < read.length; i++) {
    const entry = read[i];
    switch (entry.kind) {
      case 'blank':
        afterBlank = true;
        // A blank line ends a section of additions that has had lines: what follows is the base again.
        if (inAdditions && additionsStarted) inAdditions = false;
        continue;
      case 'separator':
        if (recipe && (recipe.lines.length || recipe.title)) recipe = null;
        columns = null;
        break;
      case 'columns':
        columns = entry.columns;
        current().skipped.push({ line: entry.line, text: entry.text, why: 'columns' });
        break;
      case 'add':
        current();
        inAdditions = true;
        additionsStarted = false;
        break;
      case 'base':
        current();
        inAdditions = false;
        break;
      case 'total':
        current().skipped.push({ line: entry.line, text: entry.text, why: 'total' });
        break;
      case 'text': {
        const has = recipe && recipe.lines.length;
        if (has && nextItem(i + 1)) start(entry.text.trim());
        else if (!recipe || (!recipe.lines.length && !recipe.title)) current().title = entry.text.trim();
        else current().notes.push(entry.text.trim());
        break;
      }
      case 'item': {
        let item = entry.item;
        if (columns && entry.delimited) item = rowItem(entry.delimited, columns, settings) ?? item;
        if (item.recipe && (!recipe || recipe.title !== item.recipe)) start(item.recipe);
        else if (
          afterBlank &&
          recipe &&
          !inAdditions &&
          recipe.lines.some((l) => folded(l.name) === folded(item.name))
        ) {
          start(null);
        }
        if (inAdditions) additionsStarted = true;
        current().lines.push({
          line: entry.line,
          text: entry.text.trim(),
          name: item.name,
          amount: item.value,
          unit: item.unit,
          addition: inAdditions || !!item.addition
        });
        break;
      }
    }
    afterBlank = false;
  }
  return recipes.filter((r) => r.lines.length || r.title);
}

/** Whether amounts add up to about 100, as a recipe in percent does. */
const aboutHundred = (total) => Math.abs(total - 100) <= 0.5;

/**
 * The amounts of a read recipe as the app keeps them: base materials as
 * plain numbers ("20.5"), weights in grams; and each addition's unit, a
 * percent of the base when it says so or when the base adds up to 100,
 * grams when it was weighed, and otherwise parts in the base's unit.
 */
function importAmounts(recipe) {
  const base = recipe.lines.filter((line) => !line.addition && line.amount !== null);
  const baseTotal = base.reduce((sum, line) => sum + line.amount, 0);
  const percentBase = aboutHundred(baseTotal);
  const plain = (value) => (value === null ? '' : String(Number(value.toFixed(5))));
  return recipe.lines.map((line) => {
    if (!line.addition) return { amount: plain(line.amount) };
    const unit =
      line.unit === '%' || (line.unit !== 'g' && percentBase) ? 'percent' : line.unit === 'g' ? 'grams' : 'parts';
    return { amount: plain(line.amount), unit };
  });
}

/**
 * The record a pasted name means, found in the order given (a potter's own
 * records first, as findNamed does):
 *   name     the record's name, whatever its case, width or punctuation
 *   alias    one of its other names
 *   close    the one record whose name is close enough to take as meant
 *   choose   several are close and none stands out, or the name is a generic
 *            word (generic-names.js): the person chooses
 *   none     nothing is close
 * With the record taken (none for choose and none), and the closest records,
 * best first, to choose from (up to `limit`).
 */
function matchName(name, records, limit = 5) {
  const wanted = folded(name);
  const loose = compact(name);
  const result = (how, record, candidates) => ({ how, record: record ?? null, candidates: candidates ?? [] });
  if (!loose) return result('none');

  const byName = records.find((record) => folded(record.name) === wanted);
  if (byName) return result('name', byName, [byName]);
  const byAlias = records.find((record) => (record.aliases ?? []).some((alias) => folded(alias) === wanted));
  if (byAlias) return result('alias', byAlias, [byAlias]);

  // Alike but for punctuation, spaces or accents: "G200", "Nepheline-Syenite".
  const looseName = records.filter((record) => compact(record.name) === loose);
  const looseAlias = records.filter(
    (record) => !looseName.includes(record) && (record.aliases ?? []).some((alias) => compact(alias) === loose)
  );
  const loosely = [...looseName, ...looseAlias];
  if (loosely.length === 1 || (looseName.length === 1 && loosely.length > 1)) {
    return result(looseName.length ? 'name' : 'alias', loosely[0], [loosely[0]]);
  }
  if (loosely.length > 1) return result('choose', null, loosely.slice(0, limit));

  // A mesh size ("Silica 200 mesh") is a regional product's name or none of them: never taken silently.
  if (/(?<![\p{L}\p{Nd}])mesh(?![\p{L}\p{Nd}])|\p{Nd}\s*#/iu.test(wanted)) {
    const near = records
      .map((record) => ({
        record,
        score: Math.max(...[record.name, ...(record.aliases ?? [])].map((n) => likeness(name, n)))
      }))
      .filter((entry) => entry.score >= 0.45)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.record);
    return near.length ? result('choose', null, near) : result('none');
  }

  const generic = genericCandidates(loose, records, limit);
  // Two or more of the table's: those. Just one (the records have few): it, then the close ones.
  if (generic.length > 1) return result('choose', null, generic);

  const scored = records
    .map((record) => ({
      record,
      score: Math.max(...[record.name, ...(record.aliases ?? [])].map((n) => likeness(name, n)))
    }))
    .filter((entry) => entry.score >= 0.45)
    .sort((a, b) => b.score - a.score);
  if (generic.length) {
    const more = scored.map((entry) => entry.record).filter((record) => record !== generic[0]);
    return result('choose', null, [...generic, ...more].slice(0, limit));
  }
  const candidates = scored.slice(0, limit).map((entry) => entry.record);
  if (!scored.length) return result('none');
  // Several names have every word of this one and differ only by a qualifier ("Nickel oxide, green" and
  // ", black"): none is the one meant.
  const queryWords = wordsOf(name);
  const containing = scored.filter((entry) => {
    const words = wordsOf(entry.record.name);
    return queryWords.every((word) => words.includes(word));
  });
  if (containing.length > 1) {
    const rest = candidates.filter((record) => !containing.some((entry) => entry.record === record));
    return result('choose', null, [...containing.map((entry) => entry.record), ...rest].slice(0, limit));
  }
  const [best, second] = scored;
  if (best.score >= 0.6 && (!second || best.score - second.score >= 0.1))
    return result('close', best.record, candidates);
  return result('choose', null, candidates);
}

/** A generic word's table, by the word as compared (letters and digits only). */
const GENERIC_BY_WORD = new Map(GENERIC_NAMES.flatMap((entry) => entry.words.map((word) => [compact(word), entry])));

/**
 * The records to offer for a generic word ("Kaolin", "Zircopax"), the table's
 * most common first, then any other close ones to fill up to `limit`; none
 * when the name is not a generic word or the records have none of its list.
 */
function genericCandidates(loose, records, limit) {
  const entry = GENERIC_BY_WORD.get(loose);
  if (!entry) return [];
  const offered = [];
  for (const wanted of entry.offer.map(folded)) {
    const record = records.find((r) => folded(r.name) === wanted);
    if (record && !offered.includes(record)) offered.push(record);
  }
  return offered.slice(0, limit);
}

/**
 * How well two words match: 1 the same, 0.75 when one starts the other ("carb",
 * "carbonate") or long ones are a letter apart ("nephaline"), 0 otherwise.
 * Numbers match only themselves.
 */
function wordMatch(a, b) {
  if (a === b) return 1;
  const digits = /\p{Nd}/u;
  if (digits.test(a) || digits.test(b)) return 0;
  if (a.length >= 2 && b.startsWith(a)) return 0.75;
  if (b.length >= 3 && a.startsWith(b)) return 0.75;
  return a.length >= 5 && b.length >= 5 && oneApart(a, b) ? 0.75 : 0;
}

/** Whether one letter changed, added or taken out turns one word into the other. */
function oneApart(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** How alike the letters of two strings are, 0 to 1: shared pairs of letters (Dice's coefficient). */
function pairsAlike(a, b) {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const pairs = new Map();
  for (let i = 0; i < a.length - 1; i++) pairs.set(a.slice(i, i + 2), (pairs.get(a.slice(i, i + 2)) ?? 0) + 1);
  let shared = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const count = pairs.get(b.slice(i, i + 2));
    if (count) {
      shared++;
      pairs.set(b.slice(i, i + 2), count - 1);
    }
  }
  return (2 * shared) / (a.length + b.length - 2);
}

/**
 * How close a pasted name is to a record's name, 0 to 1: mostly how many of
 * the pasted words the name has, then how much of the name they cover, then
 * how alike the letters are. Numbers must be the same: "Frit 3134" is not
 * "Frit 3124".
 */
function likeness(pasted, recordName) {
  const query = wordsOf(pasted);
  const words = wordsOf(recordName);
  if (!query.length || !words.length) return 0;
  const used = new Set();
  let found = 0;
  let exact = 0;
  let numberMissed = false;
  for (const word of query) {
    let at = -1;
    let best = 0;
    words.forEach((other, i) => {
      const match = used.has(i) ? 0 : wordMatch(word, other);
      if (match > best) [at, best] = [i, match];
    });
    if (at >= 0) {
      used.add(at);
      found += best;
      if (best === 1) exact++;
    } else if (/\p{Nd}/u.test(word)) numberMissed = true;
  }
  let score =
    0.6 * (found / query.length) +
    0.25 * (used.size / words.length) +
    0.15 * pairsAlike(compact(pasted), compact(recordName));
  // Every word on both sides, as near as typed: this is the name, with a slip in it.
  if (used.size === words.length && used.size === query.length && found > exact) score += 0.1;
  // A number the name has too, but a different one: another material.
  const otherNumber = numberMissed && words.some((word) => /\p{Nd}/u.test(word) && !query.includes(word));
  return otherNumber ? score * 0.5 : score;
}

module.exports = {
  PASTE_LIMITS,
  ambiguousNumbers,
  pasteTooLong,
  parsePaste,
  importAmounts,
  matchName,
  likeness,
  foldedName: folded,
  compactName: compact
};
