// A lookbehind at a pattern's start, for engines without one: Safari before 16.4 (macOS 12's JavaScriptCore) cannot
// parse (?<=…) or (?<!…), so the catalog writes none (test/behind.test.js holds it). `matchesAfter` runs the
// pattern without it and skips each start whose character before fails the test, trying again one character on,
// which is what the engine does with the lookbehind: the matches are the same.

/** The character (code point) just before `index`, or undefined at the text's start. */
function before(text: string, index: number): string | undefined {
  if (index <= 0) return undefined;
  const low = text.charCodeAt(index - 1);
  const pair = index >= 2 && low >= 0xdc00 && low <= 0xdfff && /[\ud800-\udbff]/.test(text[index - 2]!);
  return pair ? text.slice(index - 2, index) : text[index - 1];
}

/**
 * Each match of `pattern` in `text` whose character before passes `ok` (undefined at the start), in order, as
 * matchAll gives them. The pattern is copied with the g flag, so the caller's is never changed.
 */
function* matchesAfter(
  text: string,
  pattern: RegExp,
  ok: (previous: string | undefined) => boolean
): Generator<RegExpExecArray> {
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  const step = (at: number): number => {
    const code = text.codePointAt(at);
    return re.unicode && code !== undefined && code > 0xffff ? 2 : 1;
  };
  for (let found = re.exec(text); found; found = re.exec(text)) {
    if (!ok(before(text, found.index))) {
      re.lastIndex = found.index + step(found.index);
      continue;
    }
    if (found[0] === '') re.lastIndex = found.index + step(found.index);
    yield found;
  }
}

/** The first such match, as String.prototype.match gives one without the g flag, or null. */
const firstAfter = (text: string, pattern: RegExp, ok: (previous: string | undefined) => boolean) =>
  matchesAfter(text, pattern, ok).next().value ?? null;

/** A test for `ok`: the character before is not one `kind` matches (or there is none), as (?<![…]) reads. */
const notAfter =
  (kind: RegExp) =>
  (previous: string | undefined): boolean =>
    previous === undefined || !kind.test(previous);

export { matchesAfter, firstAfter, notAfter };
