// The UUIDs (docs/adr/0030-nameless-chemistry-core.md): every material and additive has one, a new
// one gets one, and the start-up migration gives the older records theirs and fills in the lines of
// older recipes from the names they hold, the owner's own record before the standard library's.
import { Types } from 'mongoose';
import standardData from '../../data/index.js';
import { addMissingUuids } from '../lib/uuid_migration.ts';
import Additive from '../models/additive.ts';
import Material from '../models/material.ts';
import Recipe from '../models/recipe.ts';
import { expect, makeUser } from './support/app.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('UUIDs: records and recipe lines', () => {
  it('gives every standard record its own, fixed in data/', () => {
    const records = [...standardData.load('materials'), ...standardData.load('additives')] as Array<{ uuid?: string }>;
    expect(records.every((record) => UUID.test(record.uuid ?? ''))).to.equal(true);
    expect(new Set(records.map((record) => record.uuid)).size).to.equal(records.length);
  });

  it('gives a new record one of its own', async () => {
    const { user } = await makeUser();
    const made = await Material.create({
      name: 'My spar',
      ownedBy: String(user._id),
      fields: [{ name: 'SiO2', amount: '70' }],
      percentmole: 'percent',
      equivalent: 1,
      formulaweight: 1,
      loi: 0,
      molecularweight: 1
    });
    expect(made.uuid).to.match(UUID);
  });

  it('keeps a UUID a new record brings only if no other record has it', async () => {
    const { user } = await makeUser();
    const shape = {
      ownedBy: String(user._id),
      fields: [{ name: 'SiO2', amount: '70' }],
      percentmole: 'percent' as const,
      equivalent: 1,
      formulaweight: 1,
      loi: 0,
      molecularweight: 1
    };
    const first = await Material.create({ ...shape, name: 'Mine', uuid: '00000000-0000-4000-8000-0000000000aa' });
    expect(first.uuid).to.equal('00000000-0000-4000-8000-0000000000aa');
    // A copy of it (or of a standard record) is another record: it gets its own.
    const copy = await Material.create({ ...shape, name: 'Mine (copy)', uuid: first.uuid });
    expect(copy.uuid).to.match(UUID).and.not.equal(first.uuid);
  });

  it('gives older records and recipe lines theirs, the owner’s own before the standard, and is safe to repeat', async () => {
    const { user } = await makeUser();
    const owner = String(user._id);
    const own = new Types.ObjectId();
    await Material.collection.insertOne({
      _id: own,
      name: 'Silica',
      ownedBy: owner,
      fields: [],
      percentmole: 'percent'
    });
    const standard = new Types.ObjectId();
    const standardUuid = '00000000-0000-4000-8000-000000000001';
    await Material.collection.insertOne({
      _id: standard,
      name: 'Whiting (uuid test)',
      ownedBy: 'Standard',
      uuid: standardUuid,
      fields: [],
      percentmole: 'percent'
    });
    const additive = new Types.ObjectId();
    await Additive.collection.insertOne({ _id: additive, name: 'My iron', ownedBy: owner, fields: [] });
    const recipe = new Types.ObjectId();
    await Recipe.collection.insertOne({
      _id: recipe,
      ownedBy: owner,
      title: 'Old',
      materials: [
        { name: 'Silica', amount: '30' },
        { name: 'Whiting (uuid test)', amount: '20' },
        { name: 'Nobody has this', amount: '1' }
      ],
      additives: [{ name: 'My iron', amount: '2' }]
    });

    const first = await addMissingUuids();
    expect(first.records).to.be.at.least(2);
    expect(first.recipes).to.be.at.least(1);
    const ownUuid = ((await Material.collection.findOne({ _id: own })) as { uuid?: string }).uuid;
    expect(ownUuid).to.match(UUID);
    const ironUuid = ((await Additive.collection.findOne({ _id: additive })) as { uuid?: string }).uuid;
    const lines = (await Recipe.collection.findOne({ _id: recipe })) as unknown as {
      materials: Array<{ name: string; uuid?: string }>;
      additives: Array<{ name: string; uuid?: string }>;
    };
    expect(lines.materials.map((line) => line.uuid)).to.eql([ownUuid, standardUuid, undefined]);
    expect(lines.additives[0]!.uuid).to.equal(ironUuid);

    const second = await addMissingUuids();
    expect(second.recipes).to.equal(0);
    expect(((await Material.collection.findOne({ _id: own })) as { uuid?: string }).uuid).to.equal(ownUuid);
  });
});
