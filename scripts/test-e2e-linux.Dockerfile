# Node 24 with Playwright's Chromium and the Linux libraries and fonts it needs,
# installed as CI installs them (npx playwright install --with-deps chromium).
# scripts/test-e2e-linux.sh builds it once for each Playwright version.
FROM node:24
ARG PLAYWRIGHT
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx -y playwright@${PLAYWRIGHT} install --with-deps chromium && rm -rf /root/.npm
