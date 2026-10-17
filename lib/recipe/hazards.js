'use strict';

/**
 * The hazards of a recipe's materials and additives, as their records give
 * them (the standard library's come from each material's current safety data
 * sheet): each distinct statement once, with the names it is for, in the
 * recipe's order; and the names whose records say nothing, so that nothing is
 * claimed for them either way. Nothing is added or summed up beyond what the
 * records hold.
 */
function hazardsOf(records) {
  const hazards = [];
  const unknown = [];
  for (const record of records) {
    const name = String(record.name ?? '').trim();
    const text = String(record.hazards ?? '').trim();
    if (!text) {
      if (name && !unknown.includes(name)) unknown.push(name);
      continue;
    }
    const found = hazards.find((hazard) => hazard.text === text);
    if (found) {
      if (name && !found.names.includes(name)) found.names.push(name);
    } else {
      hazards.push({ text, names: name ? [name] : [], record });
    }
  }
  return { hazards, unknown };
}

module.exports = { hazardsOf };
