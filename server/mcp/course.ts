// The companion to John Britt's free online Glaze Course, as the MCP prompt
// glaze_course_lesson reads it. The one source is the English-only guide
// (client/public/i18n/guides/learn-with-john-britt/en.md): each section headed
// "Unit N: ..." is a unit, with his videos (### Watch, links to YouTube by the
// titles he gave them), the Glazecalc guide sections to read (### Read) and
// the exercises (### Try). A unit whose warning points to the safe mixing
// guide is lab work. His videos are only ever linked, never copied or retold.
import { readGuide } from './guides.ts';

/** The guide's id, in its address (/guides/learn-with-john-britt). */
export const COURSE_GUIDE = 'learn-with-john-britt';

export interface CourseVideo {
  /** His title, as he wrote it. */
  title: string;
  url: string;
}

export interface CourseUnit {
  /** The section's id: the unit's address on the site and its name in the prompt. */
  id: string;
  number: number;
  title: string;
  videos: CourseVideo[];
  /** The Glazecalc guide sections to read, by guide and section id. */
  reads: Array<{ guide: string; section: string; title: string }>;
  exercises: string[];
  /** Weighing, mixing or firing: the safe mixing guide comes first. */
  lab: boolean;
}

const UNIT = /^Unit (\d+): (.+)$/;
const VIDEO = /\[([^\]]+)\]\((https:\/\/www\.youtube\.com\/watch\?v=[\w-]+)\)/g;
const READ = /\[([^\]]+)\]\(\/guides\/([\w-]+)#([\w-]+)\)/g;

/** A unit's part under one ### heading (Watch, Read or Try), up to the next. */
const part = (text: string, heading: string): string => {
  const at = text.indexOf(`### ${heading}\n`);
  if (at < 0) return '';
  const rest = text.slice(at + heading.length + 5);
  const end = rest.search(/^### /m);
  return end < 0 ? rest : rest.slice(0, end);
};

/** The units of the course, in order, from the English guide; none when it cannot be read. */
export const courseUnits = (): CourseUnit[] => {
  const guide = readGuide(COURSE_GUIDE, 'en');
  if (!guide) return [];
  const units: CourseUnit[] = [];
  for (const section of guide.sections) {
    const unit = UNIT.exec(section.heading);
    if (!unit) continue;
    units.push({
      id: section.id,
      number: Number(unit[1]),
      title: unit[2]!.trim(),
      videos: [...part(section.text, 'Watch').matchAll(VIDEO)].map(([, title, url]) => ({ title: title!, url: url! })),
      reads: [...part(section.text, 'Read').matchAll(READ)].map(([, title, guideId, id]) => ({
        guide: guideId!,
        section: id!,
        title: title!
      })),
      exercises: part(section.text, 'Try')
        .split('\n')
        .map((line) => /^\d+\.\s+(.*)$/.exec(line.trim())?.[1])
        .filter((line): line is string => !!line),
      lab: /\[!WARNING\][\s\S]*?\/guides\/safe-mixing/.test(section.text)
    });
  }
  return units;
};

/** Every video the guide links, in any section: his titles and addresses. */
export const courseVideos = (): CourseVideo[] => {
  const guide = readGuide(COURSE_GUIDE, 'en');
  if (!guide) return [];
  return guide.sections.flatMap((section) =>
    [...section.text.matchAll(VIDEO)].map(([, title, url]) => ({ title: title!, url: url! }))
  );
};

/**
 * Words that point a free topic at a unit, by the unit's id: the start of a word in the topic matches
 * ("blend" matches "blends" and "blending"). Kept to words that belong to one unit, so a topic is not
 * sent to a unit, and its videos, it has little to do with.
 */
export const UNIT_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  'unity-formula': ['unity', 'umf', 'seger', 'molecular formula', 'batch to formula'],
  'limits-and-stull': ['limit', 'stull', 'matte', 'gloss', 'silica to alumina', 'si:al', 'craz'],
  oxides: ['oxide', 'flux', 'boron', 'alumina', 'opacif', 'r2o', 'alkali'],
  'color-in-bases': ['color', 'colour', 'colorant', 'colourant', 'copper', 'chrome', 'burgundy', 'cobalt', 'iron red'],
  blending: ['blend', 'triaxial', 'biaxial', 'progression', 'currie', 'grid test', 'line blend', 'ingredient'],
  'test-tiles-and-melt': ['test tile', 'melt test', 'melt fluidity', 'extrud'],
  'slurry-and-application': ['slurry', 'specific gravity', 'thickness', 'applica', 'floccul', 'deflocc', 'dipping'],
  'recipes-and-substitutes': ['substitut', 'gerstley', 'discontinu', 'hansen', '5x20', '5 x 20', 'recipe origin'],
  'special-surfaces': ['shino', 'crater', 'oil spot', 'oilspot', 'rust', 'sculptural', 'crawl'],
  'raw-materials': ['geology', 'rock', 'mineral', 'raw material', 'feldspar'],
  clay: ['clay', 'slip', 'clay body', 'nerikomi', 'neriage'],
  firing: ['firing', 'kiln', 'reduction', 'oxidation', 'cone', 'fire']
};

const plainTopic = (text: string): string =>
  text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * The course unit a free topic ("why does my glaze craze?", "line blends", "unit 3") is about, or undefined
 * when none is: by the unit's id or number (findUnit), by its title, then by the unit whose keywords the topic
 * starts the most words with (the earlier unit on a tie). Undefined means no video is linked: the teach_me
 * prompt never guesses one.
 */
export const matchTopic = (topic: string, units: CourseUnit[] = courseUnits()): CourseUnit | undefined => {
  const asked = plainTopic(topic);
  if (!asked) return undefined;
  const number = /^(?:unit\s*)?(\d+)$/.exec(asked)?.[1];
  const exact = units.find(
    (unit) =>
      unit.id === asked || plainTopic(unit.title) === asked || (number !== undefined && unit.number === Number(number))
  );
  if (exact) return exact;
  const titled = units.find((unit) => asked.includes(plainTopic(unit.title)));
  if (titled) return titled;
  let best: CourseUnit | undefined;
  let bestScore = 0;
  for (const unit of units) {
    const score = (UNIT_KEYWORDS[unit.id] ?? []).filter((word) =>
      new RegExp(`(^|[^\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(asked)
    ).length;
    if (score > bestScore) {
      best = unit;
      bestScore = score;
    }
  }
  return best;
};

/** A unit by its id ("blending") or number ("5", "unit 5"); undefined for any other. */
export const findUnit = (asked: string): CourseUnit | undefined => {
  const wanted = asked.trim().toLowerCase();
  const number = /^(?:unit\s*)?(\d+)$/.exec(wanted)?.[1];
  return courseUnits().find((unit) => unit.id === wanted || (number !== undefined && unit.number === Number(number)));
};
