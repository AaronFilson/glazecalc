/** Each live language's preview image file under client/public (og/de.c10d78d3.jpg), by language code. */
export const OG_IMAGES: Readonly<Record<string, string>>;
/** The preview image's file for a language: its own where it has one, else the English. */
export function ogImageFile(code: string): string;
