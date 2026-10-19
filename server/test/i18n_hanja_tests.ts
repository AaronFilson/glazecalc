import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkHanja } from '../../scripts/i18n-check.mjs';
import { expect } from './support/app.ts';

// Korean is written in Hangul (scripts/i18n-check.mjs, checkHanja): hanja in a
// Korean message or guide only where its glossary gives them.
describe('the hanja check', () => {
  let dir: string;
  let glossary: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'hanja-'));
    mkdirSync(path.join(dir, 'recipe'));
    mkdirSync(path.join(dir, 'guides', 'firing'), { recursive: true });
    writeFileSync(path.join(dir, 'en.json'), JSON.stringify({ material: 'Feldspar', fire: 'Fire to 1222 °C.' }));
    glossary = path.join(dir, 'ko.md');
    writeFileSync(glossary, '| feldspar | 장석(長石) | the hanja after the term, once |\n');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('passes Korean in Hangul, and hanja its glossary gives', () => {
    writeFileSync(path.join(dir, 'ko.json'), JSON.stringify({ material: '장석(長石)', fire: '1222 °C로 소성하세요.' }));
    writeFileSync(path.join(dir, 'guides', 'firing', 'ko.md'), '# 소성\n\n콘이 휘어집니다.\n');
    expect(checkHanja({ dir, glossary })).to.eql([]);
  });

  it('finds hanja in a Korean message or guide that the glossary does not give', () => {
    writeFileSync(path.join(dir, 'ko.json'), JSON.stringify({ material: '장석', fire: '1222 °C로 燒成하세요.' }));
    writeFileSync(path.join(dir, 'recipe', 'ko.json'), JSON.stringify({ save: { name: '長石釉 저장' } }));
    writeFileSync(path.join(dir, 'guides', 'firing', 'ko.md'), '# 소성\n\n콘(錐)이 휘어집니다.\n');
    expect(checkHanja({ dir, glossary })).to.eql([
      'app ko fire: Korean is written in Hangul, not hanja such as 燒成 (or give them in its glossary)',
      'recipe ko save.name: Korean is written in Hangul, not hanja such as 長石釉 (or give them in its glossary)',
      'guides/firing/ko.md: Korean is written in Hangul, not hanja such as 錐 (or give them in its glossary)'
    ]);
  });

  it('leaves a guide section still in English alone, though it quotes Japanese', () => {
    writeFileSync(
      path.join(dir, 'guides', 'firing', 'ko.md'),
      '# 소성\n\n콘이 휘어집니다.\n\n## SK cones {#sk-cones lang=en}\n\nKyoto cones (京都ゼーゲル).\n\n## 출처 {#sources}\n\n콘(錐).\n'
    );
    expect(checkHanja({ dir, glossary })).to.eql([
      'guides/firing/ko.md: Korean is written in Hangul, not hanja such as 錐 (or give them in its glossary)'
    ]);
  });

  it('leaves the other languages alone, Japanese and Chinese above all', () => {
    writeFileSync(path.join(dir, 'ja.json'), JSON.stringify({ material: '長石' }));
    writeFileSync(path.join(dir, 'zh-Hant.json'), JSON.stringify({ material: '長石' }));
    expect(checkHanja({ dir, glossary: path.join(dir, 'none.md') })).to.eql([]);
  });

  it('allows no hanja where Korean has no glossary yet', () => {
    writeFileSync(path.join(dir, 'ko.json'), JSON.stringify({ material: '장석(長石)' }));
    expect(checkHanja({ dir, glossary: path.join(dir, 'none.md') })).to.have.length(1);
  });
});
