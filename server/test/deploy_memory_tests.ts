import fs from 'node:fs';
import path from 'node:path';
import { expect } from './support/app.ts';

// The apps' memory on the 1 GB instance (deploy/compose.prod.yaml and
// compose.staging.yaml): each app's Node heap is capped, and its container
// too, so neither can take the memory MongoDB and nginx need.
const DEPLOY = path.join(import.meta.dirname, '..', '..', 'deploy');
const INSTANCE_MB = 1024;

/** The app service's container limit and heap cap, in MB, and MongoDB's cache if the file runs it. */
const memoryOf = (file: string) => {
  const text = fs.readFileSync(path.join(DEPLOY, file), 'utf8');
  const app = text.slice(
    text.indexOf('\n  app:'),
    text.indexOf('\n  mongo:') > 0 ? text.indexOf('\n  mongo:') : undefined
  );
  const limit = /^ {4}mem_limit: (\d+)m$/m.exec(app);
  const heap = /^ {6}NODE_OPTIONS: --max-old-space-size=(\d+)$/m.exec(app);
  const cache = /'--wiredTigerCacheSizeGB', '([\d.]+)'/.exec(text);
  expect(limit, file + ': the app has a mem_limit').to.not.equal(null);
  expect(heap, file + ': the app caps its heap').to.not.equal(null);
  return { limit: Number(limit![1]), heap: Number(heap![1]), cache: cache ? Number(cache[1]) * 1024 : null };
};

describe('memory on the instance', () => {
  it("caps production's app below what MongoDB and the system need, with room beside its heap", () => {
    const prod = memoryOf('compose.prod.yaml');
    // The largest import peaks at 440 to 480 MB with a 256 MB heap: room for that beside the heap.
    expect(prod.heap).to.be.at.least(256);
    expect(prod.limit - prod.heap).to.be.at.least(192);
    // MongoDB's cache, its working memory, the system and nginx: at least 400 MB left at the app's worst.
    expect(prod.cache).to.equal(256);
    expect(prod.limit).to.be.at.most(INSTANCE_MB / 2);
  });

  it("keeps staging's app smaller than production's", () => {
    const prod = memoryOf('compose.prod.yaml');
    const staging = memoryOf('compose.staging.yaml');
    expect(staging.heap).to.be.below(prod.heap);
    expect(staging.limit).to.be.below(prod.limit);
    expect(staging.cache).to.equal(null);
  });
});
