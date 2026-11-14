'use strict';

// What the library says of a material, without its chemistry (so the app's
// first page can use it without the chemistry): whether it has lead, where it
// is sold, and whether the app may suggest it (docs/adr/0012-choosing-materials.md).

/** Whether a material or additive has lead in it: PbO among its oxides. */
function hasLead(record) {
  return (record.fields ?? []).some((field) => field.name === 'PbO' && Number(field.amount) > 0);
}

/**
 * The other markets whose materials a region's library lists beside its own. Japan's lists the US
 * set too: Japanese potters picked from it before Japan had materials of its own, and none of those
 * should go missing now that it has (the owner's decision, 2026-11-12; docs/asia-plan.md, decision 5).
 * A Map, so a region kept in the browser that names a property every object has (toString) finds
 * nothing here.
 */
const ALSO_LISTS = new Map([['JP', ['US']]]);

/**
 * Whether a region's library lists a record: one sold there, or in a market it lists too (Japan's
 * lists the US set). General records, with no region, count everywhere.
 */
function inRegion(record, region) {
  if (!region || !record.region?.length) return true;
  return [region, ...(ALSO_LISTS.get(region) ?? [])].some((market) => record.region.includes(market));
}

/**
 * A mineral as a formula (Orthoclase, China Clay, Spodumene (theoretical)), not
 * something to buy: the real feldspars and clays are offered instead. Pure
 * chemicals such as whiting and the carbonates are offered as they are.
 */
const isIdealMineral = (material) =>
  material.source?.kind === 'theoretical' &&
  (material.category === 'feldspar' || material.category === 'clay' || material.name.includes('(theoretical)'));

/**
 * Whether the app may suggest a material: current, sold in the region, not a
 * formula-only mineral, not water-soluble (borax, boric acid, soda ash), not a
 * fluorine source (fluorspar, cryolite), and without lead unless lead is on.
 * The potter can still add any material to try.
 */
function suggestable(material, { region, allowLead = false }) {
  return (
    (!material.status || material.status === 'current') &&
    inRegion(material, region) &&
    !isIdealMineral(material) &&
    !material.soluble &&
    !material.fluorine &&
    (allowLead || !hasLead(material))
  );
}

module.exports = { hasLead, inRegion, isIdealMineral, suggestable };
