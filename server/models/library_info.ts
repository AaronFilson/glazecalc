import mongoose from 'mongoose';

// What a standard material or additive is and where its numbers come from.
// All optional: users' own records rarely set them, and older records have none.
export const libraryInfo = {
  // Other names it is sold or known by: Zircopax and Superpax for zircon.
  aliases: { type: [String] },
  // feldspar, clay, frit, boron, flux, silica, alumina, opacifier, colorant, suspender, other.
  category: String,
  // Where it is sold: US, UK, EU, AU.
  region: { type: [String] },
  // current; scarce (hard to get); discontinued; historical (kept to compare with old recipes).
  status: String,
  // When the status began, such as the year it was discontinued.
  statusSince: String,
  // Names of the records to use instead, and of those it replaces.
  substitutes: { type: [String] },
  replaces: { type: [String] },
  manufacturer: String,
  // Hazard classification from a current safety data sheet, in a sentence or two.
  hazards: String,
  // { name, url, date, kind }: kind is manufacturer, supplier, sds, digitalfire, glazy, book or theoretical.
  source: { type: mongoose.Schema.Types.Mixed },
  // Stains, gums and silicon carbide add nothing to the unity formula.
  noChemistry: Boolean,
  // Uses another record's chemistry, as Veegum uses bentonite's.
  chemistryOf: String
};
