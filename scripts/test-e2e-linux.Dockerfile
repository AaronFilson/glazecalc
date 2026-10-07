# The Ubuntu that CI runs on, with Node 24 and Playwright's Chromium and the
# Linux libraries and fonts it needs, installed as CI installs them (npx
# playwright install --with-deps chromium). scripts/test-e2e-linux.sh builds it
# once for each Ubuntu and Playwright version.
ARG UBUNTU
FROM node:24 AS node

FROM ubuntu:${UBUNTU}
ARG PLAYWRIGHT
COPY --from=node /usr/local/bin/node /usr/local/bin/
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
  && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx -y playwright@${PLAYWRIGHT} install --with-deps chromium && rm -rf /root/.npm
