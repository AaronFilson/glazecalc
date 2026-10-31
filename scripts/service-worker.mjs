// Adds the service worker to the browser build (docs/adr/0028-service-worker.md), after ng build:
//
//   npm run build        (ng build, then this, then the prerendering)
//
// 1. app-shell.html: index.html with a fixed style nonce, which the server sends with the same nonce in its
//    policy (server/app.ts). It is the page the worker shows for any address when the network is gone, and the
//    router draws the page in it. Online, every address is still answered by the server, with a new nonce each time.
// 2. standard/materials.json and standard/additives.json: the standard library (data/) as GET /api/materials/getStandard
//    and /api/additives/getStandard send it, for the recipe page to read when the network is gone. The worker never
//    keeps a reply from /api.
// 3. ngsw.json, from ngsw-config.json: what the worker keeps, with a hash of each file (Angular's own generator,
//    as ng build runs it when angular.json names a service worker; it cannot be used here, as it takes
//    index.html as the page to keep and the server does not send that one as it is).
// 4. ngsw-worker.js, and safety-worker.js (also as worker-basic.min.js, the name Angular's CLI gives it): the
//    kill switch, a worker that clears every cache and unregisters itself. To use it, copy it over
//    ngsw-worker.js (deploy/README.md).
//
// Nothing in browser/ may change after this (the hashes in ngsw.json would no longer match what is sent): the
// prerendering writes outside it (scripts/prerender.mjs).
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Generator } from '@angular/service-worker/config';

const ROOT = path.resolve(import.meta.dirname, '..');
const BROWSER = path.join(ROOT, 'dist', 'glazecalc', 'browser');
const CONFIG = path.join(ROOT, 'ngsw-config.json');
const WORKER = path.join(ROOT, 'node_modules', '@angular', 'service-worker');

/**
 * The kill switch (deploy/README.md, "The service worker"): true makes ngsw-worker.js the safety worker, which
 * clears every cache and unregisters itself on every device that fetches it. Only ever true in a release made to
 * remove a broken worker.
 */
export const KILL_SWITCH = false;

/** The files this script writes, which the manifest never keeps (also when it runs again on the same build). */
const WORKER_FILES = ['ngsw.json', 'ngsw-worker.js', 'safety-worker.js', 'worker-basic.min.js'];

/** The page the worker shows for an address while offline. */
export const SHELL = 'app-shell.html';

/**
 * index.html as the shell: the app's root carries a nonce for Angular's styles (ngCspNonce). It is the same for
 * every load of one build, as it must be, for the worker to keep the page and its policy; it comes from the page's
 * own text, so a new build has a new one. The styles are our own files, so little is lost.
 */
export function shellOf(indexHtml) {
  if (!indexHtml.includes('<gc-root>')) throw new Error('index.html has no <gc-root>');
  const nonce = createHash('sha256').update(indexHtml).digest('base64').slice(0, 22);
  return { nonce, html: indexHtml.replace('<gc-root>', `<gc-root ngCspNonce="${nonce}">`) };
}

/**
 * What the API sends for a standard record: the schema's lists (server/models/material.ts, additive.ts,
 * library_info.ts) are lists and are there when empty, as Mongoose reads a record, and the ObjectId is its text.
 */
const LISTS = ['aliases', 'notes', 'region', 'relatedTo', 'replaces', 'substitutes'];
export const asSent = (record) => {
  const sent = { ...record };
  // A lone value becomes a list of one, as Mongoose casts it.
  for (const list of LISTS) sent[list] = sent[list] === undefined ? [] : [sent[list]].flat();
  return JSON.parse(JSON.stringify(sent));
};

/** The collections of the standard library the recipe page needs on its own (getStandard in client/app/core/api-resource.service.ts). */
export const LIBRARY = ['materials', 'additives'];

/** Angular's generator reads the build's files through this. */
class BuildFiles {
  constructor(base) {
    this.base = base;
  }
  async list(dir) {
    const files = [];
    const walk = async (folder) => {
      for (const name of await readdir(folder)) {
        const file = path.join(folder, name);
        if ((await stat(file)).isDirectory()) await walk(file);
        else if (!WORKER_FILES.includes(name))
          files.push('/' + path.relative(this.base, file).split(path.sep).join('/'));
      }
    };
    await walk(path.join(this.base, dir));
    return files;
  }
  read(file) {
    return readFile(path.join(this.base, file), 'utf8');
  }
  async hash(file) {
    return createHash('sha1')
      .update(await readFile(path.join(this.base, file)))
      .digest('hex');
  }
  write() {
    throw new Error('The generator only reads.');
  }
}

/** Writes the shell, the manifest and the workers into the browser build. */
export async function addServiceWorker(browser = BROWSER, configFile = CONFIG, kill = KILL_SWITCH) {
  const { html } = shellOf(await readFile(path.join(browser, 'index.html'), 'utf8'));
  await writeFile(path.join(browser, SHELL), html);
  const data = createRequire(import.meta.url)('../data');
  await mkdir(path.join(browser, 'standard'), { recursive: true });
  for (const name of LIBRARY) {
    await writeFile(path.join(browser, 'standard', name + '.json'), JSON.stringify(data.load(name).map(asSent)));
  }
  const config = JSON.parse(await readFile(configFile, 'utf8'));
  const manifest = await new Generator(new BuildFiles(browser), '/').process(config);
  await writeFile(path.join(browser, 'ngsw.json'), JSON.stringify(manifest, null, 2));
  // After the manifest, so the workers are not among the files it keeps.
  await copyFile(path.join(WORKER, kill ? 'safety-worker.js' : 'ngsw-worker.js'), path.join(browser, 'ngsw-worker.js'));
  await copyFile(path.join(WORKER, 'safety-worker.js'), path.join(browser, 'safety-worker.js'));
  await copyFile(path.join(WORKER, 'safety-worker.js'), path.join(browser, 'worker-basic.min.js'));
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = await addServiceWorker();
  console.log(`Service worker: ${SHELL} and ngsw.json (${Object.keys(manifest.hashTable).length} files kept).`);
}
