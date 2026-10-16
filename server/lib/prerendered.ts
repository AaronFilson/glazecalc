// The pages the build rendered ahead of time (scripts/prerender.mjs), read from
// disk for each reply, as index.html is. Kept in memory they would take about
// 100 MB of Node's heap (49 MB of files, 286 pages, most of it the state each
// page hands the browser; text outside Latin-1 takes two bytes a letter in
// JavaScript), on a 1 GB instance; read when asked for, the kernel keeps the
// ones in use in its file cache and gives that memory back when it is needed.
// They are in their own folder, outside the client's, so express.static never
// sends one without its head and nonce.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * One page as text, by its path from the folder with slashes (de/guides/firing.html, from
 * prerenderedKey, never a path from the request), or undefined where there is none.
 */
export async function readPrerendered(folder: string, key: string): Promise<string | undefined> {
  try {
    return await readFile(path.join(folder, ...key.split('/')), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw err;
  }
}
