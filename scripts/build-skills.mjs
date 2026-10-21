// Packs the Agent Skills in skills/ as the ZIPs the site serves
// (docs/adr/0027-dictation-skill.md): skills/glazecalc-dictation becomes
// dist/glazecalc/browser/downloads/glazecalc-dictation.zip, with the skill's
// folder at the ZIP's root, as Claude's "Upload a skill" requires, and the
// repository's LICENSE in it. npm run build runs this after ng build (which
// empties dist/glazecalc), so no ZIP is kept in git. The same bytes for the
// same files: every entry has one fixed time, in a fixed order.
//
//   node scripts/build-skills.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';

const ROOT = path.resolve(import.meta.dirname, '..');
export const SKILLS = ['glazecalc-dictation'];
export const DOWNLOADS = path.join('dist', 'glazecalc', 'browser', 'downloads');

/** 2026-01-01 00:00 in the ZIP's MS-DOS time and date. */
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

/** The files of a skill's folder, by their path in it with forward slashes, in order. */
const filesIn = (dir, under = '') =>
  fs
    .readdirSync(path.join(dir, under), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const rel = under ? under + '/' + entry.name : entry.name;
      return entry.isDirectory() ? [rel + '/', ...filesIn(dir, rel)] : [rel];
    });

/**
 * A ZIP of entries { name, data } (a name ending in / is a folder), each
 * deflated, with a central directory: what every unzip and Claude read.
 */
export const zipOf = (entries) => {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const folder = name.endsWith('/');
    const body = folder ? Buffer.alloc(0) : zlib.deflateRawSync(data, { level: 9 });
    const crc = folder ? 0 : zlib.crc32(data);
    const size = folder ? 0 : data.length;
    const method = folder ? 0 : 8;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed: 2.0
    local.writeUInt16LE(0x0800, 6); // names in UTF-8
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4); // made by Unix, 2.0, so the modes below are read
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk
    central.writeUInt16LE(0, 36); // internal attributes
    // rwxr-xr-x for a folder, rw-r--r-- for a file, and the MS-DOS folder bit.
    central.writeUInt32LE((((folder ? 0o40755 : 0o100644) << 16) | (folder ? 0x10 : 0)) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, body);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
};

/** A skill's ZIP: its folder at the root, with the repository's LICENSE in it. */
export const skillZip = (name, root = ROOT) => {
  const dir = path.join(root, 'skills', name);
  const entries = [{ name: name + '/', data: Buffer.alloc(0) }];
  for (const rel of filesIn(dir)) {
    entries.push({
      name: name + '/' + rel,
      data: rel.endsWith('/') ? Buffer.alloc(0) : fs.readFileSync(path.join(dir, rel))
    });
  }
  entries.push({ name: name + '/LICENSE', data: fs.readFileSync(path.join(root, 'LICENSE')) });
  return zipOf(entries);
};

/** Writes each skill's ZIP into the built client; resolves with their paths. */
export const buildSkills = (root = ROOT) => {
  const out = path.join(root, DOWNLOADS);
  fs.mkdirSync(out, { recursive: true });
  return SKILLS.map((name) => {
    const file = path.join(out, name + '.zip');
    fs.writeFileSync(file, skillZip(name, root));
    return file;
  });
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const file of buildSkills()) console.log('Packed ' + path.relative(ROOT, file));
}
