// The kinds of record a user keeps, each served under /api/<path> by the same
// routes (server/lib/record_routes.ts), and the Trash they go to when removed
// (./trash_routes.ts). `fields` are what a user may set, `required` what a new
// record must have.
import type { Router } from 'express';
import recordRoutes from '../lib/record_routes.ts';
import Additive from '../models/additive.ts';
import Advice from '../models/advice.ts';
import Firing from '../models/firing.ts';
import Material from '../models/material.ts';
import Note from '../models/note.ts';
import Recipe from '../models/recipe.ts';
import trashRouter from './trash_routes.ts';

const records: Record<string, Router> = {
  additives: recordRoutes(Additive, {
    label: 'additive',
    area: 'additives',
    fields: [
      'name',
      'rawformula',
      'fields',
      'notes',
      'relatedTo',
      'percentmole',
      'loi',
      'molecularweight',
      'equivalent',
      'formulaweight',
      // A commercial stain, say: left out of the unity formula.
      'noChemistry'
    ],
    required: ['name', 'fields'],
    standard: true
  }),
  advice: recordRoutes(Advice, {
    label: 'advice',
    area: 'advice',
    fields: ['title', 'content', 'tags'],
    required: ['title', 'content', 'tags'],
    standard: true
  }),
  firing: recordRoutes(Firing, {
    label: 'firing',
    area: 'firing',
    fields: ['title', 'kiln', 'date', 'notes', 'fieldsIncluded', 'rows'],
    required: ['title', 'fieldsIncluded', 'rows']
  }),
  materials: recordRoutes(Material, {
    label: 'material',
    area: 'materials',
    fields: [
      'name',
      'rawformula',
      'relatedTo',
      'notes',
      'fields',
      'percentmole',
      'loi',
      'molecularweight',
      'equivalent',
      'formulaweight'
    ],
    required: ['name', 'fields', 'formulaweight', 'loi', 'molecularweight', 'percentmole', 'equivalent'],
    standard: true
  }),
  notes: recordRoutes(Note, {
    label: 'note',
    area: 'notes',
    fields: ['title', 'content', 'relatedCollection', 'relatedId'],
    required: ['content', 'relatedCollection', 'relatedId']
  }),
  // The client sends a changed recipe as { recipe: {...} }.
  recipe: recordRoutes(Recipe, {
    label: 'recipe',
    area: 'recipes',
    fields: ['title', 'date', 'notes', 'materials', 'additives', 'computed', 'includeAdditives', 'firing', 'sgTarget'],
    required: ['title', 'materials'],
    wrapper: { change: 'recipe' },
    standard: true
  }),
  // The Trash has routes of its own.
  trash: trashRouter
};

export default records;
