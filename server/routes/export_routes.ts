// "Download my data": everything the signed-in account (or trial) holds, as files.
//
//   GET /api/export                JSON: { format, version, exportedAt, account, preferences, shelf, prices, records }
//   GET /api/export/recipes.csv    recipes, a row for each ingredient
//   GET /api/export/materials.csv  the user's own materials, a row each
//
// Every reply is an attachment and is never kept by a cache. Each is written a
// record at a time as it is read (server/lib/export_data.ts).
import express, { type Response } from 'express';
import { exportJson, materialsCsv, recipesCsv } from '../lib/export_data.ts';
import jwtAuth, { userOf } from '../lib/jwt_auth.ts';
import { say } from '../lib/messages.ts';
import { sendParts } from '../lib/stream_json.ts';

const exportRouter = express.Router();
export default exportRouter;

const download = (res: Response, filename: string, type: string, body: AsyncIterable<string>): Promise<void> => {
  const day = new Date().toISOString().slice(0, 10);
  res
    .set('Cache-Control', 'no-store')
    .set('Content-Disposition', `attachment; filename="${filename.replace('.', `-${day}.`)}"`)
    .type(type);
  return sendParts(res, body);
};

exportRouter.get('/', jwtAuth, async (req, res) => {
  const data = await exportJson(userOf(req)._id);
  if (!data) return res.status(404).json(say('no-user'));
  return download(res, 'glazecalc-data.json', 'application/json; charset=utf-8', data);
});

exportRouter.get('/recipes.csv', jwtAuth, async (req, res) => {
  await download(res, 'glazecalc-recipes.csv', 'text/csv; charset=utf-8', recipesCsv(userOf(req)._id));
});

exportRouter.get('/materials.csv', jwtAuth, async (req, res) => {
  await download(res, 'glazecalc-materials.csv', 'text/csv; charset=utf-8', materialsCsv(userOf(req)._id));
});
