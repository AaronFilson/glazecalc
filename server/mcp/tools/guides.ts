// The guides and the reference tables, for AI assistants (docs/integrations-plan.md,
// items 20 and 21): the search_guides tool, and as resources the guides (whole,
// or one section, in any app language), a material from the library, and the
// cone charts. Anyone may use them, with no account; they only read.
//
//   glazecalc://guides/{language}/{guide}            a guide, as Markdown
//   glazecalc://guides/{language}/{guide}/{section}  one of its sections
//   glazecalc://materials/{name}                     a library material, as JSON
//   glazecalc://cones                                the Orton and SK cone charts, as JSON
import * as z from 'zod';
import { type McpServer, ResourceNotFoundError, ResourceTemplate } from '@modelcontextprotocol/server';
import cones from '../../../lib/cones/index.js';
import firingLib from '../../../lib/cones/firing.js';
import recipe from '../../../lib/recipe/index.js';
import languages from '../../../lib/regions/languages.js';
import { guarded, languageArg, ok } from '../common.ts';
import {
  CONE_SYSTEMS,
  GUIDE_IDS,
  guideMarkdown,
  readGuide,
  searchGuides,
  sectionMarkdown,
  sectionUri
} from '../guides.ts';
import { findAdditive, findMaterial, searchLibrary } from '../library.ts';
import { materialOut } from './public.ts';
import { languageOf } from '../words.ts';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

/** The longest search query taken. */
export const MOST_QUERY = 200;
/** Resources that never change while the server runs may be kept by any client for an hour. */
const AN_HOUR = { ttlMs: 60 * 60 * 1000, cacheScope: 'public' } as const;

const one = (value: string | string[] | undefined): string => (Array.isArray(value) ? (value[0] ?? '') : (value ?? ''));

/** The Orton cones the recipe picker offers with no figure in any chart: 16 up, and 15½. */
const ortonWithoutFigure = () =>
  firingLib
    .coneChoices('orton')
    .flatMap((group) => group.cones)
    .filter((cone) => !firingLib.approxCelsius('orton', cone))
    .sort((a, b) => firingLib.compareCones('orton', a, b));

/** The cone charts as data: what convert_cone_temperature reads. */
export const coneCharts = () => ({
  orton: {
    name: cones.ORTON.chart.basis + ', over the last 100 °C',
    title: cones.ORTON.chart.title,
    source: cones.ORTON.chart.source,
    reprintedBy: cones.ORTON.chart.reprintedBy,
    checked: cones.ORTON.chart.checked,
    note: cones.ORTON.chart.note,
    cones: cones.ORTON.chart.cones.map((c) => ({
      cone: c.cone,
      celsius: c.celsius,
      fahrenheit: Math.round(recipe.fahrenheit(c.celsius))
    })),
    conesWithoutFigure: ortonWithoutFigure()
  },
  ortonCurrent: {
    name: "Orton's current figures, °C, by heating rate over the last 100 °C (°C an hour)",
    title: cones.ORTON.published.title,
    source: cones.ORTON.published.source,
    current: cones.ORTON.published.current,
    checked: cones.ORTON.published.checked,
    note: cones.ORTON.published.note,
    cones: cones.ORTON.published.cones
  },
  sk: {
    name: 'SK cones (' + cones.SK.standard + '), ' + cones.SK.basis,
    source: cones.SK.source,
    note: cones.SK.note,
    cones: cones.SK.cones.map((c) => ({
      cone: c.cone,
      celsius: c.celsius,
      fahrenheit: Math.round(recipe.fahrenheit(c.celsius))
    }))
  },
  note: 'Cones measure heat work, not temperature alone: the figures are for the heating rate each chart states.'
});

export const registerGuides = (server: McpServer): void => {
  server.registerTool(
    'search_guides',
    {
      title: 'Search the guides',
      description:
        "Searches Glazecalc's plain-language guides for potters (glazing from first principles, making a glaze, safe mixing, safety at home with children and pets, firing a kiln, and a companion to John Britt's free glaze course, in English only) in the language asked for, or in English where that language has no match. Returns each matching section's title, anchor, a short excerpt, its address on the website and its resource URI, which resources/read returns in full. Use it for glaze defects, safety, firing and terms, and cite the address.",
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .max(MOST_QUERY)
          .describe('Words to look for, such as "crawling", "respirator", "bisque schedule" or "specific gravity".'),
        language: languageArg,
        guide: z
          .enum(GUIDE_IDS as [string, ...string[]])
          .optional()
          .describe('Only this guide.'),
        cones: z
          .enum(CONE_SYSTEMS as ['orton', 'sk', 'temperature'])
          .optional()
          .describe(
            'How the potter fires, for the parts of the guides that differ: Orton cones (the default), SK cones (JIS R 8101) or by temperature.'
          ),
        limit: z.number().int().min(1).max(20).optional().describe('At most this many sections (5 unless asked).')
      }),
      annotations: READ_ONLY
    },
    async ({ query, language, guide, cones: system, limit }) =>
      guarded(async () => {
        const found = searchGuides(query, { language, guide, cones: system, limit });
        const asked = languageOf(language);
        return ok({
          query,
          language: found.language,
          ...(found.language !== asked && {
            note: `Nothing matched in the guides in ${asked}, so these are from the English guides.`
          }),
          results: found.hits.map((hit) => ({
            guide: hit.guide,
            guideTitle: hit.guideTitle,
            section: hit.section,
            heading: hit.heading,
            language: hit.language,
            excerpt: hit.excerpt,
            url: hit.url,
            resource: hit.resource
          }))
        });
      })
  );

  const completeLanguage = (value: string) =>
    languages.LIVE_LANGUAGES.filter((code) => code.toLowerCase().startsWith(value.toLowerCase()));
  const completeGuide = (value: string) => GUIDE_IDS.filter((id) => id.startsWith(value.toLowerCase()));

  server.registerResource(
    'guide',
    new ResourceTemplate('glazecalc://guides/{language}/{guide}', {
      // The English guides; every app language has the same guides at the same addresses.
      list: () => ({
        resources: GUIDE_IDS.map((id) => {
          const guide = readGuide(id, 'en')!;
          return {
            uri: sectionUri('en', id),
            name: guide.title,
            title: guide.title,
            description: guide.lead,
            mimeType: 'text/markdown'
          };
        })
      }),
      complete: { language: completeLanguage, guide: completeGuide }
    }),
    {
      title: 'A guide',
      description:
        'One of the guides, whole, as Markdown, in a language the app offers (as "en", "de", "ja"); a guide not yet translated is in English. Temperatures are in both scales, and the parts for Orton cones are given.',
      mimeType: 'text/markdown',
      cacheHint: AN_HOUR
    },
    (uri, variables) => {
      const guide = readGuide(one(variables.guide), one(variables.language));
      if (!guide) throw new ResourceNotFoundError(uri.href, `No guide at ${uri.href}.`);
      return { contents: [{ uri: uri.href, mimeType: 'text/markdown', text: guideMarkdown(guide) }] };
    }
  );

  server.registerResource(
    'guide-section',
    new ResourceTemplate('glazecalc://guides/{language}/{guide}/{section}', {
      list: undefined,
      complete: { language: completeLanguage, guide: completeGuide }
    }),
    {
      title: 'A section of a guide',
      description:
        'One section of a guide, as Markdown, by its anchor on the website (glazecalc://guides/en/firing/kiln-sitter is /guides/firing#kiln-sitter). search_guides gives these URIs.',
      mimeType: 'text/markdown',
      cacheHint: AN_HOUR
    },
    (uri, variables) => {
      const guide = readGuide(one(variables.guide), one(variables.language));
      const section = guide?.sections.find((s) => s.id === one(variables.section));
      if (!guide || !section) throw new ResourceNotFoundError(uri.href, `No guide section at ${uri.href}.`);
      return { contents: [{ uri: uri.href, mimeType: 'text/markdown', text: sectionMarkdown(guide, section) }] };
    }
  );

  server.registerResource(
    'material',
    new ResourceTemplate('glazecalc://materials/{name}', {
      list: undefined,
      complete: {
        name: (value: string) => searchLibrary(value || 'a', { limit: 20 }).map((record) => record.name)
      }
    }),
    {
      title: 'A material',
      description:
        'A material or colorant from the library, by its name (URL-encoded: glazecalc://materials/Custer%20Spar), as JSON: what get_material returns.',
      mimeType: 'application/json',
      cacheHint: AN_HOUR
    },
    (uri, variables) => {
      let name = one(variables.name);
      try {
        name = decodeURIComponent(name);
      } catch {
        // Not encoded: as it is.
      }
      const record = findMaterial(name) ?? findAdditive(name);
      if (!record) throw new ResourceNotFoundError(uri.href, `No material named ${name} in the library.`);
      return {
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(materialOut(record), null, 2) }]
      };
    }
  );

  server.registerResource(
    'cones',
    'glazecalc://cones',
    {
      title: 'Cone charts',
      description:
        "The cone charts Glazecalc uses, as JSON: Orton cones 022 to 15 (Orton's older chart for large cones at 150 °C an hour, in °C and °F), Orton's own current figures for cone 022 to 14 beside them, and SK cones (JIS R 8101, SK 022 to 20, nominal). Orton publishes no figure above cone 14.",
      mimeType: 'application/json',
      cacheHint: AN_HOUR
    },
    (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(coneCharts(), null, 2) }]
    })
  );
};
