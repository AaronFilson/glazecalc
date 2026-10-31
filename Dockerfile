# syntax=docker/dockerfile:1

# Glazecalc: one Node server for the Angular client and the JSON API (/api).
#
#   docker build -t glazecalc .
#   docker compose up              (app + MongoDB, see compose.yaml)
#
# node:24-slim is Debian-based, which bcrypt's prebuilt binaries need (glibc).
# Base images are pinned by digest for repeatable builds; Dependabot proposes
# updates. (Written out in each FROM because Dependabot cannot follow an ARG.)

# All dependencies, including the Angular build tools. This stage and the build
# below run on the machine's own platform ($BUILDPLATFORM): their output, the
# client in dist/, is the same on any platform, and only the stages after them
# are made for the target. CI builds each platform on a runner of that platform,
# where $BUILDPLATFORM is the target, so this changes nothing there; a cross
# build (scripts/build-staging.sh, arm64 on an amd64 PC) then runs the Angular
# build natively instead of under emulation.
FROM --platform=$BUILDPLATFORM node:24-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# Production build of the client into dist/glazecalc/browser, and the public
# pages rendered ahead of time into dist/glazecalc/prerendered (scripts/prerender.mjs),
# and the skills as ZIPs to download (scripts/build-skills.mjs), and the service worker
# with its manifest and the offline page (scripts/service-worker.mjs). The build first
# writes lib/regions/locale-fallback-data.json (scripts/locale-fallback.mjs), which
# Prettier formats with .prettierrc.json.
FROM deps AS build
COPY angular.json ngsw-config.json tsconfig.json tsconfig.app.json LICENSE .prettierrc.json ./
COPY client ./client
COPY lib ./lib
COPY skills ./skills
COPY data ./data
COPY scripts/prerender.mjs scripts/advice-i18n.mjs scripts/material-i18n.mjs scripts/locale-fallback.mjs scripts/service-worker.mjs scripts/build-skills.mjs ./scripts/
RUN npm run build

# Only the packages the server needs at run time.
FROM node:24-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

FROM node:24-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS runtime
# This code honours two-step sign-in. deploy/deploy.sh refuses an image without
# this label (older code would sign accounts in with the password alone) unless
# told --allow-pre-mfa. Never remove it.
LABEL com.glazecalcapp.two-step-sign-in="1"
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY data ./data
COPY server ./server
COPY lib ./lib
# The MCP prompt dictation reads the skill's own files (server/mcp/dictation.ts).
COPY skills ./skills
COPY scripts/seed-standard.js ./scripts/
COPY --from=build /app/dist/glazecalc/browser ./dist/glazecalc/browser
COPY --from=build /app/dist/glazecalc/prerendered ./dist/glazecalc/prerendered

# The official Node images include an unprivileged "node" user.
USER node
EXPOSE 3000
# The slim image has no curl, so the check uses Node's built-in fetch.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
# The server is TypeScript; Node 24 runs it as it is, removing the types as it loads.
CMD ["node", "server/main.ts"]
