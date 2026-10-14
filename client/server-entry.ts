// The build's server bundle is only for the prerender (scripts/prerender.mjs),
// which uses main.server.ts. The CLI asks for a request handler as well, and
// nothing runs this one: the Express server in server/ answers requests.
export default {};
