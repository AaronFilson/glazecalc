import fs from 'node:fs';
import path from 'node:path';
import { expect } from './support/app.ts';

// The Content-Security-Policy nginx adds to every reply in production and on
// staging (deploy/nginx). e2e/csp.spec.js loads every page under it; this
// keeps its shape and the two copies in step.
const NGINX = path.join(import.meta.dirname, '..', '..', 'deploy', 'nginx');
const policyIn = (file: string): string[] => {
  const text = fs.readFileSync(path.join(NGINX, file), 'utf8');
  const found = [...text.matchAll(/add_header Content-Security-Policy "([^"]+)" always;/g)].map((m) => m[1]!);
  expect(found, file).to.have.length(1);
  return found[0]!.split(/;\s*/);
};

describe('nginx Content-Security-Policy', () => {
  it('allows only this site by default, and no plugins, other bases, forms elsewhere or framing', () => {
    const policy = policyIn('glazecalc-proxy.conf');
    for (const directive of [
      "default-src 'self'",
      "connect-src 'self'",
      "img-src 'self' data:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ]) {
      expect(policy).to.include(directive);
    }
    // Nothing from another site anywhere.
    expect(policy.join(';')).not.to.match(/https?:|\*|'unsafe-eval'/);
  });

  it('is the same on staging', () => {
    expect(policyIn('glazecalc-staging.conf')).to.eql(policyIn('glazecalc-proxy.conf'));
  });
});
