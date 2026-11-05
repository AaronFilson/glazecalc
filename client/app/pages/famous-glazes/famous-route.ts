import { inject } from '@angular/core';
import { CanMatchFn, ResolveFn } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { FamousGlaze, FamousGlazes, nameIn } from './famous-data';

// What the famous glazes' routes need before they open (docs/famous-glazes.md). Only a published glaze
// has a page: any other address under /famous-glazes/ is the not-found page, and so is the index while
// none is published, as the server has it (lib/pages.js FAMOUS_GLAZE_PAGES).

/** The index opens once a glaze is published. */
export const anyFamousGlaze: CanMatchFn = async () => (await inject(FamousGlazes).all()).length > 0;

/** The route is a published glaze's. */
export const knownFamousGlaze: CanMatchFn = async (_route, segments) =>
  !!(await inject(FamousGlazes).bySlug(segments[1]?.path));

export const famousGlazeList: ResolveFn<FamousGlaze[]> = () => inject(FamousGlazes).all();

/** The glaze at the address (the route only matches a published one). */
export const famousGlazeOf: ResolveFn<FamousGlaze> = async (route) =>
  (await inject(FamousGlazes).bySlug(route.paramMap.get('slug')))!;

/** The title's and description's values: the glaze's usual name in the page's language, and its native name. */
export const famousGlazeTitleParams: ResolveFn<{ name: string; native: string }> = async (route) => {
  const language = inject(TranslocoService).getActiveLang();
  const glaze = await inject(FamousGlazes).bySlug(route.paramMap.get('slug'));
  return { name: glaze ? nameIn(glaze, language) : '', native: glaze?.native.name ?? '' };
};
