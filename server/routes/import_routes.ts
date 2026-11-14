// Importing an account export into the signed-in account (server/lib/import_data.ts).
//
//   POST /api/import/preview   { file, choices?, include? }  what the import would do; writes nothing
//   POST /api/import           the same body                  the import; { importId, undoUntil, counts }
//   POST /api/import/undo/:id  takes that import back, within IMPORT_UNDO_HOURS
//
// The web session of an account only: never a trial (403 account-needed) and
// never an access token or connected app (app.ts mounts this below
// refuseAccessTokens), so nothing but the person can write records in bulk.
// The two routes that take a file read up to IMPORT_BODY_LIMIT, the only ones
// that take more than the usual body; nginx allows the same on these paths
// (deploy/nginx/glazecalc-proxy.conf). A body with more lists and objects than
// a real file holds (IMPORT_CONTAINERS_MOST) is refused as too large before it
// is read, as reading it could take more memory than the server has.
import express from 'express';
import {
  fewEnoughContainers,
  IMPORT_BODY_LIMIT,
  previewImport,
  runImport,
  undoImport,
  type ImportRequest
} from '../lib/import_data.ts';
import { notGuest } from '../lib/guest_limits.ts';
import jwtAuth, { userOf } from '../lib/jwt_auth.ts';
import * as limits from '../lib/rate_limit.ts';

const importRouter = express.Router();
export default importRouter;

const bigJson = express.json({ limit: IMPORT_BODY_LIMIT, verify: fewEnoughContainers });
const requestOf = (body: unknown): ImportRequest => (body && typeof body === 'object' ? body : {}) as ImportRequest;

importRouter.post('/preview', jwtAuth, notGuest, limits.importPreviews, bigJson, async (req, res) => {
  const { status, body } = await previewImport(userOf(req), requestOf(req.body));
  res.status(status).json(body);
});

importRouter.post('/', jwtAuth, notGuest, limits.imports, bigJson, async (req, res) => {
  const { status, body } = await runImport(userOf(req), requestOf(req.body));
  res.status(status).json(body);
});

importRouter.post('/undo/:id', jwtAuth, notGuest, async (req, res) => {
  const { status, body } = await undoImport(userOf(req), String(req.params.id));
  res.status(status).json(body);
});
