# syntax=docker/dockerfile:1

# Glazecalc: one Node server for the Angular client and the JSON API (/api).
#
#   docker build -t glazecalc .
#   docker compose up              (app + MongoDB, see compose.yaml)
#
# node:24-slim is Debian-based, which bcrypt's prebuilt binaries need (glibc).
# Base images are pinned by digest for repeatable builds; Dependabot proposes
# updates. (Written out in each FROM because Dependabot cannot follow an ARG.)

# All dependencies, including the Angular build tools.
FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# Production build of the client into dist/glazecalc/browser.
FROM deps AS build
COPY angular.json tsconfig.json tsconfig.app.json ./
COPY client ./client
COPY lib ./lib
RUN npm run build

# Only the packages the server needs at run time.
FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json server.js materials.json additives.json advice.json ./
COPY server ./server
COPY lib ./lib
COPY scripts/seed-standard.js ./scripts/
COPY --from=build /app/dist/glazecalc/browser ./dist/glazecalc/browser

# The official Node images include an unprivileged "node" user.
USER node
EXPOSE 3000
# The slim image has no curl, so the check uses Node's built-in fetch.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "server.js"]
