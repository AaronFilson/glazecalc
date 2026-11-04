// Prompts a person can pick in their assistant (docs/integrations-plan.md,
// item 21): ready-made requests that lead the assistant through Glazecalc's
// tools for four common jobs. Diagnosing a glaze fault, making a recipe
// lead-free, replacing discontinued materials, and explaining a recipe to a
// new potter; and, for learning, what one material does in a glaze and a
// lesson from the companion to John Britt's free glaze course. Each says which tools to use and what to be careful about; the fault
// diagnosis carries the guides' section on glaze defects with it, and a lesson
// the guide sections its unit points to. The requests are in English, as the
// tools' descriptions are, and ask for the answer in the person's language.
import * as z from 'zod';
import { completable, type McpServer } from '@modelcontextprotocol/server';
import { BRITT_RULE, COURSE_GUIDE, courseUnits, findUnit, matchTopic } from './course.ts';
import {
  GUIDE_IDS,
  type Guide,
  type GuideSection,
  readGuide,
  searchGuides,
  sectionMarkdown,
  sectionUri
} from './guides.ts';
import { searchLibrary } from './library.ts';

/** The faults the diagnosis offers by name; any other is taken as written. */
export const FAULTS = [
  'crawling',
  'crazing',
  'shivering',
  'pinholing',
  'blistering',
  'running',
  'dunting',
  'dry or underfired surface',
  'color not as expected'
] as const;

const recipeArg = z
  .string()
  .min(1)
  .max(4000)
  .describe(
    'The recipe, one material and amount per line or comma separated, such as "Custer Spar 40, Silica 30, Whiting 20, EPK 10".'
  );
const coneArg = z
  .string()
  .max(40)
  .optional()
  .describe('The firing: a cone ("6", "04", "SK 8") or a temperature ("1222 °C").');
const languageArg = z
  .string()
  .max(20)
  .optional()
  .describe('The language to answer in, as a BCP 47 tag ("en", "de", "ja").');

/** Where the person's language is said, for the request. */
const answerIn = (language: string | undefined): string =>
  language ? ` Answer in the language with the tag "${language}", and pass language: "${language}" to the tools.` : '';

const firingLine = (cone: string | undefined): string =>
  cone ? `It is fired to ${cone}.` : 'The firing is not given: ask for it if it matters.';

const SAFETY =
  'The limit checks are cautions from published limits, not proof that a glaze is safe: never call a glaze food safe, and advise a test firing on a test tile and, for surfaces that touch food or drink, a leach test by a laboratory.';

/** The safe mixing line for prompts that may lead to weighing and mixing, and to a material's hazards. */
const MIXING =
  'If the work leads to weighing and mixing dry materials, point me to the safe mixing guide first (dust, a fitted respirator, wet cleaning). If get_material lists hazards for a material, name them and point to /guides/safe-mixing#materials. ';

const user = (text: string) => ({ role: 'user' as const, content: { type: 'text' as const, text } });

/** A guide's section, attached to a request as an embedded resource. */
const attached = (guide: Guide, section: GuideSection) => ({
  role: 'user' as const,
  content: {
    type: 'resource' as const,
    resource: {
      uri: sectionUri(guide.asked, guide.id, section.id),
      mimeType: 'text/markdown',
      text: sectionMarkdown(guide, section)
    }
  }
});

/** A section of a guide in a language (English where it is not translated), or null. */
const sectionIn = (id: string, section: string, language: string | undefined) => {
  const guide = readGuide(id, language);
  const found = guide?.sections.find((s) => s.id === section);
  return guide && found ? attached(guide, found) : null;
};

/** The learner levels teach_me takes, and how each is spoken to. */
export const LEVELS = {
  new: 'I am new to glaze chemistry: use plain words, and no formula notation (unity formula figures, ratios) until I ask for it.',
  some: 'I know some glaze chemistry (what a flux, a glass former and a stabilizer are): explain the figures as you use them.',
  experienced:
    'I am experienced: use the unity formula, ratios and limits freely, and go into the chemistry where it helps.'
} as const;

/** The most guide sections teach_me attaches. */
const MOST_TEACH_SECTIONS = 2;

/** One blank line at most between parts. */
const lines = (parts: string[]): string =>
  parts.filter((line, i, all) => line !== '' || (i > 0 && all[i - 1] !== '')).join('\n');

export const registerPrompts = (server: McpServer): void => {
  server.registerPrompt(
    'diagnose_glaze_fault',
    {
      title: 'Diagnose a glaze fault',
      description:
        'Works out the likely causes of a fault (crawling, crazing, pinholing, shivering...) from the recipe, its unity formula and the firing, with the fixes to try first.',
      argsSchema: z.object({
        recipe: recipeArg,
        fault: completable(
          z.string().min(1).max(200).describe('What went wrong: crawling, crazing, pinholing, shivering, running...'),
          (value) => FAULTS.filter((fault) => fault.startsWith((value ?? '').toLowerCase()))
        ),
        cone: coneArg,
        details: z
          .string()
          .max(2000)
          .optional()
          .describe(
            'Anything else seen: the clay body, how thick it was applied, the firing schedule, a photo described.'
          ),
        language: languageArg
      })
    },
    ({ recipe, fault, cone, details, language }) => {
      const guide = readGuide('glazing-basics', language);
      const section = guide?.sections.find((s) => s.id === 'fit-and-defects');
      return {
        description: `Diagnose ${fault}`,
        messages: [
          user(
            [
              `My glaze shows ${fault}. Help me find out why and what to change.`,
              '',
              'Recipe:',
              recipe,
              '',
              firingLine(cone),
              details ? `What else I noticed: ${details}` : '',
              '',
              'Please:',
              '1. Find each material with search_materials, then run analyze_recipe for the unity formula, silica to alumina ratio and expansion, and check_limits with the firing.',
              `2. Look up ${fault} with search_guides, and read the section it gives when you need more.`,
              '3. Rank the likely causes, from the recipe (expansion, clay content, boron or alkali, alumina, the materials) and from application and firing, and say how sure you are of each.',
              '4. Give the first changes to try, smallest first, with amounts, and check a changed recipe with analyze_recipe and check_limits before suggesting it.',
              '5. Cite the guide sections you used by their addresses.',
              '',
              MIXING + SAFETY + answerIn(language)
            ]
              .filter((line, i, all) => line !== '' || all[i - 1] !== '')
              .join('\n')
          ),
          ...(guide && section
            ? [
                {
                  role: 'user' as const,
                  content: {
                    type: 'resource' as const,
                    resource: {
                      uri: sectionUri(guide.asked, guide.id, section.id),
                      mimeType: 'text/markdown',
                      text: sectionMarkdown(guide, section)
                    }
                  }
                }
              ]
            : [])
        ]
      };
    }
  );

  server.registerPrompt(
    'make_lead_free',
    {
      title: 'Make a recipe lead-free',
      description:
        'Rewrites an old recipe that uses lead (lead bisilicate, red or white lead, lead frits) without it, keeping its unity formula as near as lead-free materials allow.',
      argsSchema: z.object({
        recipe: recipeArg,
        cone: coneArg,
        region: z
          .string()
          .max(10)
          .optional()
          .describe('Where the materials are bought, so suggestions are ones sold there: US, UK, EU or AU.'),
        language: languageArg
      })
    },
    ({ recipe, cone, region, language }) => ({
      description: 'Make a recipe lead-free',
      messages: [
        user(
          [
            'This recipe uses lead. Help me make a lead-free version that melts and looks as close to it as possible.',
            '',
            'Recipe:',
            recipe,
            '',
            firingLine(cone),
            region ? `I buy materials in ${region}.` : '',
            '',
            'Please:',
            '1. Find each material with search_materials and get_material, and say which ones carry lead (PbO).',
            '2. Run analyze_recipe for the original unity formula.',
            '3. Replace the lead with boron and alkali fluxes, usually a boron frit, using suggest_substitutes (allowLead stays off) or by choosing frits with search_materials, and adjust the other materials so the unity formula, especially the fluxes, silica and alumina, stays as near as it can.',
            '4. Check the lead-free recipe with analyze_recipe and check_limits for the firing, and compare its expansion with the original: a change in expansion changes glaze fit.',
            '5. Say what will likely differ (color, surface, melt) and what to test.',
            '',
            'Mixing lead materials is a hazard in itself: advise the potter not to weigh out the old recipe, and to treat any lead material they still have as hazardous waste. ' +
              SAFETY +
              answerIn(language)
          ]
            .filter((line, i, all) => line !== '' || all[i - 1] !== '')
            .join('\n')
        )
      ]
    })
  );

  server.registerPrompt(
    'replace_discontinued',
    {
      title: 'Replace discontinued materials',
      description:
        'Finds the discontinued or scarce materials in a recipe (Custer Spar, Gerstley Borate, Albany Slip...) and rewrites it with materials sold today.',
      argsSchema: z.object({
        recipe: recipeArg,
        region: z.string().max(10).optional().describe('Where the materials are bought: US, UK, EU or AU.'),
        language: languageArg
      })
    },
    ({ recipe, region, language }) => ({
      description: 'Replace discontinued materials',
      messages: [
        user(
          [
            'Some materials in this recipe may no longer be sold. Help me remake it with ones I can buy.',
            '',
            'Recipe:',
            recipe,
            '',
            region ? `I buy materials in ${region}: pass region: "${region}".` : '',
            '',
            'Please run suggest_substitutes with the recipe, explain each swap and why its amounts changed, show the new recipe and how far its unity formula is from the original, and list the cautions it gives. If nothing is discontinued, say so. ' +
              SAFETY +
              answerIn(language)
          ]
            .filter((line, i, all) => line !== '' || all[i - 1] !== '')
            .join('\n')
        )
      ]
    })
  );

  server.registerPrompt(
    'explain_recipe',
    {
      title: 'Explain a recipe',
      description:
        'Explains a glaze recipe for a new potter: what each material does, what its unity formula says about how it will melt and look, and what to watch for.',
      argsSchema: z.object({ recipe: recipeArg, cone: coneArg, language: languageArg })
    },
    ({ recipe, cone, language }) => ({
      description: 'Explain a recipe',
      messages: [
        user(
          [
            'Explain this glaze recipe to me as to a new potter.',
            '',
            'Recipe:',
            recipe,
            '',
            firingLine(cone),
            '',
            'Please find each material with search_materials and get_material and say in a sentence what it brings (flux, glass former, stabilizer, colorant), run analyze_recipe and explain the unity formula and silica to alumina ratio in plain words (likely gloss or matte, how well it melts), run check_limits for the firing and explain any cautions, and point to the guides with search_guides for the words a beginner meets (unity formula, frit, specific gravity). ' +
              MIXING +
              SAFETY +
              answerIn(language)
          ].join('\n')
        )
      ]
    })
  );
  server.registerPrompt(
    'glaze_course_lesson',
    {
      title: "A lesson from John Britt's free glaze course",
      description:
        "Sets up one unit of Glazecalc's companion to John Britt's free online Glaze Course on YouTube: links to his videos by his titles, with credit, the Glazecalc guide sections to read (attached), and hands-on exercises with Glazecalc's tools, with your own recipe if you give one. " +
        BRITT_RULE,
      argsSchema: z.object({
        unit: completable(
          z
            .string()
            .min(1)
            .max(60)
            .describe('The unit, by its name ("unity-formula", "blending", "firing") or its number (1 to 12).'),
          (value) => {
            const typed = (value ?? '').toLowerCase();
            return courseUnits()
              .map((unit) => unit.id)
              .filter((id) => id.startsWith(typed));
          }
        ),
        recipe: recipeArg.optional(),
        cone: coneArg,
        language: languageArg
      })
    },
    ({ unit: asked, recipe, cone, language }) => {
      const unit = findUnit(asked);
      if (!unit) {
        const names = courseUnits()
          .map((u) => u.id)
          .join(', ');
        throw new Error(`No unit "${asked}" in the course. The units are: ${names}.`);
      }
      const course = sectionIn(COURSE_GUIDE, unit.id, language);
      // Lab work: the safe mixing section its warning points to comes first, whatever the unit lists.
      const safetyId = unit.lab ? (unit.safety ?? 'habits') : undefined;
      const safety = safetyId ? sectionIn('safe-mixing', safetyId, language) : null;
      const reads = unit.reads
        .filter((read) => !(read.guide === 'safe-mixing' && read.section === safetyId))
        .map((read) => sectionIn(read.guide, read.section, language));
      const next = courseUnits().find((u) => u.number === unit.number + 1);
      const nextVideo = next?.videos[0];
      return {
        description: `Unit ${unit.number}: ${unit.title}`,
        messages: [
          user(
            lines([
              `I am following John Britt's free online Glaze Course on YouTube, with Glazecalc's companion to it. Help me with unit ${unit.number}: ${unit.title}.`,
              '',
              "His videos for this unit (John Britt's own, free on YouTube, in English):",
              ...unit.videos.map((video) => `- ${video.title}: ${video.url}`),
              '',
              'The Glazecalc guide sections to read (attached):',
              ...unit.reads.map((read) => `- ${read.title} (${read.guide}#${read.section})`),
              '',
              "The companion's exercises:",
              ...unit.exercises.map((exercise, i) => `${i + 1}. ${exercise}`),
              '',
              ...(unit.checks.length
                ? ["The companion's questions to check what I learned:", ...unit.checks.map((q) => `- ${q}`), '']
                : []),
              recipe ? 'My recipe:' : '',
              recipe ?? '',
              recipe ? firingLine(cone) : cone ? `I fire to ${cone}.` : '',
              '',
              'Please:',
              unit.lab
                ? `1. This unit is lab work. Before anything else, point me to the safe mixing guide (the attached section safe-mixing#${safetyId}, and search_guides for more)${safetyId === 'kiln' ? ': kiln fumes, venting, carbon monoxide from gas and reduction kilns, burns.' : ': dust, a fitted respirator, wet cleaning.'}`
                : '1. Say in a sentence what this unit covers, from its title and the attached guide sections.',
              '2. List his videos with their links and titles, credit John Britt (johnbrittpottery.com), and tell me to watch them on YouTube. Do not retell, summarise or quote what he says in them: you have not seen them, and they are his. Glazecalc is not connected with him.',
              '3. Explain the ideas I need from the attached Glazecalc guide sections, in plain words, and cite them by their addresses.',
              '4. Lead me through the exercises one at a time, using the tools they name (analyze_recipe, check_limits, suggest_substitutes, match_from_materials, solve_target, get_material, convert_cone_temperature, specific_gravity_water, search_guides, blend_recipes, vary_material, compare_recipes)' +
                (recipe ? ', with my recipe where it fits: find each material with search_materials first.' : '.'),
              unit.checks.length
                ? '5. Ask me the check questions one at a time and wait for my answer before you give yours, from the attached guide sections (not from his videos). Then say what to test on a tile next, and what to write down.'
                : '5. End with what to test on a tile next, and what to write down.',
              '6. If Glazecalc is connected to my account, offer to save what we made: a notebook entry (add_notebook_entry) with the series of tiles, their codes and amounts, given about when it is about one of my recipes or firing logs; a recipe (create_recipe) for a tile I liked; a firing log of the test firing (create_firing_log) with the readings I gave; or what came of a recipe in a firing (link_firing). Read back exactly what you will save, and save it only if I say yes. Do not say anything was saved until it was, and do not fill in an amount, temperature or result I did not give.',
              next
                ? `7. Close by naming the next unit: unit ${next.number}, ${next.title}${nextVideo ? `, which starts with his video "${nextVideo.title}" (${nextVideo.url})` : ''}.`
                : '7. Close by saying this was the last unit: the course is done.',
              '',
              SAFETY +
                answerIn(language) +
                (language && !/^en(-|$)/i.test(language)
                  ? ' His videos are in English: say so, and give their titles as he wrote them.'
                  : '')
            ])
          ),
          ...[course, safety, ...reads].filter((message) => message !== null)
        ]
      };
    }
  );

  server.registerPrompt(
    'what_does_this_material_do',
    {
      title: 'What does this material do?',
      description:
        'Shows what one material does to a glaze: its analysis, then a range of it in a base recipe (more and more whiting, say), which oxides move and how the glaze walks across Stull’s chart. Give a base recipe, or the assistant asks for one.',
      argsSchema: z.object({
        material: completable(
          z.string().min(1).max(200).describe('The material, such as "Whiting", "Ferro Frit 3134" or "Talc".'),
          (value) => searchLibrary(value ?? '', { limit: 10 }).map((record) => record.name)
        ),
        recipe: recipeArg
          .optional()
          .describe('The base glaze to put it into, one material and amount per line. Without one the assistant asks.'),
        cone: coneArg,
        language: languageArg
      })
    },
    ({ material, recipe, cone, language }) => ({
      description: `What ${material} does`,
      messages: [
        user(
          lines([
            `Show me what ${material} does in a glaze.`,
            '',
            recipe ? 'My base recipe:' : '',
            recipe ?? '',
            recipe ? firingLine(cone) : cone ? `I fire to ${cone}.` : '',
            '',
            'Please:',
            `1. Find ${material} with search_materials and read it with get_material: say in a sentence what it brings (flux, glass former, stabilizer, colorant, opacifier) and which oxides it carries.`,
            recipe
              ? '2. Use my base recipe as given: find each material with search_materials first.'
              : '2. I have not given a base recipe. Ask me for one, or offer a plain one that I choose, before going on. Do not invent a recipe and present it as mine.',
            `3. Run vary_material with the base, ${material} from 0 up to an amount that is sensible for it (a few steps; mode "add", or "replace" with the material it would replace if I say so), with my firing if I gave one.`,
            '4. Explain the trend: which oxides of the unity formula rise or fall, what that does to melt, surface and expansion, and where the glaze moves on Stull’s chart (stull: region, crazed), in plain words.',
            '5. Suggest the tiles worth making and firing to see it for myself, and what to write down. If Glazecalc is connected to my account, offer to save the series as a notebook entry (add_notebook_entry); read back what you will save and save it only if I say yes.',
            '',
            'The numbers are a calculation from published figures, not a test: the fired tiles decide. ' +
              MIXING +
              SAFETY +
              answerIn(language)
          ])
        )
      ]
    })
  );

  server.registerPrompt(
    'teach_me',
    {
      title: 'Teach me about a glaze topic',
      description:
        "A short lesson on any glaze topic (crazing, line blends, what boron does...), at your level: plain words from Glazecalc's guides (attached), one small experiment with Glazecalc's tools, what to look for on the tile, and, where the topic matches a unit of the companion to John Britt's free glaze course, links to his videos by his titles, with credit. " +
        BRITT_RULE,
      argsSchema: z.object({
        topic: completable(
          z.string().min(1).max(200).describe('What to learn about, such as "crazing", "line blends" or "boron".'),
          (value) => topicChoices(value ?? '')
        ),
        level: z
          .enum(['new', 'some', 'experienced'])
          .optional()
          .describe('How much glaze chemistry you know: "new" (the default), "some" or "experienced".'),
        recipe: recipeArg.optional().describe('A recipe of yours to work with, if you have one.'),
        cone: coneArg,
        language: languageArg
      })
    },
    ({ topic, level, recipe, cone, language }) => {
      const unit = matchTopic(topic);
      // The guide sections: the best search hits first (not the companion guide itself, nor a list of
      // sources), then the matched unit's own reads, each once.
      const hits = searchGuides(topic, { language, limit: 6 }).hits.filter(
        (hit) => hit.guide !== COURSE_GUIDE && hit.section !== 'sources'
      );
      const picked = [...hits, ...(unit?.reads ?? [])]
        .map((hit) => ({ guide: hit.guide, section: hit.section }))
        .filter((hit, i, all) => all.findIndex((h) => h.guide === hit.guide && h.section === hit.section) === i);
      const sections = picked
        .map((hit) => sectionIn(hit.guide, hit.section, language))
        .filter((message) => message !== null)
        .slice(0, MOST_TEACH_SECTIONS);
      const lab = unit?.lab === true;
      const safetyId = unit?.safety ?? 'habits';
      const safety = lab ? sectionIn('safe-mixing', safetyId, language) : null;
      const pace = LEVELS[level ?? 'new'];
      return {
        description: `Teach me: ${topic}`,
        messages: [
          user(
            lines([
              `Teach me about this glaze topic: ${topic}.`,
              pace,
              '',
              recipe ? 'My recipe:' : '',
              recipe ?? '',
              recipe ? firingLine(cone) : cone ? `I fire to ${cone}.` : '',
              '',
              unit
                ? `This matches unit ${unit.number} of Glazecalc's companion to John Britt's free online Glaze Course: ${unit.title} (${COURSE_GUIDE}#${unit.id}).`
                : '',
              unit ? "His videos for it (John Britt's own, free on YouTube, in English):" : '',
              ...(unit ? unit.videos.map((video) => `- ${video.title}: ${video.url}`) : []),
              '',
              sections.length ? 'Glazecalc guide sections on it are attached.' : '',
              '',
              'Please:',
              '1. Say in a sentence what the topic is and why it matters on a pot.',
              `2. Explain it from the attached Glazecalc guide sections${sections.length ? '' : ' (search_guides finds them)'}, at my level, and cite them by their addresses. Do not go past what the guides and the tools support.`,
              '3. Give me one small experiment with one tool call: analyze_recipe or check_limits on my recipe, vary_material (one material, 5 steps at most) or compare_recipes (before and after one change). ' +
                (recipe
                  ? 'Use my recipe as given: find each material with search_materials first.'
                  : 'I have not given a recipe: ask me for one, or offer a plain one that I choose, before going on. Do not invent a recipe and present it as mine.'),
              '4. Say which numbers moved and what that predicts on a fired tile, then what to fire and what to write down.',
              unit
                ? '5. List his videos above with their titles and links, credit John Britt (johnbrittpottery.com), and tell me to watch them on YouTube. Do not retell, summarise or quote what he says in them: you have not seen them, and they are his. Glazecalc is not connected with him. Link only the videos listed here; do not add others.'
                : "5. No video of John Britt's course is matched to this topic: do not name or link one, and do not guess one. Link the Glazecalc guide sections instead.",
              '6. Ask me one question to check I understood, then offer the next step up a level.',
              '',
              (lab
                ? `This topic is lab work: before anything else, point me to the safe mixing guide (the attached section safe-mixing#${safetyId})${safetyId === 'kiln' ? ': kiln fumes, venting, carbon monoxide from gas and reduction kilns, burns. ' : ': dust, a fitted respirator, wet cleaning. '}`
                : 'If the experiment leads to weighing and mixing dry materials, point me to the safe mixing guide first (dust, a fitted respirator, wet cleaning). ') +
                'The numbers are a calculation from published figures, not a test: the fired tiles decide. ' +
                SAFETY +
                answerIn(language) +
                (unit && language && !/^en(-|$)/i.test(language)
                  ? ' His videos are in English: say so, and give their titles as he wrote them.'
                  : '')
            ])
          ),
          ...[safety, ...sections].filter((message) => message !== null)
        ]
      };
    }
  );
};

/** What teach_me's topic completes to: the course units' ids and titles, and the guides' section headings. */
const topicChoices = (typed: string): string[] => {
  const wanted = typed.trim().toLowerCase();
  const choices = new Set<string>();
  for (const unit of courseUnits()) {
    choices.add(unit.id);
    choices.add(unit.title);
  }
  for (const id of GUIDE_IDS) {
    if (id === COURSE_GUIDE) continue;
    for (const section of readGuide(id, 'en')?.sections ?? []) {
      if (section.id !== 'sources') choices.add(section.heading);
    }
  }
  return [...choices].filter((choice) => choice.toLowerCase().startsWith(wanted)).slice(0, 20);
};
