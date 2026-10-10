# The browser tests' Linux: Playwright's own image for the version in
# package.json (Ubuntu 24.04 with Chromium, its libraries and a fixed set of
# fonts), with Node 24. CI and npm run test:e2e:linux both run the tests in it,
# so a page lays out the same in both; a new image comes only with a new
# Playwright. scripts/test-e2e-linux.sh builds it once for each version.
ARG PLAYWRIGHT
FROM node:24 AS node

FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT}-noble
COPY --from=node /usr/local/bin/node /usr/local/bin/
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
  && ln -sf ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
