import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'chai';

const I18N = path.join(import.meta.dirname, '../../client/public/i18n');
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(I18N, file), 'utf8'));

/** A guide's own title, from its Markdown's front matter. */
const guideTitle = (guide: string, language: string) => {
  const text = fs.readFileSync(path.join(I18N, 'guides', guide, language + '.md'), 'utf8');
  return /^---\n[\s\S]*?^title:\s*(.+)$/m.exec(text)![1]!.trim();
};

describe('the home safety guide, by name', () => {
  const languages = fs
    .readdirSync(path.join(I18N, 'guides', 'home-safety'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.slice(0, -'.md'.length));

  it("should be called by its own title in the guides list and the page's title, in every language (the owner's choice)", () => {
    expect(languages).to.include('en');
    for (const language of languages) {
      const title = guideTitle('home-safety', language);
      const list = read(path.join('guides', language + '.json')).list?.homeSafety?.title;
      const page = read(language + '.json').titles?.homeSafety;
      expect(list, language).to.equal(title);
      expect(page, language).to.match(/ [-–] Glazecalc$/);
      expect(page.replace(/ [-–] Glazecalc$/, ''), language).to.equal(title);
    }
  });
});
