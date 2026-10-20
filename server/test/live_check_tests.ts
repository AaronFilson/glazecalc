import fs from 'node:fs';
import path from 'node:path';
import { headerProblems, oembedFor, pagesToCheck, videosIn } from '../../scripts/live-check.mjs';
import { expect } from './support/app.ts';

// The checks of a deployed site (scripts/live-check.mjs): the headers it asks
// for are the ones nginx's files add, production's and staging's.
describe('the live checks', () => {
  /** The headers an nginx file adds (add_header ... always), as a reply carries them. */
  const nginxHeaders = (file: string): Record<string, string> =>
    Object.fromEntries(
      [
        ...fs
          .readFileSync(path.join(import.meta.dirname, '..', '..', 'deploy', 'nginx', file), 'utf8')
          .matchAll(/^\s*add_header ([\w-]+) (?:"([^"]*)"|(\S+)) always;/gm)
      ].map(([, name, quoted, bare]) => [name.toLowerCase(), quoted ?? bare])
    );
  const production = {
    ...nginxHeaders('glazecalc.conf'),
    ...nginxHeaders('glazecalc-proxy.conf')
  };
  const staging = nginxHeaders('glazecalc-staging.conf');

  it("passes production's and staging's headers as nginx's files set them", () => {
    expect(headerProblems(production, 'https://glazecalcapp.com')).to.deep.equal([]);
    expect(headerProblems(staging, 'https://staging.glazecalcapp.com')).to.deep.equal([]);
  });

  it('fails a reply without the policy, or with only the app’s', () => {
    const appOnly = { ...production, 'content-security-policy': "connect-src 'self'; form-action 'self'" };
    expect(headerProblems(appOnly, 'https://glazecalcapp.com')).to.have.length(1);
    const none = { ...production };
    delete none['content-security-policy'];
    expect(headerProblems(none, 'https://glazecalcapp.com')[0]).to.match(/Content-Security-Policy/);
  });

  it("fails staging's site on production and production's on staging", () => {
    expect(headerProblems(staging, 'https://glazecalcapp.com')).to.deep.equal([
      'production says X-Robots-Tag: noindex (a staging file?)'
    ]);
    expect(headerProblems(production, 'https://staging.glazecalcapp.com')).to.deep.equal([
      'staging lacks X-Robots-Tag: noindex'
    ]);
  });

  it('reads two policies in one header, as fetch joins them', () => {
    const both = new Headers(production);
    both.set('content-security-policy', "connect-src 'self', " + production['content-security-policy']);
    expect(headerProblems(both, 'https://glazecalcapp.com')).to.deep.equal([]);
  });

  it('checks each live language’s home and the English public pages, once each', () => {
    const list = pagesToCheck();
    expect(list).to.include.members(['/', '/de/', '/guides/firing', '/signup']);
    expect(new Set(list).size).to.equal(list.length);
  });

  it("can check John Britt's videos the course companion links, by YouTube's oEmbed, when asked", () => {
    const guide = fs.readFileSync(
      path.join(
        import.meta.dirname,
        '..',
        '..',
        'client',
        'public',
        'i18n',
        'guides',
        'learn-with-john-britt',
        'en.md'
      ),
      'utf8'
    );
    const videos = videosIn(guide);
    expect(videos).to.have.length(49);
    expect(videos[0]).to.eql({
      title: 'Description of UMF (Unity Molecular Formula) Structure (Free Online Glaze Class Pt. 1 )',
      url: 'https://www.youtube.com/watch?v=YNWdd6R6a4Q'
    });
    expect(videosIn('[a](https://www.youtube.com/watch?v=x1) [b](https://www.youtube.com/watch?v=x1)')).to.have.length(
      1
    );
    expect(oembedFor('https://www.youtube.com/watch?v=_r1pAjX_RQU')).to.equal(
      'https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D_r1pAjX_RQU'
    );
    // Never part of the checks after a deploy.
    const workflow = fs.readFileSync(
      path.join(import.meta.dirname, '..', '..', '.github', 'workflows', 'live-checks.yml'),
      'utf8'
    );
    expect(workflow).not.to.include('--videos');
  });
});
