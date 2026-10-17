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
import chemistry from '../../../lib/chemistry/index.js';
import cones from '../../../lib/cones/index.js';
import recipe from '../../../lib/recipe/index.js';
import languages from '../../../lib/regions/languages.js';
import { languageArg, ok } from '../common.ts';
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

/** The cone charts as data: what convert_cone_temperature reads. */
export const coneCharts = () => ({
  orton: {
    name: 'Orton large cones, heated at 60 °C (108 °F) an hour over the last 100 °C',
    cones: chemistry.CONES.map((c) => ({
      cone: c.cone,
      celsius: c.celsius,
      fahrenheit: Math.round(recipe.fahrenheit(c.celsius))
    }))
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
        "Searches Glazecalc's plain-language guides for potters (glazing from first principles, making a glaze, safe mixing, safety at home with children and pets, firing a kiln) in the language asked for, or in English where that language has no match. Returns each matching section's title, anchor, a short excerpt, its address on the website and its resource URI, which resources/read returns in full. Use it for glaze defects, safety, firing and terms, and cite the address.",
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
    async ({ query, language, guide, cones: system, limit }) => {
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
    }
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
      description: 'The Orton (06 to 6) and SK (JIS R 8101) cone charts Glazecalc uses, in °C and °F, as JSON.',
      mimeType: 'application/json',
      cacheHint: AN_HOUR
    },
    (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(coneCharts(), null, 2) }]
    })
  );
};
