// Read-only share links to a recipe (docs/adr/0020-share-links.md).
//
// The owner, signed in on the website (not a trial, not an access token):
//
//   GET    /api/share/recipe/:id   { shared: false }, or { shared: true, createdAt, includeNotes }
//   POST   /api/share/recipe/:id   { includeNotes }: makes the recipe's link, replacing any
//                                  it had (the old one stops working); answers with
//                                  { secret, createdAt, includeNotes }, the only time the
//                                  secret is ever sent: only its hash is kept
//   PUT    /api/share/recipe/:id   { includeNotes }: whether the shared page shows the notes
//   DELETE /api/share/recipe/:id   stops sharing: the link no longer opens the recipe
//
// Each answers 404 for a recipe that is not the account's.
//
// Anyone holding a link:
//
//   GET    /api/shared/recipe      the recipe, for the secret sent in X-Share-Secret
//                                  (never in the address, which logs keep); 404
//                                  not-shared for a link that opens nothing
//
// The link is /shared#<secret>: the part after # never leaves the browser, so
// the server's and nginx's logs never see it, and no Referer carries it.
import express, { type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { notGuest } from '../lib/guest_limits.ts';
import jwtAuth, { userOf } from '../lib/jwt_auth.ts';
import { say } from '../lib/messages.ts';
import * as limits from '../lib/rate_limit.ts';
import { hashOf, linkOf, newSecret, openShared, stopSharing } from '../lib/share_links.ts';
import Recipe from '../models/recipe.ts';
import ShareLink from '../models/share_link.ts';

/** The header the shared page sends the link's secret in. */
export const SECRET_HEADER = 'X-Share-Secret';

/** Headers for anything a share link opens: no index, no cache, no Referer onward. */
export const privateHeaders = (res: Response): void => {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('Cache-Control', 'no-store');
};

export const shareRouter = express.Router();
const jsonParser = express.json();

/** The recipe in the address, if it is the signed-in account's; otherwise answers 400 or 404. */
const ownRecipe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json(say('invalid-id'));
    return;
  }
  const found = await Recipe.exists({ _id: req.params.id, ownedBy: userOf(req).id });
  if (!found) {
    res.status(404).json(say('record-not-found', { label: 'recipe' }));
    return;
  }
  next();
};

const includeNotesIn = (req: Request): boolean =>
  (req.body as { includeNotes?: unknown } | undefined)?.includeNotes === true;

shareRouter.use(jwtAuth, notGuest);

shareRouter.get('/recipe/:id', ownRecipe, async (req, res) => {
  const link = await linkOf(req.params.id as string, userOf(req).id);
  res.status(200).json(link ? { shared: true, ...link } : { shared: false });
});

shareRouter.post('/recipe/:id', jsonParser, ownRecipe, async (req, res) => {
  const ownedBy = userOf(req).id as string;
  const secret = newSecret();
  const createdAt = new Date();
  const includeNotes = includeNotesIn(req);
  // One link a recipe: a new one takes the old one's place, in one step.
  await ShareLink.findOneAndUpdate(
    { recipeId: req.params.id, ownedBy },
    { $set: { hash: hashOf(secret), createdAt, includeNotes } },
    { upsert: true }
  );
  res.status(200).json({ secret, createdAt, includeNotes });
});

shareRouter.put('/recipe/:id', jsonParser, ownRecipe, async (req, res) => {
  const includeNotes = includeNotesIn(req);
  const changed = await ShareLink.updateOne(
    { recipeId: req.params.id, ownedBy: userOf(req).id },
    { $set: { includeNotes } }
  );
  if (!changed.matchedCount) {
    res.status(404).json(say('not-shared'));
    return;
  }
  res.status(200).json({ includeNotes });
});

shareRouter.delete('/recipe/:id', ownRecipe, async (req, res) => {
  await stopSharing(req.params.id as string, userOf(req).id as string);
  res.status(200).json(say('share-stopped'));
});

export const sharedRouter = express.Router();

sharedRouter.get('/recipe', limits.sharedViews, limits.sharedMisses, async (req, res) => {
  privateHeaders(res);
  const recipe = await openShared(String(req.get(SECRET_HEADER) ?? ''));
  if (!recipe) {
    res.status(404).json(say('not-shared'));
    return;
  }
  res.status(200).json(recipe);
});
