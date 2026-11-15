'use strict';

/**
 * Which lines of the corner recipes are the same material: by saved id, else by name and the chemistry the
 * line carries (its fields, LOI and percent or moles), so two corners' own analyses under one name, as the
 * MCP tools give them, stay two lines.
 */
const sameKey = (line) =>
  line._id
    ? 'id:' + line._id
    : 'name:' +
      String(line.name).normalize('NFKC').toLowerCase().trim() +
      JSON.stringify([
        (line.fields ?? []).map((field) => [String(field.name), String(field.amount)]).sort(),
        String(line.loi ?? ''),
        String(line.percentmole ?? '')
      ]);

module.exports = { sameKey };
