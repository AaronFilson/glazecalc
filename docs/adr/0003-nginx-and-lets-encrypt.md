# 3. HTTPS with nginx and Let's Encrypt on the instance

Accepted, 2026-10-05.

## Context

The site needs HTTPS, security headers, and something in front of Node that handles slow clients,
compression and static caching, without adding much to the monthly bill.

## Decision

nginx from Debian's own packages runs on the host and proxies to the app on `127.0.0.1:3000`. A
Let's Encrypt certificate comes from certbot, also from Debian, and `certbot.timer` renews it.
`deploy/enable-https.sh` gets the first certificate after the DNS switch. nginx adds HSTS,
`nosniff`, a referrer policy and clickjacking protection (`X-Frame-Options` and
`frame-ancestors`), compresses responses, and logs requests (kept 14 days). The page's own
content security policy comes from the Angular build (`autoCsp`, with subresource integrity), so
its script hashes always match the build.

## Alternatives

- **An AWS load balancer with an ACM certificate:** certificates renew themselves, but it costs
  about $16-22 a month more, more than the instance.
- **CloudFront in front:** the same certificate convenience and a CDN, but more moving parts for a
  site this size, and caching rules for an app with private data.
- **Caddy:** automatic HTTPS with a shorter config, but nginx is the industry standard and worth
  knowing.

## Consequences

- No cost for certificates or a load balancer.
- One manual step (`enable-https.sh`) on a new instance, and the instance holds the private key.
- Only ports 80 and 443 are open; the app and MongoDB listen on the host's loopback only.
