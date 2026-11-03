/** The fonts client/styles.scss names for each language's script ($gc-script-fonts), in order. */
export function scriptFonts(scss: string): Record<string, string[]>;
/** The ranges of a CSS unicode-range, as [first, last] code points. */
export function cssRanges(range: string): Array<[number, number]>;
/** The ranges of a fontconfig charset ("20-7e a0-17f"), as [first, last] code points. */
export function charsetRanges(charset: string): Array<[number, number]>;
/** The code points of a text that a font must draw: not spaces, nor joiners and marks of direction. */
export function lettersOf(text: string): number[];
/** The page drawn for a language: the brand, its heading and the photo. */
export function pageFor(
  code: string,
  heading: string,
  stack: string[],
  served: Array<{ family: string; file: string; weight: string; range: string }>
): string;
/** The image's file name: its language and the start of its content's hash. */
export function imageName(code: string, bytes: Uint8Array, extension: string): string;
