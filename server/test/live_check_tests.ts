import fs from 'node:fs';
import path from 'node:path';
import { headerProblems, pagesToCheck } from '../../scripts/live-check.mjs';
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
});
