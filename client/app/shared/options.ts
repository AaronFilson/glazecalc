import { translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { MaterialField, formatFormula } from '../../../lib/chemistry';
import { formatPlain } from './format';

export interface Option {
  value: string;
  label: string;
}

/** An oxide to choose: "Li₂O : Lithium oxide", its name in the page's language when shown. */
const oxide = (value: string, name: string): Option => ({
  value,
  get label() {
    return formatFormula(value) + ' : ' + translate(name);
  }
});

/** Fired oxides a material formula can contain. */
export const FIRED_OXIDES: Option[] = [
  oxide('Li2O', marker('oxides.Li2O')),
  oxide('Na2O', marker('oxides.Na2O')),
  oxide('K2O', marker('oxides.K2O')),
  oxide('MgO', marker('oxides.MgO')),
  oxide('CaO', marker('oxides.CaO')),
  oxide('SrO', marker('oxides.SrO')),
  oxide('BaO', marker('oxides.BaO')),
  oxide('ZnO', marker('oxides.ZnO')),
  oxide('Al2O3', marker('oxides.Al2O3')),
  oxide('B2O3', marker('oxides.B2O3')),
  oxide('SiO2', marker('oxides.SiO2')),
  oxide('Fe2O3', marker('oxides.Fe2O3')),
  oxide('TiO2', marker('oxides.TiO2')),
  oxide('P2O5', marker('oxides.P2O5')),
  oxide('PbO', marker('oxides.PbO'))
];

/**
 * Fired oxides an additive's analysis can contain: the colorants and
 * opacifiers first, then the oxides of the base. All of them are oxides the
 * unity formula knows, so an additive can be counted in it.
 */
export const ADDITIVE_OXIDES: Option[] = [
  oxide('CoO', marker('oxides.CoO')),
  oxide('CuO', marker('oxides.CuO')),
  oxide('Fe2O3', marker('oxides.Fe2O3Red')),
  oxide('FeO', marker('oxides.FeO')),
  oxide('MnO', marker('oxides.MnO')),
  oxide('NiO', marker('oxides.NiO')),
  oxide('Cr2O3', marker('oxides.Cr2O3')),
  oxide('V2O5', marker('oxides.V2O5')),
  oxide('Pr2O3', marker('oxides.Pr2O3')),
  oxide('CeO2', marker('oxides.CeO2')),
  oxide('Sb2O3', marker('oxides.Sb2O3')),
  oxide('SnO2', marker('oxides.SnO2')),
  oxide('ZrO2', marker('oxides.ZrO2')),
  oxide('TiO2', marker('oxides.TiO2')),
  ...FIRED_OXIDES.filter((oxide) => !['Fe2O3', 'TiO2'].includes(oxide.value))
];

/**
 * Columns a firing log can record. A log saves each column by this English
 * name; firingFieldLabel shows it in the page's language.
 */
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

const FIRING_FIELD_LABELS: Record<string, string> = {
  Time: marker('firingFields.time'),
  Gas: marker('firingFields.gas'),
  Fuel: marker('firingFields.fuel'),
  'Primary Air': marker('firingFields.primaryAir'),
  Blower: marker('firingFields.blower'),
  Damper: marker('firingFields.damper'),
  'Passive Damper': marker('firingFields.passiveDamper'),
  Tank: marker('firingFields.tank'),
  Meter: marker('firingFields.meter'),
  Burner: marker('firingFields.burner'),
  Cone: marker('firingFields.cone'),
  'Temperature F': marker('firingFields.temperatureF'),
  'Temperature C': marker('firingFields.temperatureC'),
  'Temperature K': marker('firingFields.temperatureK'),
  'Ox Probe': marker('firingFields.oxProbe'),
  Atmosphere: marker('firingFields.atmosphere'),
  Weather: marker('firingFields.weather'),
  Ramp: marker('firingFields.ramp'),
  Hold: marker('firingFields.hold'),
  Comments: marker('firingFields.comments'),
  'Draw Tile': marker('firingFields.drawTile'),
  Delta: marker('firingFields.delta'),
  Rate: marker('firingFields.rate'),
  Salt: marker('firingFields.salt'),
  Soda: marker('firingFields.soda'),
  Sawdust: marker('firingFields.sawdust'),
  Pilots: marker('firingFields.pilots'),
  Pressure: marker('firingFields.pressure'),
  'Secondary Air': marker('firingFields.secondaryAir'),
  Hours: marker('firingFields.hours'),
  'Cones Top': marker('firingFields.conesTop'),
  'Cones Bottom': marker('firingFields.conesBottom'),
  Spy: marker('firingFields.spy'),
  'Temp Diff': marker('firingFields.tempDiff'),
  Segment: marker('firingFields.segment'),
  Kg: marker('firingFields.kg'),
  Pounds: marker('firingFields.pounds'),
  Timer: marker('firingFields.timer'),
  Exhaust: marker('firingFields.exhaust'),
  Misc: marker('firingFields.misc')
};

/** A firing log's column as the reader reads it; a column the app does not know stays as it is. */
export function firingFieldLabel(field: string): string {
  const numbered = /^(Probe|Ring|Burner) (\d+)$/.exec(field);
  if (numbered) {
    const key = {
      Probe: marker('firingFields.probe'),
      Ring: marker('firingFields.ring'),
      Burner: marker('firingFields.burnerN')
    }[numbered[1] as 'Probe' | 'Ring' | 'Burner'];
    return translate(key, { n: numbered[2] });
  }
  const key = FIRING_FIELD_LABELS[field];
  return key ? translate(key) : field;
}

/**
 * A material's or additive's oxides as stored, with numbers the reader's way:
 * "SiO₂ 68.5%, Al₂O₃ 17%" (or "SiO₂ 68,5%") for a weight-percent analysis,
 * "CaO : 1; MgO : 1" for a molar formula.
 */
export function fieldsText(record: { fields: MaterialField[]; percentmole?: string }): string {
  return record.percentmole === 'percent'
    ? record.fields.map((field) => formatFormula(field.name) + ' ' + formatPlain(field.amount) + '%').join(', ')
    : record.fields.map((field) => formatFormula(field.name) + ' : ' + formatPlain(field.amount)).join('; ');
}

/** First entry of a value the server stores as a list but may return as text. */
export function firstOf(value: string[] | string | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
