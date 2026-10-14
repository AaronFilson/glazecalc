// The pages the build rendered ahead of time (scripts/prerender.mjs), kept in
// memory: a few MB for 264 pages. They are in their own folder, outside the
// client's, so express.static never sends one without its head and nonce.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/** The files under a folder as text, by their path from it with slashes: de/guides/firing.html. Empty where there is no folder. */
export async function loadPrerendered(folder: string): Promise<Map<string, string>> {
  const pages = new Map<string, string>();
  let names: string[];
  try {
    names = await readdir(folder, { recursive: true });
  } catch {
    return pages;
  }
  await Promise.all(
    names
      .filter((name) => name.endsWith('.html'))
      .map(async (name) => pages.set(name.split(path.sep).join('/'), await readFile(path.join(folder, name), 'utf8')))
  );
  return pages;
}
