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
const logMapIn = (file: string): { block: string; rewrite: (request: string) => string } => {
  const text = fs.readFileSync(path.join(NGINX, file), 'utf8');
  const block = /map \$request \$glazecalc_request \{[^}]*\}\nlog_format glazecalc '[^']*';/.exec(text);
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

  it('is the same before and after HTTPS, and staging uses it', () => {
    expect(logMapIn('glazecalc-http.conf').block).to.eql(logMapIn('glazecalc.conf').block);
    const staging = fs.readFileSync(path.join(NGINX, 'glazecalc-staging.conf'), 'utf8');
    const logs = [...staging.matchAll(/access_log (\S+) (\S+);/g)].map((m) => m[2]);
    expect(logs).to.have.length.above(0);
    expect(new Set(logs)).to.eql(new Set(['glazecalc']));
  });
});
