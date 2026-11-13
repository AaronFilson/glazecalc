// The kinds of record a user keeps, each served under /api/<path> by the same
// routes (server/lib/record_routes.ts), and the Trash they go to when removed
// (./trash_routes.ts). `fields` are what a user may set, `required` what a new
// record must have (server/lib/record_fields.ts, shared with the import).
import type { Router } from 'express';
import { addFiringLinkRoutes } from '../lib/firing_links.ts';
import { RECORD_FIELDS } from '../lib/record_fields.ts';
import recordRoutes from '../lib/record_routes.ts';
import { stopSharing } from '../lib/share_links.ts';
import Additive from '../models/additive.ts';
import Advice from '../models/advice.ts';
import Firing from '../models/firing.ts';
import Material from '../models/material.ts';
import Note from '../models/note.ts';
import Recipe from '../models/recipe.ts';
import trashRouter from './trash_routes.ts';

// The client sends a changed recipe as { recipe: {...} }. Its links to firing logs change one at a
// time (server/lib/firing_links.ts), so two pages open at once never overwrite each other's.
const recipeRoutes = recordRoutes(Recipe, {
  label: 'recipe',
  area: 'recipes',
  ...RECORD_FIELDS.recipes,
  wrapper: { change: 'recipe' },
  standard: true,
  // Its share link stops working, and stays stopped if the recipe is put back.
  onTrash: stopSharing
});
addFiringLinkRoutes(recipeRoutes);

const records = {
  additives: recordRoutes(Additive, {
    label: 'additive',
    area: 'additives',
    ...RECORD_FIELDS.additives,
    standard: true
  }),
  advice: recordRoutes(Advice, {
    label: 'advice',
    area: 'advice',
    ...RECORD_FIELDS.advice,
    standard: true
  }),
  firing: recordRoutes(Firing, {
    label: 'firing',
    area: 'firing',
    ...RECORD_FIELDS.firing
  }),
  materials: recordRoutes(Material, {
    label: 'material',
    area: 'materials',
    ...RECORD_FIELDS.materials,
    standard: true
  }),
  notes: recordRoutes(Note, {
    label: 'note',
    area: 'notes',
    ...RECORD_FIELDS.notes
  }),
  recipe: recipeRoutes,
  // The Trash has routes of its own.
  trash: trashRouter
} satisfies Record<string, Router>;

export default records;
