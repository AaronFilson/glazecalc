export interface Option {
  value: string;
  label: string;
}

/** Fired oxides a material formula can contain. */
export const FIRED_OXIDES: Option[] = [
  { value: 'Li2O', label: 'Li₂O : Lithium oxide' },
  { value: 'Na2O', label: 'Na₂O : Sodium oxide' },
  { value: 'K2O', label: 'K₂O : Potassium oxide' },
  { value: 'MgO', label: 'MgO : Magnesium oxide' },
  { value: 'CaO', label: 'CaO : Calcium oxide' },
  { value: 'SrO', label: 'SrO : Strontium oxide' },
  { value: 'BaO', label: 'BaO : Barium oxide' },
  { value: 'ZnO', label: 'ZnO : Zinc oxide' },
  { value: 'Al2O3', label: 'Al₂O₃ : Aluminum oxide' },
  { value: 'B2O3', label: 'B₂O₃ : Boric oxide' },
  { value: 'SiO2', label: 'SiO₂ : Silicon dioxide' },
  { value: 'Fe2O3', label: 'Fe₂O₃ : Iron oxide' },
  { value: 'TiO2', label: 'TiO₂ : Titanium dioxide' },
  { value: 'P2O5', label: 'P₂O₅ : Phosphorus pentoxide' },
  { value: 'PbO', label: 'PbO : Lead oxide' }
];

/** Compounds an additive formula can contain. */
export const ADDITIVE_COMPONENTS: Option[] = [
  { value: 'Na2O', label: 'Na₂O : Sodium oxide (Natrium oxide)' },
  { value: 'K2O', label: 'K₂O : Potassium oxide (Kalium oxide)' },
  { value: 'KNaO', label: 'KNaO : Potassium or Sodium oxide' },
  { value: 'CaO', label: 'CaO : Calcium oxide' },
  { value: 'MgO', label: 'MgO : Magnesium oxide' },
  { value: 'BaO', label: 'BaO : Barium oxide' },
  { value: 'Li2O', label: 'Li₂O : Lithium oxide' },
  { value: 'SrO', label: 'SrO : Strontium oxide' },
  { value: 'Sb2O3', label: 'Sb₂O₃ : Antimony oxide (Stibium oxide)' },
  { value: 'B2O3', label: 'B₂O₃ : Boric oxide' },
  { value: 'ZnO', label: 'ZnO : Zinc oxide' },
  { value: 'Al2O3', label: 'Al₂O₃ : Aluminum oxide' },
  { value: 'TiO2', label: 'TiO₂ : Titanium dioxide' },
  { value: 'SiO2', label: 'SiO₂ : Silicon dioxide' },
  { value: 'Fe2O3', label: 'Fe₂O₃ : Red Iron oxide' },
  { value: 'FeO', label: 'FeO : Black Iron oxide' },
  { value: 'CoO', label: 'CoO : Cobalt oxide' },
  { value: 'CuO', label: 'CuO : Copper oxide (Cupric oxide)' },
  { value: 'SnO2', label: 'SnO₂ : Tin oxide (Stannic oxide)' },
  { value: 'Cr2O3', label: 'Cr₂O₃ : Chromium oxide' },
  { value: 'ZrO2', label: 'ZrO₂ : Zirconium oxide' },
  { value: 'MnO2', label: 'MnO₂ : Manganese dioxide' },
  { value: 'NiO', label: 'NiO : Nickel oxide' },
  { value: 'P2O5', label: 'P₂O₅ : Phosphorus pentoxide' },
  { value: 'H2O', label: 'H₂O : Water' },
  { value: 'PbO', label: 'PbO : Lead oxide' },
  { value: 'PrO2', label: 'PrO₂ : Praseodymium oxide' },
  { value: 'V2O5', label: 'V₂O₅ : Vanadium pentoxide' }
];

/** Elements an additive formula can contain. */
export const ELEMENTS: Option[] = [
  ['Al', 'Aluminum'],
  ['Ba', 'Barium'],
  ['B', 'Boron'],
  ['C', 'Carbon'],
  ['Ca', 'Calcium'],
  ['Co', 'Cobalt'],
  ['Cr', 'Chromium'],
  ['F', 'Fluorine'],
  ['Fe', 'Iron'],
  ['H', 'Hydrogen'],
  ['K', 'Potassium'],
  ['Li', 'Lithium'],
  ['Mg', 'Magnesium'],
  ['Mn', 'Manganese'],
  ['Na', 'Sodium'],
  ['Ni', 'Nickel'],
  ['O', 'Oxygen'],
  ['P', 'Phosphorus'],
  ['Pb', 'Lead'],
  ['S', 'Sulfur'],
  ['Sb', 'Antimony'],
  ['Si', 'Silicon'],
  ['Sn', 'Tin'],
  ['Sr', 'Strontium'],
  ['Ti', 'Titanium'],
  ['V', 'Vanadium'],
  ['Zn', 'Zinc'],
  ['Zr', 'Zirconium']
].map(([value, name]) => ({ value, label: value + ' ' + name }));

/** Columns a firing log can record. */
export const FIRING_FIELDS: string[] = [
  'Time',
  'Gas',
  'Fuel',
  'Primary Air',
  'Blower',
  'Damper',
  'Passive Damper',
  'Tank',
  'Meter',
  'Burner',
  'Cone',
  'Temperature F',
  'Temperature C',
  'Temperature K',
  'Ox Probe',
  'Atmosphere',
  'Weather',
  'Ramp',
  'Hold',
  'Comments',
  'Draw Tile',
  'Delta',
  'Rate',
  'Salt',
  'Soda',
  'Sawdust',
  'Pilots',
  'Pressure',
  'Secondary Air',
  'Hours',
  'Cones Top',
  'Cones Bottom',
  'Spy',
  'Temp Diff',
  'Segment',
  'Kg',
  'Pounds',
  'Timer',
  'Exhaust',
  'Misc',
  'Probe 1',
  'Probe 2',
  'Probe 3',
  'Probe 4',
  'Ring 1',
  'Ring 2',
  'Ring 3',
  'Ring 4',
  'Ring 5',
  'Ring 6',
  'Burner 1',
  'Burner 2',
  'Burner 3',
  'Burner 4',
  'Burner 5',
  'Burner 6',
  'Burner 7',
  'Burner 8',
  'Burner 9',
  'Burner 10'
];

/** Subscript forms of oxide formulas, for display. */
export function subscript(formula: string): string {
  return formula.replace(/\d/g, (digit) => String.fromCharCode(0x2080 + Number(digit)));
}

/** First entry of a value the server stores as a list but may return as text. */
export function firstOf(value: string[] | string | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
