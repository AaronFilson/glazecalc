// What the prompt makers share: the repo, the scratch folder, the branch, the
// languages of the waves to come, and filling a template's {PLACEHOLDERS}.
//
// Set GLAZECALC_SCRATCH to the session's scratch folder (absolute) before
// running any maker; the prompts and the agents' work files go there.
// GLAZECALC_BRANCH names the branch in the prompts (default: the current one).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const HERE = __dirname;

const scratchDir = process.env.GLAZECALC_SCRATCH;
if (!scratchDir || !path.isAbsolute(scratchDir)) {
  throw new Error('Set GLAZECALC_SCRATCH to the scratch folder, as an absolute path.');
}
/** The scratch folder, with forward slashes (for Node) and as Windows writes it (for the prompts). */
const SCRATCH = path.resolve(scratchDir).replace(/\\/g, '/') + '/';
const SCRATCH_WIN = SCRATCH.replace(/\//g, '\\');

const BRANCH =
  process.env.GLAZECALC_BRANCH ||
  execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();

// The languages still to translate. `country` is who reads it, as the prompts
// say it; `region` the region code in lib/regions; `shops` and `termbank` what
// the glossary's research starts from. Add the next wave's languages here.
const LANGUAGES = {
  ga: {
    language: 'Irish',
    country: 'Ireland',
    region: 'IE',
    shops:
      'Irish shops sell in English (lib/regions/suppliers.js lists DBI Pottery Supplies and RPM Supplies): look for Irish-language ceramics teaching, art-school and Gaeltacht craft sources, and Irish-language school texts on art and chemistry.',
    termbank: 'téarma.ie, the National Terminology Database for Irish (Foras na Gaeilge), and focloir.ie'
  },
  mt: {
    language: 'Maltese',
    country: 'Malta',
    region: 'MT',
    shops:
      'The region data found no shop in Malta; Maltese pottery is taught in Maltese and English (MCAST, the University of Malta): look for Maltese-language craft and school sources, and use shops selling into Malta only to see what is on the bag.',
    termbank:
      'the Maltese terminology of the National Council for the Maltese Language (Kunsill Nazzjonali tal-Ilsien Malti) and IATE'
  }
};

/** The language codes named on the command line, each one known here. */
const codes = (argv = process.argv.slice(2)) => {
  if (!argv.length) throw new Error('Which languages? For example: ga mt');
  for (const code of argv) {
    if (!LANGUAGES[code]) throw new Error(`${code}: add it to LANGUAGES in wave.js first.`);
  }
  return argv;
};

/** A template from this folder with its {PLACEHOLDERS} filled; fails if one is left. */
const fill = (name, values) => {
  let text = fs.readFileSync(path.join(HERE, name), 'utf8');
  const all = { BRANCH, SCRATCH: SCRATCH_WIN, ...values };
  for (const [key, value] of Object.entries(all)) text = text.split(`{${key}}`).join(value);
  const left = text.match(/\{[A-Z_]{3,}\}/);
  if (left) throw new Error(`${name}: ${left[0]} is not filled.`);
  return text;
};

/** Writes a file under the scratch folder, making its folder. */
const write = (relative, text) => {
  const file = SCRATCH + relative;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
};

/** chunks.md, filled, in the scratch folder: the translation parts and their files. Returns its Windows path. */
const chunks = () => {
  write('chunks.md', fill('chunks.md', {}));
  return SCRATCH_WIN + 'chunks.md';
};

module.exports = { ROOT, HERE, SCRATCH, SCRATCH_WIN, BRANCH, LANGUAGES, codes, fill, write, chunks };
