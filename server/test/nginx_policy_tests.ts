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

// The access log's request line (deploy/nginx): the provider sign-in's
// callback without its query, which carries the one-time code and the state;
// every other request line as it came. Checked here with the same pattern
// nginx uses (PCRE, which reads this one as JavaScript does).
const logMapIn = (file: string, format = 'glazecalc'): { block: string; rewrite: (request: string) => string } => {
  const text = fs.readFileSync(path.join(NGINX, file), 'utf8');
  const block = new RegExp(String.raw`map \$request \$${format}_request \{[^}]*\}\nlog_format ${format} '[^']*';`).exec(
    text
  );
  expect(block, file).to.not.eql(null);
  const rule = /"~\*([^"]+)" "\$1\$2";/.exec(block![0]);
  expect(rule, file).to.not.eql(null);
  const pattern = new RegExp(rule![1]!, 'i');
  return {
    block: block![0],
    rewrite: (request) => {
      const match = pattern.exec(request);
      return match ? match[1]! + (match[2] ?? '') : request;
    }
  };
};

describe('nginx access log', () => {
  it("writes a provider callback's request line without the code and state, and others unchanged", () => {
    const { block, rewrite } = logMapIn('glazecalc.conf');
    expect(block).to.include('"$glazecalc_request"');
    expect(rewrite('GET /api/auth/google/callback?code=4%2F0Ab&state=xyz HTTP/1.1')).to.eql(
      'GET /api/auth/google/callback HTTP/1.1'
    );
    expect(rewrite('GET /API/Auth/github/Callback/?code=abc&state=s HTTP/2.0')).to.eql(
      'GET /API/Auth/github/Callback/ HTTP/2.0'
    );
    for (const request of [
      'GET /api/auth/github/callback HTTP/1.1',
      'GET /api/recipe/list?page=2 HTTP/1.1',
      'GET /api/auth/google/start?next=/de/recipe HTTP/1.1',
      'GET /de/signin?provider=google HTTP/1.1',
      'garbage'
    ]) {
      expect(rewrite(request), request).to.eql(request);
    }
  });

  /** The log format each server block of a file writes its access log in. */
  const formatsIn = (file: string): string[] => {
    const text = fs.readFileSync(path.join(NGINX, file), 'utf8');
    const logs = [...text.matchAll(/access_log (\S+) (\S+);/g)].map((m) => m[2]!);
    expect(logs, file).to.have.length(text.match(/^server \{/gm)!.length);
    return [...new Set(logs)];
  };

  it('is the same before and after HTTPS, and every server writes it', () => {
    expect(logMapIn('glazecalc-http.conf').block).to.eql(logMapIn('glazecalc.conf').block);
    expect(formatsIn('glazecalc.conf')).to.eql(['glazecalc']);
    expect(formatsIn('glazecalc-http.conf')).to.eql(['glazecalc']);
  });

  it("is staging's own copy, under its own names, so staging never depends on production's file", () => {
    // enable-https.sh can install the staging file from a branch (GLAZECALC_STAGING_REF)
    // and production's from master: the staging file defines what it writes.
    const staging = logMapIn('glazecalc-staging.conf', 'glazecalc_staging');
    expect(staging.block.replaceAll('glazecalc_staging', 'glazecalc')).to.eql(logMapIn('glazecalc.conf').block);
    expect(staging.rewrite('GET /api/auth/google/callback?code=4%2F0Ab&state=xyz HTTP/1.1')).to.eql(
      'GET /api/auth/google/callback HTTP/1.1'
    );
    expect(formatsIn('glazecalc-staging.conf')).to.eql(['glazecalc_staging']);
  });
});

// What nginx compresses besides HTML: the sitemap (application/xml, about 1 MB)
// among them, the same in production and on staging.
describe('nginx compression', () => {
  const typesIn = (file: string): string[] => {
    const text = fs.readFileSync(path.join(NGINX, file), 'utf8');
    const found = [...text.matchAll(/^\s*gzip_types ([^;]+);/gm)].map((m) => m[1]!.split(/\s+/));
    expect(found, file).to.have.length(1);
    return found[0]!;
  };

  it('compresses the sitemap, scripts, styles, JSON and the manifest', () => {
    for (const type of [
      'application/xml',
      'text/css',
      'text/javascript',
      'application/json',
      'application/manifest+json',
      'text/plain'
    ]) {
      expect(typesIn('glazecalc-proxy.conf')).to.include(type);
    }
  });

  it('is the same on staging', () => {
    expect(typesIn('glazecalc-staging.conf')).to.eql(typesIn('glazecalc-proxy.conf'));
  });
});
