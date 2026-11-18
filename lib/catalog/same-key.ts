// Which lines of the corner recipes are the same material, for the core's keyOf (lib/core/identity.ts).

/** A line as the key reads it. */
export interface KeyedLine {
  readonly _id?: unknown;
  readonly name?: unknown;
  readonly fields?: ReadonlyArray<{ readonly name?: unknown; readonly amount?: unknown }> | null;
  readonly loi?: unknown;
  readonly percentmole?: unknown;
}

/**
 * Which lines of the corner recipes are the same material: by saved id, else by name and the chemistry the
 * line carries (its fields, LOI and percent or moles), so two corners' own analyses under one name, as the
 * MCP tools give them, stay two lines.
 */
const sameKey = (line: KeyedLine): string =>
  line._id
    ? 'id:' + String(line._id)
    : 'name:' +
      String(line.name).normalize('NFKC').toLowerCase().trim() +
      JSON.stringify([
        (line.fields ?? []).map((field) => [String(field.name), String(field.amount)]).sort(),
        String(line.loi ?? ''),
        String(line.percentmole ?? '')
      ]);

export { sameKey };
