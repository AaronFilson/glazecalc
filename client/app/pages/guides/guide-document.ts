import { Lexer, Marked, type Token, type Tokens, type TokenizerExtension } from 'marked';

// A guide is a Markdown file per language (client/public/i18n/guides/<guide>/<language>.md),
// read here into what the page shows (guide-view.ts): its title and lead, and its
// sections, each a panel with its heading in the contents list. Whole documents
// translate better than scattered keys (docs/i18n-plan.md).
//
// Beyond Markdown (GitHub's, with tables):
//
//   ---                       front matter: the title and the line under it
//   title: Firing a basic kiln
//   lead: Cones, kiln sitters ...
//   ---
//   ## Cones {#cones}         a section, with the id its links and contents use
//   ## Cones {#cones lang=en} in a translation, a section still in English,
//                             waiting for its translation to be brought up to
//                             date (scripts/i18n-fingerprints.mjs); lang: en in
//                             the front matter does the same for the title,
//                             lead and anything before the first section
//   Table: Common ranges      the caption of the table that follows
//   > [!NOTE] / [!WARNING]    a callout, or a warning
//   Term                      a definition list (the glossary)
//   : What it means
//   {{2232 °F; 1222 °C}}      a temperature (or rate, or difference) in both
//                             scales, from the source: shown in the reader's
//                             scale, the other after it in brackets
//   {{SG 1.45}}               a glaze's density as specific gravity (or a range,
//                             1.43–1.45): shown as the reader measures it, by
//                             specific gravity, degrees Baumé or pint weight
//   {{en: frit}}              in a translation, the English for the term before
//                             it, shown to readers who ask for English terms
//   :::orton ... :::          shown only to those who fire to cones;
//   :::temperature ... :::    only to those who fire by temperature
//   ::poison-lines            who to call, for the reader's region; likewise
//   ::shops                   where to buy glaze materials,
//   ::silica-limit            the workplace limit for silica dust,
//   ::food-limits             the limits for ceramic ware in contact with food,
//   ::local-equivalents       and the materials sold there closest to those
//                             sold elsewhere (lib/regions)

export interface GuideSection {
  id: string;
  /** 'en' for a section of a translation still in English. */
  language: string | null;
  heading: Token[];
  /** The heading as text, for the contents list. */
  label: string;
  blocks: Token[];
}

export interface Guide {
  title: string;
  lead: string;
  /** 'en' where the title, lead and intro of a translation are still in English. */
  language: string | null;
  /** Anything before the first section. */
  intro: Token[];
  sections: GuideSection[];
}

/** A definition list: lines of terms, each followed by lines starting ": ". */
export interface DefinitionList {
  type: 'definitions';
  raw: string;
  items: Array<{ term: Token[]; definition: Token[] }>;
}

const definitions: TokenizerExtension = {
  name: 'definitions',
  level: 'block',
  start: (src) => src.match(/^[^\n]+\n: /m)?.index,
  tokenizer(src) {
    const match = /^(?:[^\n]+\n(?:: [^\n]+\n?)+\n*)+/.exec(src);
    if (!match) return undefined;
    const items: DefinitionList['items'] = [];
    for (const entry of match[0].trim().split(/\n(?=[^:\n][^\n]*\n: )/)) {
      const [term, ...lines] = entry.split('\n');
      items.push({
        term: this.lexer.inlineTokens(term!),
        definition: this.lexer.inlineTokens(lines.map((line) => line.replace(/^: /, '')).join(' '))
      });
    }
    return { type: 'definitions', raw: match[0], items } as unknown as Tokens.Generic;
  }
};

const markdown = new Marked({ gfm: true, extensions: [definitions] });

/** The guide's text for the reader's cone system, the other's parts left out. */
export function forConeSystem(text: string, cones: 'orton' | 'temperature'): string {
  return text.replace(/^:::(orton|temperature)\n([\s\S]*?)^:::\n?/gm, (_, system: string, body: string) =>
    system === cones ? body : ''
  );
}

const plain = (tokens: Token[]): string =>
  tokens
    .map((token) => ('tokens' in token && token.tokens ? plain(token.tokens) : 'text' in token ? token.text : ''))
    .join('');

/** Reads a guide's Markdown. */
export function readGuide(text: string): Guide {
  const front = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const meta = Object.fromEntries(
    (front?.[1] ?? '').split('\n').map((line) => {
      const at = line.indexOf(':');
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    })
  );
  const tokens = markdown.lexer(front ? text.slice(front[0].length) : text);
  const guide: Guide = {
    title: meta['title'] ?? '',
    lead: meta['lead'] ?? '',
    language: meta['lang'] || null,
    intro: [],
    sections: []
  };
  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 2) {
      const id = /\s*\{#([\w-]+)( lang=en)?\}\s*$/.exec(token.text);
      const heading = withoutId(token.tokens ?? []);
      const language = id?.[2] ? 'en' : null;
      guide.sections.push({ id: id?.[1] ?? '', language, heading, label: plain(heading).trim(), blocks: [] });
    } else if (token.type !== 'space') {
      (guide.sections.at(-1)?.blocks ?? guide.intro).push(token);
    }
  }
  return guide;
}

/** A heading's tokens without its {#id}. */
function withoutId(tokens: Token[]): Token[] {
  const last = tokens.at(-1);
  if (last?.type !== 'text') return tokens;
  return [...tokens.slice(0, -1), { ...last, text: last.text.replace(/\s*\{#[\w-]+(?: lang=en)?\}\s*$/, '') } as Token];
}

// ---- What the page draws ----

/** A temperature, rate or difference as the source gives it in one scale: 998–1063 °C. */
export interface Reading {
  from: number;
  to: number | null;
  unit: string;
}

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'temperature'; fahrenheit: Reading; celsius: Reading }
  | { kind: 'density'; from: number; to: number | null }
  | { kind: 'english'; text: string }
  | { kind: 'strong' | 'em'; content: Inline[] }
  | { kind: 'code'; text: string }
  | { kind: 'link'; href: string; content: Inline[] }
  | { kind: 'break' };

export type Block =
  | { kind: 'paragraph'; content: Inline[] }
  /** A tight list item's text, with no paragraph around it. */
  | { kind: 'text'; content: Inline[] }
  | { kind: 'heading'; level: number; id: string; content: Inline[] }
  | { kind: 'list'; ordered: boolean; sources: boolean; items: Block[][] }
  | {
      kind: 'table';
      caption: Inline[];
      /** A short name for its scrolling box, where the caption is long (a Label: line); else the caption. */
      label: string | null;
      head: Inline[][];
      rows: Inline[][][];
      numeric: boolean[];
    }
  | { kind: 'callout'; tone: 'note' | 'warning'; blocks: Block[] }
  | { kind: 'definitions'; items: Array<{ term: Inline[]; definition: Inline[] }> }
  | { kind: RegionBlock }
  | { kind: 'rule' };

/** Parts of a guide drawn from data for the reader's region, each a line ::name of its own. */
export const REGION_BLOCKS = ['poison-lines', 'shops', 'silica-limit', 'food-limits', 'local-equivalents'] as const;
export type RegionBlock = (typeof REGION_BLOCKS)[number];
const isRegionBlock = (name: string): name is RegionBlock => (REGION_BLOCKS as readonly string[]).includes(name);

const READING = /^\s*(\d[\d,.]*)(?:\s*[–-]\s*(\d[\d,.]*))?\s*(°[CF](?:\/h)?)\s*$/;
const number = (text: string): number => Number(text.replace(/,/g, ''));

function reading(text: string): Reading | null {
  const match = READING.exec(text);
  return match ? { from: number(match[1]!), to: match[2] ? number(match[2]) : null, unit: match[3]! } : null;
}

/** What a {{...}} holds: a temperature in both scales, a density, or an English term. */
function token(inside: string): Inline | null {
  const density = /^SG\s+(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?$/.exec(inside.trim());
  if (density) return { kind: 'density', from: Number(density[1]), to: density[2] ? Number(density[2]) : null };
  const english = /^en:\s*(.+)$/.exec(inside.trim());
  if (english) return { kind: 'english', text: english[1]!.trim() };
  const [first, second] = inside.split(';').map(reading);
  const fahrenheit = [first, second].find((r) => r?.unit.startsWith('°F'));
  const celsius = [first, second].find((r) => r?.unit.startsWith('°C'));
  return fahrenheit && celsius ? { kind: 'temperature', fahrenheit, celsius } : null;
}

/** Text with {{...}} in it, as text and what each holds. */
function textWithTokens(text: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(/\{\{([^}]+)\}\}/g)) {
    const part = token(match[1]!);
    if (!part) continue;
    if (match.index > last) parts.push({ kind: 'text', text: text.slice(last, match.index) });
    parts.push(part);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}

export function inlines(tokens: readonly Token[]): Inline[] {
  return tokens.flatMap((token): Inline[] => {
    switch (token.type) {
      case 'strong':
      case 'em':
        return [{ kind: token.type, content: inlines(token.tokens ?? []) }];
      case 'codespan':
        return [{ kind: 'code', text: token.text }];
      case 'link':
        return [{ kind: 'link', href: token.href, content: inlines(token.tokens ?? []) }];
      case 'br':
        return [{ kind: 'break' }];
      case 'text':
        return token.tokens ? inlines(token.tokens) : textWithTokens(token.text);
      case 'escape':
        return [{ kind: 'text', text: token.text }];
      default:
        return 'text' in token ? textWithTokens(String(token.text)) : [];
    }
  });
}

/** A section's or callout's Markdown blocks as what the page draws. */
export function blocks(tokens: readonly Token[], sectionId = ''): Block[] {
  const out: Block[] = [];
  let caption: { content: Inline[]; label: string | null } | null = null;
  for (const token of tokens) {
    switch (token.type) {
      case 'paragraph': {
        const text = token.text.trim();
        const name = /^::([\w-]+)$/.exec(text)?.[1];
        if (name && isRegionBlock(name)) {
          out.push({ kind: name });
        } else if (text.startsWith('Table: ')) {
          const [line, labelLine] = text.split('\n');
          caption = {
            content: inlines(Lexer.lexInline(line!.slice('Table: '.length).trim())),
            label: labelLine?.startsWith('Label: ') ? labelLine.slice('Label: '.length).trim() : null
          };
        } else {
          out.push({ kind: 'paragraph', content: inlines(token.tokens ?? []) });
        }
        break;
      }
      case 'heading': {
        const id = /\s*\{#([\w-]+)\}\s*$/.exec(token.text)?.[1] ?? '';
        out.push({ kind: 'heading', level: token.depth, id, content: inlines(withoutId(token.tokens ?? [])) });
        break;
      }
      case 'list':
        out.push({
          kind: 'list',
          ordered: token.ordered,
          sources: sectionId === 'sources',
          items: (token.items as Tokens.ListItem[]).map((item) =>
            item.tokens.flatMap((part): Block[] =>
              part.type === 'text'
                ? [{ kind: 'text', content: inlines(part.tokens ?? [part]) }]
                : blocks([part], sectionId)
            )
          )
        });
        break;
      case 'table': {
        const table = token as Tokens.Table;
        out.push({
          kind: 'table',
          caption: caption?.content ?? [],
          label: caption?.label ?? null,
          head: table.header.map((cell) => inlines(cell.tokens)),
          rows: table.rows.map((row) => row.map((cell) => inlines(cell.tokens))),
          numeric: table.align.map((align) => align === 'right')
        });
        caption = null;
        break;
      }
      case 'blockquote': {
        const inner = [...(token.tokens ?? [])];
        const first = inner[0];
        let tone: 'note' | 'warning' = 'note';
        if (first?.type === 'paragraph') {
          const marker = /^\[!(NOTE|WARNING)\]\s*/.exec(first.text);
          if (marker) {
            tone = marker[1] === 'WARNING' ? 'warning' : 'note';
            const rest = first.text.slice(marker[0].length);
            inner[0] = { ...first, text: rest, tokens: Lexer.lexInline(rest) } as Token;
          }
        }
        out.push({ kind: 'callout', tone, blocks: blocks(inner, sectionId) });
        break;
      }
      case 'definitions': {
        const list = token as unknown as DefinitionList;
        out.push({
          kind: 'definitions',
          items: list.items.map((item) => ({ term: inlines(item.term), definition: inlines(item.definition) }))
        });
        break;
      }
      case 'hr':
        out.push({ kind: 'rule' });
        break;
    }
  }
  return out;
}
