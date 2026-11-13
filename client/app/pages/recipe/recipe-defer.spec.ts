// The recipe page fetches the files of its on-demand parts once it is idle (recipe-page.html, @defer), so the
// page itself starts sooner. A part used once outside a @defer block is drawn into the page's own file again,
// so each must be used only inside one.

// Read at run time, by a module name the bundler cannot see (as client/app/index-html.spec.ts does).
const node = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ node)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
/** A template without interpolations, attribute values and comments, whose braces are not blocks. */
const template = (name: string): string =>
  readFileSync('client/app/pages/recipe/' + name, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\{\{[\s\S]*?\}\}/g, '')
    .replace(/"[^"]*"/g, '""');
const page = template('recipe-page.html');
/** The saved recipes, which the page draws on every visit (saved-recipes.ts). */
const saved = template('saved-recipes.html');
const code = readFileSync('client/app/pages/recipe/recipe-page.ts', 'utf8');

/** Whether every use of an element in a template is inside a @defer block's content. */
function onlyDeferred(template: string, selector: string): boolean {
  let depth = 0;
  const stack: boolean[] = [];
  let uses = 0;
  // Blocks open with "{" after @defer / @if / @for ... and close with "}"; @placeholder and @loading are not content.
  const tokens = template.matchAll(/@(defer|placeholder|loading|if|else if|else|for|empty)\b[^{]*\{|\}|<([a-z-]+)/g);
  for (const [token, block, element] of tokens) {
    if (block) stack.push(block === 'defer' || (stack.at(-1) === true && !['placeholder', 'loading'].includes(block)));
    else if (token === '}') stack.pop();
    else if (element === selector) {
      uses++;
      if (!stack.at(-1)) return false;
    }
    depth = stack.length;
  }
  return uses > 0 && depth === 0;
}

describe('recipe page deferral', () => {
  it('uses print, compare, share, the swap report and the materials to try only inside @defer blocks', () => {
    for (const selector of ['gc-recipe-print', 'gc-recipe-compare', 'gc-swap-report', 'gc-try-materials']) {
      expect(onlyDeferred(page, selector), selector).toBe(true);
    }
    // Share is in the saved recipes' list, drawn on every visit.
    expect(onlyDeferred(saved, 'gc-share-panel'), 'gc-share-panel').toBe(true);
    // Help and the slurry calculator draw on every visit, so they stay in the page's own file.
    expect(onlyDeferred(page, 'gc-recipe-help')).toBe(false);
  });

  it('imports their types apart from the components, which a deferred part needs', () => {
    expect(code).toContain("import type { CompareChoice } from './recipe-compare';");
    expect(code).toContain("import type { Run, SwapResult } from './swap-report';");
  });
});

export {};
