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

/** A unit by its id ("blending") or number ("5", "unit 5"); undefined for any other. */
export const findUnit = (asked: string): CourseUnit | undefined => {
  const wanted = asked.trim().toLowerCase();
  const number = /^(?:unit\s*)?(\d+)$/.exec(wanted)?.[1];
  return courseUnits().find((unit) => unit.id === wanted || (number !== undefined && unit.number === Number(number)));
};
