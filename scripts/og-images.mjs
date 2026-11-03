/* global document */
// The link preview image of each live language (og:image, twitter:image):
//
//   npm run og-images [-- codes]        (on Windows and macOS: through Docker, scripts/og-images-linux.mjs)
//   node scripts/og-images.mjs [codes]  (on Linux, with the fonts of scripts/test-e2e-linux.Dockerfile)
//
// Each image is 1200 x 630: the logo and "Glazecalc", the home page's heading in the language
// (site.landing.heading, client/public/i18n/site/<code>.json) and the photo of fired cone packs. Chromium
// draws it (Playwright), so right-to-left text, India's conjuncts and Nastaliq are shaped as a browser
// shapes them. The fonts are the app's: Lora and Noto Serif from node_modules, Noto Nastaliq Urdu and
// Noto Sans Ethiopic from client/fonts, and for the other scripts the fonts client/styles.scss names
// ($gc-script-fonts) that are installed. Before drawing, every letter of the text must be in one of
// those fonts (fontconfig's fc-query and fc-list read their character maps); a letter in none of them
// stops the script, rather than drawing an empty box.
//
// Each file is written as client/public/og/<code>.<hash>.png, or .jpg where the PNG is over 150 kB, and
// lib/og-images.json names it, so a changed heading is a new address that link previews fetch again
// (they keep an image by its address). The images are checked in; run this again when a heading changes
// or a language goes live. server/test/og_images_tests.ts checks the sizes and the names.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import languages from '../lib/regions/languages.js';

const root = path.resolve(import.meta.dirname, '..');
const OUT = path.join(root, 'client', 'public', 'og');
const MANIFEST = path.join(root, 'lib', 'og-images.json');
const WIDTH = 1200;
const HEIGHT = 630;
const MAX_BYTES = 150 * 1024;

/**
 * The heading's line height where a script's marks reach further than Latin's, as client/styles.scss
 * sets its headings ($gc-tall-scripts; Nastaliq, Thai and Arabic); 1.25 for the rest.
 */
const LINE_HEIGHTS = {
  ...Object.fromEntries(['hi', 'bn', 'mr', 'ne', 'pa', 'gu'].map((code) => [code, 1.45])),
  ...Object.fromEntries(['ta', 'ml', 'te', 'kn', 'or', 'si'].map((code) => [code, 1.5])),
  am: 1.4,
  ar: 1.4,
  th: 1.4,
  ur: 1.8
};

/** The fonts served with the app, as client/styles.scss declares them: family, file and range. */
const SERVED = [
  {
    family: 'Noto Nastaliq Served',
    file: 'client/fonts/noto-nastaliq-urdu-wght-normal.woff2',
    weight: '400 700',
    range: 'U+0600-06FF, U+200C-200E, U+2010-2011, U+FD3E-FD3F, U+FDF2, U+FDFA-FDFD'
  },
  {
    family: 'Noto Sans Ethiopic Served',
    file: 'client/fonts/noto-sans-ethiopic-wght-normal.woff2',
    weight: '100 900',
    range: 'U+030E, U+1200-1399, U+2D80-2DDE, U+AB01-AB2E, U+1E7E0-1E7E6, U+1E7E8-1E7EB, U+1E7ED-1E7EE, U+1E7F0-1E7FE'
  }
];

/** Fontsource's faces of a package (its index.css): family, file and range. */
function fontsource(name) {
  const dir = path.join(root, 'node_modules', '@fontsource-variable', name);
  const css = fs.readFileSync(path.join(dir, 'index.css'), 'utf8');
  return [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, body]) => ({
    family: /font-family:\s*'([^']+)'/.exec(body)[1],
    file: path.relative(root, path.join(dir, /url\(\.\/([^)]+)\)/.exec(body)[1])).replace(/\\/g, '/'),
    weight: /font-weight:\s*([^;]+);/.exec(body)[1],
    range: /unicode-range:\s*([^;]+);/.exec(body)[1]
  }));
}

/** The fonts client/styles.scss names for a language's script, in order ($gc-script-fonts). */
export function scriptFonts(scss) {
  const map = /\$gc-script-fonts:\s*\(([\s\S]*?)\n\);/.exec(scss)?.[1] ?? '';
  const fonts = {};
  for (const [, code, list] of map.matchAll(/^\s*'([^']+)':\s*"([^"]*)"/gm)) {
    fonts[code] = list.split(',').map((name) => name.trim().replace(/^'|'$/g, ''));
  }
  return fonts;
}

/** The ranges of a CSS unicode-range, as [first, last] code points. */
export const cssRanges = (range) =>
  range.split(',').map((part) => {
    const [first, last = first] = part.trim().replace(/^U\+/i, '').split('-');
    return [parseInt(first, 16), parseInt(last, 16)];
  });

/** The ranges of a fontconfig charset ("20-7e a0-17f"), as [first, last] code points. */
export const charsetRanges = (charset) =>
  charset
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const [first, last = first] = part.split('-');
      return [parseInt(first, 16), parseInt(last, 16)];
    });

const within = (ranges, point) => ranges.some(([first, last]) => point >= first && point <= last);

/** The code points of a text that a font must draw: not spaces, nor joiners and marks of direction. */
export const lettersOf = (text) =>
  [...new Set([...text].map((letter) => letter.codePointAt(0)))].filter(
    (point) => !/[\s\p{Cf}]/u.test(String.fromCodePoint(point))
  );

/** The character map of a font file, by fontconfig (every face of a collection). */
const charsetOfFile = (() => {
  const known = new Map();
  return (file) => {
    if (!known.has(file)) {
      const out = execFileSync('fc-query', ['--format=%{charset}\n', file], { encoding: 'utf8' });
      known.set(file, out.split('\n').flatMap(charsetRanges));
    }
    return known.get(file);
  };
})();

/** The installed fonts' files, by family name (fc-list). */
const installed = (() => {
  let families;
  return (family) => {
    if (!families) {
      families = new Map();
      const out = execFileSync('fc-list', ['--format=%{family}|%{file}\n'], { encoding: 'utf8' });
      for (const line of out.split('\n').filter(Boolean)) {
        const [names, file] = line.split('|');
        for (const name of names.split(',')) {
          const files = families.get(name) ?? [];
          families.set(name, [...files, file]);
        }
      }
    }
    return families.get(family) ?? [];
  };
})();

/** The faces and families a language's text is set in, in the order the browser tries them. */
function stackFor(code, scss) {
  const own = scriptFonts(scss)[code] ?? [];
  return ['Lora Variable', 'Noto Serif Variable', ...own];
}

/**
 * The letters of a text that none of a stack's fonts has: a served face counts for a letter
 * within its unicode-range, an installed family for any letter one of its files has.
 */
function missingLetters(text, stack, served) {
  return lettersOf(text).filter(
    (point) =>
      !stack.some((family) => {
        const faces = served.filter((face) => face.family === family);
        if (faces.length) {
          return faces.some(
            (face) => within(cssRanges(face.range), point) && within(charsetOfFile(path.join(root, face.file)), point)
          );
        }
        return installed(family).some((file) => within(charsetOfFile(file), point));
      })
  );
}

const fontFaces = (served) =>
  served
    .map(
      (face) =>
        `@font-face{font-family:'${face.family}';font-weight:${face.weight};font-display:block;` +
        `src:url('/${face.file}') format('woff2');unicode-range:${face.range}}`
    )
    .join('\n');

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The page drawn for a language: the brand, its heading and the photo. */
export function pageFor(code, heading, stack, served) {
  const language = languages.languageFor(code);
  const family = [...stack.map((name) => `'${name}'`), 'serif'].join(', ');
  const lineHeight = LINE_HEIGHTS[code] ?? 1.25;
  return `<!doctype html>
<html lang="${code}" dir="${language.dir}">
<head>
<meta charset="utf-8">
<style>
${fontFaces(served)}
html, body { margin: 0; }
body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: #f7f3ec; color: #2b2420;
  font-family: ${family}; font-synthesis: none; display: flex; }
.text { flex: 0 0 600px; box-sizing: border-box; padding: 56px 48px 48px; display: flex; flex-direction: column; }
.brand { display: flex; align-items: center; gap: 16px; font: 600 44px/1 'Lora Variable', serif; direction: ltr; }
[dir=rtl] .brand { flex-direction: row-reverse; justify-content: flex-end; }
.brand img { width: 64px; height: 64px; border-radius: 50%; }
.box { flex: 1; display: flex; align-items: center; min-height: 0; }
h1 { margin: 0; font-weight: 500; font-size: 72px; line-height: ${lineHeight}; overflow-wrap: anywhere; }
.site { font: 400 26px/1 'Lora Variable', serif; color: #9c3d1f; direction: ltr; }
[dir=rtl] .site { text-align: right; }
.photo { flex: 1; padding: 40px 40px 40px 0; display: flex; }
[dir=rtl] .photo { padding: 40px 0 40px 40px; }
.photo img { width: 100%; height: 100%; object-fit: cover; border-radius: 16px;
  box-shadow: 0 1px 2px rgba(43, 36, 32, 0.08), 0 8px 24px rgba(43, 36, 32, 0.12); }
</style>
</head>
<body>
<div class="text">
  <div class="brand"><img src="/client/public/images/logo.webp" alt=""><span>Glazecalc</span></div>
  <div class="box"><h1>${escape(heading)}</h1></div>
  <div class="site">glazecalcapp.com</div>
</div>
<div class="photo"><img src="/client/public/images/cone-packs-800.webp" alt=""></div>
</body>
</html>`;
}

/** A server for the repository's files, and the page of each language at /page/<code>. */
function serve(pages) {
  const types = { '.woff2': 'font/woff2', '.webp': 'image/webp' };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/page/')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(pages.get(url.pathname.slice(6)));
    }
    const file = path.join(root, decodeURIComponent(url.pathname));
    if (!file.startsWith(root) || !fs.existsSync(file)) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** The image's file name: its language and the start of its content's hash. */
export const imageName = (code, bytes, extension) =>
  `${code}.${crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 8)}.${extension}`;

async function main() {
  const asked = process.argv.slice(2);
  const codes = asked.length ? asked : languages.LIVE_LANGUAGES;
  const unknown = codes.filter((code) => !languages.LIVE_LANGUAGES.includes(code));
  if (unknown.length) throw new Error(`Not a live language: ${unknown.join(', ')}`);

  const scss = fs.readFileSync(path.join(root, 'client', 'styles.scss'), 'utf8');
  const served = [...fontsource('lora'), ...fontsource('noto-serif'), ...SERVED];
  const pages = new Map();
  const problems = [];
  for (const code of codes) {
    const messages = JSON.parse(fs.readFileSync(path.join(root, 'client', 'public', 'i18n', 'site', code + '.json')));
    const heading = messages.landing?.heading;
    if (!heading) {
      problems.push(`${code}: no site.landing.heading`);
      continue;
    }
    const stack = stackFor(code, scss);
    const missing = missingLetters(heading + 'Glazecalc glazecalcapp.com', stack, served);
    if (missing.length) {
      problems.push(
        `${code}: no font for ${missing.map((p) => 'U+' + p.toString(16).toUpperCase().padStart(4, '0')).join(' ')}` +
          ` (fonts: ${stack.join(', ')})`
      );
    }
    pages.set(code, pageFor(code, heading, stack, served));
  }
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }

  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve(pages);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    for (const code of codes) {
      await page.goto(`http://127.0.0.1:${server.address().port}/page/${code}`);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((image) => image.decode()));
        // The heading as large as its box holds, from 72 px down.
        const heading = document.querySelector('h1');
        const box = heading.parentElement;
        let size = 72;
        while (size > 32 && (heading.scrollHeight > box.clientHeight || heading.scrollWidth > box.clientWidth)) {
          size -= 2;
          heading.style.fontSize = size + 'px';
        }
        await document.fonts.ready;
      });
      let bytes = await page.screenshot({ type: 'png' });
      let extension = 'png';
      for (let quality = 85; bytes.length > MAX_BYTES && quality >= 50; quality -= 5) {
        bytes = await page.screenshot({ type: 'jpeg', quality });
        extension = 'jpg';
      }
      if (bytes.length > MAX_BYTES) throw new Error(`${code}: the image is ${bytes.length} bytes, over ${MAX_BYTES}`);
      const name = imageName(code, bytes, extension);
      for (const old of fs.readdirSync(OUT).filter((file) => file.startsWith(code + '.'))) {
        fs.rmSync(path.join(OUT, old));
      }
      fs.writeFileSync(path.join(OUT, name), bytes);
      manifest[code] = 'og/' + name;
      console.log(`${code}: og/${name} (${Math.round(bytes.length / 1024)} kB)`);
    }
  } finally {
    await browser.close();
    server.close();
  }
  const ordered = Object.fromEntries(
    languages.LIVE_LANGUAGES.filter((code) => manifest[code]).map((code) => [code, manifest[code]])
  );
  fs.writeFileSync(MANIFEST, JSON.stringify(ordered, null, 2) + '\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main();
}
