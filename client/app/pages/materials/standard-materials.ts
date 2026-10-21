import text from '../../../../data/materials.ndjson';
import { materialSlug } from '../../../../lib/material-slug';
import { Material } from '../../core/models';

/**
 * The standard materials, from the file the database is seeded from
 * (data/materials.ndjson, scripts/seed-standard.js), in the bundle, so each
 * material's public page is rendered with its data at build time and needs no
 * request. The pages list the same materials as lib/pages.js (MATERIAL_PAGES).
 */
export const STANDARD_MATERIALS: readonly Material[] = text
  .split('\n')
  .filter((line) => line.trim())
  .map((line) => {
    const record = JSON.parse(line) as Omit<Material, '_id'> & { _id: string | { $oid: string } };
    const { _id, ...rest } = record;
    return { ...rest, _id: typeof _id === 'string' ? _id : _id.$oid };
  });

const BY_SLUG = new Map(STANDARD_MATERIALS.map((material) => [materialSlug(material.name), material]));

/** A material's address part, from its name: "Ferro Frit 3134" is ferro-frit-3134. */
export { materialSlug };

/** The standard material at an address part, or undefined. */
export const materialBySlug = (slug: string | null | undefined): Material | undefined =>
  slug ? BY_SLUG.get(slug) : undefined;

/** The address of a material's page, as the router writes it: /materials/ferro-frit-3134. */
export const materialPath = (material: Pick<Material, 'name'>): string => '/materials/' + materialSlug(material.name);

/** The page of a material by its name or one of its other names, if the library has one; otherwise undefined. */
export const materialNamed = (name: string): Material | undefined => BY_SLUG.get(materialSlug(name));
