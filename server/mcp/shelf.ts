// The materials an account has on hand (its shelf, as Match with what I have
// keeps it: library keys, PUT /api/shelf), as the MCP tools read them: for
// get_shelf and match_with_what_i_have (tools/account.ts), and for
// solve_target with "on hand" (tools/public.ts).
import mongoose from 'mongoose';
import type { MaterialRecord } from '../../lib/recipe/index.js';
import Material from '../models/material.ts';
import User from '../models/user.ts';
import { findById, findMaterial } from './library.ts';

/** The account's shelf as the recipe tools read it; keys no longer found are left out and counted. */
export const shelfMaterials = async (userId: string): Promise<{ materials: MaterialRecord[]; missing: number }> => {
  const user = await User.findById(userId, { shelf: 1 });
  const keys = user?.shelf ?? [];
  const ownIds = keys.filter((key) => mongoose.isObjectIdOrHexString(key) && !findById(key));
  const own = ownIds.length ? await Material.find({ _id: { $in: ownIds }, ownedBy: userId }).lean() : [];
  const ownById = new Map(own.map((m) => [String(m._id), m as unknown as MaterialRecord]));
  const materials: MaterialRecord[] = [];
  let missing = 0;
  for (const key of keys) {
    const found = key.startsWith('name:') ? findMaterial(key.slice(5)) : (findById(key) ?? ownById.get(key));
    if (found) materials.push(found);
    else missing++;
  }
  return { materials, missing };
};
