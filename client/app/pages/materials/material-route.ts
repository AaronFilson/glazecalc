import { ActivatedRouteSnapshot, CanMatchFn, ResolveFn } from '@angular/router';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import type { Material } from '../../core/models';

// What the route of a standard material's page needs before it opens. The materials come in with the
// page (standard-materials.ts is about 150 kB of text), so each reads them by import() and the first
// page, and every other route, never carry them.

/** A name this short fits the longer description in 155 characters (meta.materialInfoLong). */
export const SHORT_NAME = 24;

const atAddress = async (route: ActivatedRouteSnapshot): Promise<Material | undefined> =>
  (await import('./standard-materials')).materialBySlug(route.paramMap.get('slug'));

/** The route is a standard material's: any other address under /materials/ is the not-found page. */
export const knownMaterial: CanMatchFn = async (_route, segments) =>
  !!(await import('./standard-materials')).materialBySlug(segments[1]?.path);

/** The material at the address (the route only matches a known one). */
export const materialOf: ResolveFn<Material> = async (route) => (await atAddress(route))!;

/** The values the title and description have in them (i18n/titles.ts). */
export const materialTitleParams: ResolveFn<{ name: string }> = async (route) => ({
  name: (await atAddress(route))?.name ?? ''
});

/** The description's key: the longer text where the name leaves room, so it fills a result's line. */
export const materialDescriptionKey: ResolveFn<string> = async (route) =>
  ((await atAddress(route))?.name.length ?? 0) <= SHORT_NAME
    ? marker('meta.materialInfoLong')
    : marker('meta.materialInfo');
