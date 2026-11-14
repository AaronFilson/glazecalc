/* global __ENV */
// A load test of the app as production runs it, with k6 (.github/workflows/load.yml runs it on an
// arm64 runner against the production image held to the live instance's size). Visitors open the
// public pages a first visit opens, the prerendered ones Node compresses for each reply, and about one
// in three also asks for the standard library, as the recipe page does.
//
//   k6 run -e BASE=http://127.0.0.1:3000 scripts/load/glazecalc.k6.mjs
//
// It fails if more than 1% of requests fail, or if the 95th percentile passes 500 ms. Rate limits are
// for one address's sign-ins and the like; a test from one address needs them off (RATE_LIMITS=off).
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE || 'http://127.0.0.1:3000';

/** Public pages, each prerendered (lib/pages.js). */
const PAGES = ['/', '/materials', '/materials/ferro-frit-3134', '/guides/glazing-basics', '/cones', '/about'];

export const options = {
  scenarios: {
    visitors: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 50 },
        { duration: '60s', target: 50 },
        { duration: '5s', target: 0 }
      ]
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500']
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max']
};

export default function visit() {
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];
  const res = http.get(BASE + page, { headers: { 'Accept-Encoding': 'br, gzip' } });
  check(res, { 'a page': (r) => r.status === 200 && r.body.length > 0 });
  if (Math.random() < 1 / 3) {
    const library = http.get(BASE + '/api/materials/getStandard');
    check(library, { 'the standard library': (r) => r.status === 200 });
  }
}
