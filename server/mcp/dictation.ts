// The studio notes skill, glazecalc-dictation (skills/glazecalc-dictation;
// docs/adr/0027-dictation-skill.md), served over MCP for assistants that take
// no skills: the prompt dictation (the skill's instructions, its references
// attached, and the person's notes when given) and the resource
// glazecalc://skills/glazecalc-dictation (the skill's files in one, for
// clients that read resources but show no prompts). Both are read from the
// skill's own folder, the one source, as glaze_course_lesson reads its guide;
// the site serves the same folder as a ZIP to install (scripts/build-skills.mjs).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as z from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';

/** The skill's name: its folder, its SKILL.md's name, and the ZIP's. Permanent once people install it. */
export const SKILL_NAME = 'glazecalc-dictation';
export const SKILL_DIR = path.join(import.meta.dirname, '..', '..', 'skills', SKILL_NAME);
export const SKILL_URI = 'glazecalc://skills/' + SKILL_NAME;
/** Its references, in the order SKILL.md names them. */
export const SKILL_REFERENCES = ['references/records.md', 'references/numbers-and-units.md', 'references/examples.md'];

export interface Skill {
  /** SKILL.md's frontmatter: its top-level values, and metadata's. */
  frontmatter: Record<string, string>;
  metadata: Record<string, string>;
  /** SKILL.md after its frontmatter. */
  body: string;
  /** Each file, by its path in the folder, SKILL.md first. */
  files: Array<{ path: string; text: string }>;
}

const unquoted = (value: string): string => value.trim().replace(/^(["'])(.*)\1$/, '$2');

/**
 * The frontmatter of a SKILL.md: `key: value` lines, and one level of
 * `key:` followed by indented `key: value` lines (metadata). That is all the
 * Agent Skills format uses.
 */
export const frontmatterOf = (
  text: string
): { values: Record<string, string>; maps: Record<string, Record<string, string>>; body: string } | null => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return null;
  const values: Record<string, string> = {};
  const maps: Record<string, Record<string, string>> = {};
  let open: Record<string, string> | null = null;
  for (const line of match[1]!.split(/\r?\n/)) {
    const nested = /^\s+([\w-]+):\s*(.*)$/.exec(line);
    if (nested && open) {
      open[nested[1]!] = unquoted(nested[2]!);
      continue;
    }
    const top = /^([\w-]+):\s*(.*)$/.exec(line);
    if (!top) continue;
    if (top[2] === '') {
      open = maps[top[1]!] = {};
    } else {
      open = null;
      values[top[1]!] = unquoted(top[2]!);
    }
  }
  return { values, maps, body: text.slice(match[0].length) };
};

let cached: Skill | null = null;

/** The skill, read once from its folder. */
export const readSkill = (): Skill => {
  if (cached) return cached;
  const read = (file: string) => readFileSync(path.join(SKILL_DIR, file), 'utf8');
  const main = read('SKILL.md');
  const parsed = frontmatterOf(main);
  if (!parsed) throw new Error('skills/' + SKILL_NAME + '/SKILL.md has no frontmatter');
  cached = {
    frontmatter: parsed.values,
    metadata: parsed.maps.metadata ?? {},
    body: parsed.body.trim(),
    files: [{ path: 'SKILL.md', text: main }, ...SKILL_REFERENCES.map((file) => ({ path: file, text: read(file) }))]
  };
  return cached;
};

/** The skill's files in one Markdown text, each under a line naming it. */
export const skillMarkdown = (): string =>
  readSkill()
    .files.map((file) => `<!-- ${SKILL_NAME}/${file.path} -->\n\n${file.text.trim()}\n`)
    .join('\n---\n\n');

/** What the person means to dictate, as the prompt's kind names it. */
const KINDS = {
  any: '',
  recipe: 'I want to dictate a recipe.',
  firing: 'I want to log a firing as it goes.',
  tiles: 'I want to save test tile results from a firing.',
  materials: 'I want to note the materials I have.'
} as const;

const user = (text: string) => ({ role: 'user' as const, content: { type: 'text' as const, text } });

export const registerDictation = (server: McpServer): void => {
  server.registerPrompt(
    'dictation',
    {
      title: 'Dictate studio notes',
      description:
        'Turns what you say or type while you work (recipes, firing logs, test tile results, notes) into Glazecalc records: the assistant reads each back and saves only after your yes. Saving needs your account connected with permission to change records.',
      argsSchema: z.object({
        kind: z
          .enum(['any', 'recipe', 'firing', 'tiles', 'materials'])
          .optional()
          .describe('What you mean to dictate: any, recipe, firing, tiles (test tile results) or materials.'),
        notes: z
          .string()
          .max(20000)
          .optional()
          .describe('What you said or typed already, to sort and read back before anything is saved.'),
        language: z.string().max(20).optional().describe('The language to talk in, as a BCP 47 tag ("en", "de", "ja").')
      })
    },
    ({ kind, notes, language }) => {
      const skill = readSkill();
      const focus = KINDS[kind ?? 'any'];
      return {
        description: 'Dictate studio notes to Glazecalc',
        messages: [
          user(
            [
              'Help me keep my studio notes in Glazecalc, following these instructions.',
              '',
              skill.body,
              '',
              '---',
              '',
              focus,
              language
                ? `Talk to me in the language with the tag "${language}"; keep my own words as I said them.`
                : '',
              notes
                ? `Here is what I said, to sort and read back before saving anything:\n\n${notes}`
                : 'Start by calling get_my_settings, then tell me in a sentence how this works and wait for my notes.'
            ]
              .filter((line, i, all) => line !== '' || (i > 0 && all[i - 1] !== ''))
              .join('\n')
              .trim()
          ),
          ...skill.files.slice(1).map((file) => ({
            role: 'user' as const,
            content: {
              type: 'resource' as const,
              resource: { uri: `${SKILL_URI}/${file.path}`, mimeType: 'text/markdown', text: file.text }
            }
          }))
        ]
      };
    }
  );

  server.registerResource(
    'dictation-skill',
    SKILL_URI,
    {
      title: 'The studio notes skill',
      description:
        "The glazecalc-dictation skill's instructions and references, as Markdown: how an assistant turns a potter's dictated notes into Glazecalc records, reading each back and saving only after a clear yes. The same skill is a ZIP to install at https://glazecalcapp.com/downloads/glazecalc-dictation.zip.",
      mimeType: 'text/markdown'
    },
    (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: skillMarkdown() }] })
  );
};
