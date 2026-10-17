// Prompts a person can pick in their assistant (docs/integrations-plan.md,
// item 21): ready-made requests that lead the assistant through Glazecalc's
// tools for four common jobs. Diagnosing a glaze fault, making a recipe
// lead-free, replacing discontinued materials, and explaining a recipe to a
// new potter. Each says which tools to use and what to be careful about; the
// fault diagnosis carries the guides' section on glaze defects with it. The
// requests are in English, as the tools' descriptions are, and ask for the
// answer in the person's language.
import * as z from 'zod';
import { completable, type McpServer } from '@modelcontextprotocol/server';
import { readGuide, sectionMarkdown, sectionUri } from './guides.ts';

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

const user = (text: string) => ({ role: 'user' as const, content: { type: 'text' as const, text } });

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
              SAFETY + answerIn(language)
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
              SAFETY +
              answerIn(language)
          ].join('\n')
        )
      ]
    })
  );
};
