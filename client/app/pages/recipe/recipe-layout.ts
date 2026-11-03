import { marker } from '@jsverse/transloco-keys-manager/marker';

/**
 * How the recipe form is laid out: the standard form, the workbench (A: recipe beside its formula and limits)
 * or guided steps (B). All three show the same recipe; only the arrangement differs.
 */
export type RecipeLayout = 'standard' | 'workbench' | 'guided';

/** This browser's choice (registered in core/settings-expiry.ts). */
export const LAYOUT_KEY = 'recipeLayout';

/** Each label is the key of its message. */
export const LAYOUT_OPTIONS: ReadonlyArray<{ value: RecipeLayout; label: string }> = [
  { value: 'standard', label: marker('recipe.layout.standard') },
  { value: 'workbench', label: marker('recipe.layout.workbench') },
  { value: 'guided', label: marker('recipe.layout.guided') }
];

/** The guided steps, in order. */
export const GUIDED_STEPS: readonly string[] = [
  marker('recipe.layout.stepRecipe'),
  marker('recipe.layout.stepAmounts'),
  marker('recipe.layout.stepCheck'),
  marker('recipe.page.save')
];

/** A layout from ?layout= (a, b, today, or a layout's own name); null for anything else. */
export function layoutFromParam(value: string | null | undefined): RecipeLayout | null {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'a':
    case 'workbench':
      return 'workbench';
    case 'b':
    case 'guided':
      return 'guided';
    case 'today':
    case 'standard':
      return 'standard';
    default:
      return null;
  }
}

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function localStore(): Store | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** The layout chosen last on this browser; the standard form when none was. */
export function storedLayout(storage: Store | undefined = localStore()): RecipeLayout {
  try {
    const value = storage?.getItem(LAYOUT_KEY);
    return LAYOUT_OPTIONS.some((option) => option.value === value) ? (value as RecipeLayout) : 'standard';
  } catch {
    return 'standard';
  }
}

/** Keeps the choice on this browser. */
export function storeLayout(layout: RecipeLayout, storage: Store | undefined = localStore()): void {
  try {
    storage?.setItem(LAYOUT_KEY, layout);
  } catch {
    // Without storage the choice still holds while the page is open.
  }
}
