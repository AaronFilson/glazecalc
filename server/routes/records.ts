// The kinds of record a user keeps, each served under /api/<path> by the same
// routes (server/lib/record_routes.ts). `fields` are what a user may set,
// `required` what a new record must have.
import type { Router } from 'express';
import recordRoutes from '../lib/record_routes.ts';
import Additive from '../models/additive.ts';
import Advice from '../models/advice.ts';
import Firing from '../models/firing.ts';
import Material from '../models/material.ts';
import Note from '../models/note.ts';
import Recipe from '../models/recipe.ts';
import Trash from '../models/trash.ts';

const records: Record<string, Router> = {
  additives: recordRoutes(Additive, {
    label: 'additive',
    plural: 'additives',
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
      'formulaweight'
    ],
    required: ['name', 'fields'],
    standard: true
  }),
  advice: recordRoutes(Advice, {
    label: 'advice',
    plural: 'pieces of advice',
    fields: ['title', 'content', 'tags'],
    required: ['title', 'content', 'tags'],
    standard: true
  }),
  firing: recordRoutes(Firing, {
    label: 'firing',
    plural: 'firing logs',
    fields: ['title', 'kiln', 'date', 'notes', 'fieldsIncluded', 'rows'],
    required: ['title', 'fieldsIncluded', 'rows']
  }),
  materials: recordRoutes(Material, {
    label: 'material',
    plural: 'materials',
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
    plural: 'notes',
    fields: ['title', 'content', 'relatedCollection', 'relatedId'],
    required: ['content', 'relatedCollection', 'relatedId']
  }),
  // The client sends a changed recipe as { recipe: {...} }.
  recipe: recordRoutes(Recipe, {
    label: 'recipe',
    plural: 'recipes',
    fields: ['title', 'date', 'notes', 'materials', 'additives', 'computed', 'includeAdditives'],
    required: ['title', 'materials'],
    wrapper: { change: 'recipe' },
    standard: true
  }),
  // ...and trash as { trash: {...} }, both new and changed.
  trash: recordRoutes(Trash, {
    label: 'trash',
    plural: 'items in the trash',
    fields: ['content', 'date', 'fromCollection'],
    required: ['content', 'date', 'fromCollection'],
    wrapper: { create: 'trash', change: 'trash' }
  })
};

export default records;
