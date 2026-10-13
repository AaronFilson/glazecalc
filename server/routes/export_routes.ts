// "Download my data": everything the signed-in account (or trial) holds, as files.
//
//   GET /api/export                JSON: { format, version, exportedAt, account, preferences, shelf, records }
//   GET /api/export/recipes.csv    recipes, a row for each ingredient
//   GET /api/export/materials.csv  the user's own materials, a row each
//
// Every reply is an attachment and is never kept by a cache.
import express, { type Response } from 'express';
import { exportAccount, materialsCsv, recipesCsv } from '../lib/export_data.ts';
import jwtAuth, { userOf } from '../lib/jwt_auth.ts';
import { say } from '../lib/messages.ts';

const exportRouter = express.Router();
export default exportRouter;

const download = (res: Response, filename: string, type: string, body: string): void => {
  const day = new Date().toISOString().slice(0, 10);
  res
    .set('Cache-Control', 'no-store')
    .set('Content-Disposition', `attachment; filename="${filename.replace('.', `-${day}.`)}"`)
    .type(type)
    .send(body);
};

exportRouter.get('/', jwtAuth, async (req, res) => {
  const data = await exportAccount(userOf(req)._id);
  if (!data) return res.status(404).json(say('no-user'));
  return download(res, 'glazecalc-data.json', 'application/json', JSON.stringify(data, null, 2));
});

exportRouter.get('/recipes.csv', jwtAuth, async (req, res) => {
  download(res, 'glazecalc-recipes.csv', 'text/csv; charset=utf-8', await recipesCsv(userOf(req)._id));
});

exportRouter.get('/materials.csv', jwtAuth, async (req, res) => {
  download(res, 'glazecalc-materials.csv', 'text/csv; charset=utf-8', await materialsCsv(userOf(req)._id));
});
