import { MaterialField, formatFormula } from '../../../lib/chemistry';

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

/**
 * Fired oxides an additive's analysis can contain: the colorants and
 * opacifiers first, then the oxides of the base. All of them are oxides the
 * unity formula knows, so an additive can be counted in it.
 */
export const ADDITIVE_OXIDES: Option[] = [
  { value: 'CoO', label: 'CoO : Cobalt oxide' },
  { value: 'CuO', label: 'CuO : Copper oxide' },
  { value: 'Fe2O3', label: 'Fe₂O₃ : Iron oxide (ferric, red)' },
  { value: 'FeO', label: 'FeO : Iron oxide (ferrous)' },
  { value: 'MnO', label: 'MnO : Manganese oxide' },
  { value: 'NiO', label: 'NiO : Nickel oxide' },
  { value: 'Cr2O3', label: 'Cr₂O₃ : Chromium oxide' },
  { value: 'V2O5', label: 'V₂O₅ : Vanadium pentoxide' },
  { value: 'Pr2O3', label: 'Pr₂O₃ : Praseodymium oxide' },
  { value: 'CeO2', label: 'CeO₂ : Cerium oxide' },
  { value: 'Sb2O3', label: 'Sb₂O₃ : Antimony oxide' },
  { value: 'SnO2', label: 'SnO₂ : Tin oxide' },
  { value: 'ZrO2', label: 'ZrO₂ : Zirconium oxide' },
  { value: 'TiO2', label: 'TiO₂ : Titanium dioxide' },
  ...FIRED_OXIDES.filter((oxide) => !['Fe2O3', 'TiO2'].includes(oxide.value))
];

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

/**
 * A material's or additive's oxides as stored: "SiO₂ 68.5%, Al₂O₃ 17%" for a
 * weight-percent analysis, "CaO : 1; MgO : 1" for a molar formula.
 */
export function fieldsText(record: { fields: MaterialField[]; percentmole?: string }): string {
  return record.percentmole === 'percent'
    ? record.fields.map((field) => formatFormula(field.name) + ' ' + field.amount + '%').join(', ')
    : record.fields.map((field) => formatFormula(field.name) + ' : ' + field.amount).join('; ');
}

/** First entry of a value the server stores as a list but may return as text. */
export function firstOf(value: string[] | string | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
