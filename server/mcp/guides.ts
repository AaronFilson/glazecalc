// The guides, as the MCP server gives them (docs/integrations-plan.md, items
// 20 and 21): the same Markdown the site shows (client/public/i18n/guides/
// <guide>/<language>.md, read from the built client where there is one), cut
// into its sections, made plain for an assistant, and searched. A guide not
// translated into a language is given in English; a section still waiting for
// its translation (## Heading {#id lang=en}) says it is in English.
//
// What the site draws for the reader (client/app/pages/guides/guide-document.ts)
// is settled here once for everyone: temperatures in both scales as the source
// gives them, a glaze's density as specific gravity, the parts for Orton cones
// (or, when asked, SK cones or firing by temperature), and in place of the parts
// drawn from data for the reader's country, a line saying the website has them.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import languages from '../../lib/regions/languages.js';
import { PUBLIC_PAGES } from '../../lib/pages.js';
import * as site from '../lib/site.ts';
import { languageOf, PLACES } from './words.ts';

/** The guides, by the id in their address (/guides/firing). */
export const GUIDE_IDS: readonly string[] = PUBLIC_PAGES.filter((page) => page.startsWith('/guides/')).map((page) =>
  page.slice('/guides/'.length)
);

export type ConeSystem = 'orton' | 'sk' | 'temperature';
export const CONE_SYSTEMS: readonly ConeSystem[] = ['orton', 'sk', 'temperature'];

export interface GuideSection {
  id: string;
  heading: string;
  /** The section's text, made plain: Markdown with the site's own marks settled. */
  text: string;
  /** The language the section is in: the guide's, or 'en' where its translation is waiting. */
  language: string;
}

export interface Guide {
  id: string;
  title: string;
  lead: string;
  /** The app language asked for: the guide's address and resource are in it. */
  asked: string;
  /** Whether there is a translation in that language; when not, the guide is in English. */
  translated: boolean;
  /** The language its title, lead and intro are in: the one asked for, or 'en'. */
  language: string;
  intro: string;
  sections: GuideSection[];
}

// The parts of a guide drawn from data for the reader's country (REGION_BLOCKS in guide-document.ts).
const REGION_LINES: Record<string, string> = {
  'poison-lines': 'who to call for poison advice in your country',
  shops: 'where to buy glaze materials in your country',
  'silica-limit': "your country's workplace limit for silica dust",
  'food-limits': "your country's limits for ceramic ware that touches food",
  'local-equivalents': 'the materials sold in your country closest to those named here'
};

/** A guide's Markdown in a language, or null when there is none. */
const markdownOf = (id: string, language: string): string | null => {
  if (!GUIDE_IDS.includes(id)) return null;
  for (const place of PLACES) {
    try {
      return readFileSync(path.join(place, 'guides', id, language + '.md'), 'utf8').replace(/\r\n/g, '\n');
    } catch {
      // Not built yet, or not translated: the next place.
    }
  }
  return null;
};

/** The text for one cone system, the others' parts left out, as the site shows it (forConeSystem). */
export const forCones = (text: string, cones: ConeSystem): string => {
  const has = (system: string) => new RegExp(`^:::${system}$`, 'm').test(text);
  const shown = cones === 'sk' && !has('sk') ? 'temperature' : cones;
  return text.replace(/^:::(orton|sk|temperature)\n([\s\S]*?)^:::\n?/gm, (_all, system: string, body: string) =>
    system === shown ? body : ''
  );
};

/** The site's own marks made plain: temperatures, densities, English terms and the parts by country. */
export const plainMarks = (text: string, address: string): string =>
  text
    // {{en: frit}}: the English for the term before it, for readers who ask for English terms.
    .replace(/\s*\{\{en:\s*([^}]*)\}\}/g, ' ($1)')
    // {{2232 °F; 1222 °C}}: both scales, as the source gives them.
    .replace(/\{\{([^};]+);\s*([^}]+)\}\}/g, '$1 ($2)')
    // {{SG 1.45}}: specific gravity.
    .replace(/\{\{([^}]+)\}\}/g, '$1')
    .replace(/^::([\w-]+)\s*$/gm, (line, name: string) =>
      REGION_LINES[name] ? `(The guide on the website shows ${REGION_LINES[name]}: ${address})` : ''
    )
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** A guide's address on the site, in a language, perhaps at a section. */
export const guideUrl = (id: string, language: string, section?: string): string =>
  site.siteUrl() + languages.languagePrefix(language) + '/guides/' + id + (section ? '#' + section : '');

/**
 * The guides read so far, most recently used last. Only real guides, in an
 * app language and a cone system, are kept (a miss never is), and at most
 * MOST_CACHED of them: the oldest goes first.
 */
export const MOST_CACHED = 64;
const cache = new Map<string, Guide>();

/** How many guides are kept now (the tests). */
export const cachedGuides = (): number => cache.size;

/**
 * A guide in the language asked for (an app language, else English), for a
 * cone system (Orton unless asked), or null when there is no such guide.
 */
export const readGuide = (id: string, asked?: string, cones: ConeSystem = 'orton'): Guide | null => {
  // Checked before the cache is touched, so what a caller sends never becomes a key.
  if (!GUIDE_IDS.includes(id)) return null;
  const wanted = languageOf(asked);
  const system: ConeSystem = CONE_SYSTEMS.includes(cones) ? cones : 'orton';
  const key = [id, wanted, system].join('/');
  const kept = cache.get(key);
  if (kept) {
    cache.delete(key);
    cache.set(key, kept);
    return kept;
  }
  let language = wanted;
  let source = markdownOf(id, language);
  if (source === null && language !== 'en') {
    language = 'en';
    source = markdownOf(id, language);
  }
  if (source === null) return null;
  const front = /^---\n([\s\S]*?)\n---\n/.exec(source);
  const meta = Object.fromEntries(
    (front?.[1] ?? '').split('\n').map((line) => {
      const at = line.indexOf(':');
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    })
  );
  const body = forCones(front ? source.slice(front[0].length) : source, system);
  const address = guideUrl(id, wanted);
  const parts = body.split(/^## /m);
  const sections: GuideSection[] = [];
  for (const part of parts.slice(1)) {
    const end = part.indexOf('\n');
    const headingLine = end < 0 ? part : part.slice(0, end);
    const mark = /\s*\{#([\w-]+)( lang=en)?\}\s*$/.exec(headingLine);
    if (!mark) continue;
    sections.push({
      id: mark[1]!,
      heading: headingLine.slice(0, mark.index).trim(),
      text: plainMarks(end < 0 ? '' : part.slice(end + 1), guideUrl(id, wanted, mark[1])),
      language: mark[2] ? 'en' : language
    });
  }
  const guide: Guide = {
    id,
    asked: wanted,
    translated: language === wanted,
    title: meta['title'] ?? id,
    lead: meta['lead'] ?? '',
    language: meta['lang'] === 'en' ? 'en' : language,
    intro: plainMarks(parts[0] ?? '', address),
    sections
  };
  cache.set(key, guide);
  if (cache.size > MOST_CACHED) cache.delete(cache.keys().next().value!);
  return guide;
};

/** A whole guide as Markdown, with where it comes from. */
export const guideMarkdown = (guide: Guide): string =>
  [
    `# ${guide.title}`,
    guide.lead,
    `Source: ${guideUrl(guide.id, guide.asked)}`,
    guide.intro,
    ...guide.sections.map((section) => sectionMarkdown(guide, section, false))
  ]
    .filter(Boolean)
    .join('\n\n');

/** One section as Markdown; on its own, with the guide's title and where it comes from. */
export const sectionMarkdown = (guide: Guide, section: GuideSection, alone = true): string =>
  [
    alone ? `# ${guide.title}` : '',
    `## ${section.heading}`,
    alone ? `Source: ${guideUrl(guide.id, guide.asked, section.id)}` : '',
    section.text
  ]
    .filter(Boolean)
    .join('\n\n');

// ---- Searching ----

/** Text as compared: no case, no accents, Markdown's marks as spaces. */
const folded = (text: string): string =>
  text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[*_`#>|[\]()]/g, ' ');

/** Plain words for an excerpt: no Markdown marks, links as their text, on one line. */
export const plainText = (markdown: string): string =>
  markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^>\s?\[![A-Z]+\]\s*$/gm, '')
    .replace(/^\s*(?:#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/^\|?[\s:|-]+\|[\s:|-]*$/gm, '')
    .replace(/\|/g, ' ')
    .replace(/[*_`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** A long Latin-script word without a common ending, so "crawling" finds "crawl" and "crazed" finds "crazing". */
const stem = (word: string): string => {
  const cut = /^([a-z]{4,}?)(?:ing|ed|es|s)$/.exec(word);
  return cut ? cut[1]! : word;
};

/**
 * The words of a query: split on spaces and punctuation, each without a
 * common ending; a query with none (Chinese, Japanese) is one term.
 */
export const termsOf = (query: string): string[] => {
  const words = folded(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 1 || /\p{N}/u.test(word))
    .map(stem);
  const unique = [...new Set(words)];
  return unique.length ? unique.slice(0, 12) : [folded(query).trim()].filter(Boolean);
};

const count = (haystack: string, needle: string): number => {
  let n = 0;
  for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + needle.length)) n++;
  return n;
};

/** About `size` characters of the text around the first place a term is found, cut at words. */
export const excerptOf = (text: string, terms: string[], size = 240): string => {
  const plain = plainText(text);
  const lower = folded(plain);
  const hits = terms.map((term) => lower.indexOf(term)).filter((at) => at >= 0);
  const at = hits.length ? Math.min(...hits) : 0;
  let start = Math.max(0, at - Math.floor(size / 3));
  let end = Math.min(plain.length, start + size);
  if (start > 0) {
    const space = plain.indexOf(' ', start);
    start = space >= 0 && space < at ? space + 1 : start;
  }
  if (end < plain.length) {
    const space = plain.lastIndexOf(' ', end);
    end = space > start + size / 2 ? space : end;
  }
  return (start > 0 ? '…' : '') + plain.slice(start, end).trim() + (end < plain.length ? '…' : '');
};

export interface GuideHit {
  guide: string;
  guideTitle: string;
  section: string;
  heading: string;
  language: string;
  excerpt: string;
  url: string;
  resource: string;
  score: number;
}

/** A section's resource URI: glazecalc://guides/<language>/<guide>/<section>. */
export const sectionUri = (language: string, guide: string, section?: string): string =>
  `glazecalc://guides/${language}/${guide}` + (section ? '/' + section : '');

/**
 * The guides' sections that best match the query, in one language: each term
 * counted in the heading (five times over), the guide's title (twice) and the
 * text, a section with every term ahead of one with some.
 */
const searchIn = (
  query: string,
  language: string,
  cones: ConeSystem,
  guides: readonly string[],
  shownIn: string
): GuideHit[] => {
  const terms = termsOf(query);
  if (!terms.length) return [];
  const hits: GuideHit[] = [];
  for (const id of guides) {
    const guide = readGuide(id, language, cones);
    if (!guide || !guide.translated) continue;
    const title = folded(guide.title);
    for (const section of guide.sections) {
      const heading = folded(section.heading);
      const text = folded(section.text);
      let score = 0;
      let found = 0;
      for (const term of terms) {
        const here = count(heading, term) * 5 + count(title, term) * 2 + count(text, term);
        if (here) found++;
        score += here;
      }
      if (!found) continue;
      if (found === terms.length) score += 100;
      // A list of sources names every subject: it comes after the sections that explain one.
      if (section.id === 'sources') score = Math.floor(score / 4);
      hits.push({
        guide: id,
        guideTitle: guide.title,
        section: section.id,
        heading: section.heading,
        language: section.language,
        excerpt: excerptOf(section.text, terms),
        url: guideUrl(id, shownIn, section.id),
        resource: sectionUri(language, id, section.id),
        score
      });
    }
  }
  return hits.sort((a, b) => b.score - a.score);
};

/**
 * Searches the guides in the language asked for (an app language, else
 * English); where a language finds nothing, or has no guides yet, the English
 * ones are searched, and the hits say they are in English.
 */
export const searchGuides = (
  query: string,
  options: { language?: string; cones?: ConeSystem; guide?: string; limit?: number } = {}
): { language: string; hits: GuideHit[] } => {
  const language = languageOf(options.language);
  const cones = options.cones ?? 'orton';
  const guides = options.guide ? GUIDE_IDS.filter((id) => id === options.guide) : GUIDE_IDS;
  const limit = options.limit ?? 5;
  let hits = searchIn(query, language, cones, guides, language);
  let searched = language;
  if (!hits.length && language !== 'en') {
    hits = searchIn(query, 'en', cones, guides, language);
    searched = 'en';
  }
  return { language: searched, hits: hits.slice(0, limit) };
};
