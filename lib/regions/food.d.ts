import { Status } from './workplace';

/** One kind of article's limits on the lead and cadmium it may release. */
export interface FoodLimit {
  /** A kind of article, named by the app's messages (guides.food.category.<category>). */
  category: string;
  lead: number;
  cadmium?: number;
  /** As the law states it: mg/dm², mg/L, µg/dm², µg/L or µg/mL. */
  unit: string;
  /** How a sample is judged, where the law says: 'average' of six, or 'each' of six. */
  judged?: 'average' | 'each';
}

/** The rules for ceramic ware in contact with food, where a region has its own or follows the EU's. */
export interface FoodRules {
  /** The instrument, as it is named there. */
  law: string;
  /** Where it was read. */
  source: string;
  /** YYYY-MM-DD */
  inForce?: string;
  limits: FoodLimit[];
  status: Status;
  checked: string;
  note?: string;
}

export const FOOD: Readonly<Record<string, FoodRules>>;
/** The rules for a region: its own, or the EU's for a member state without its own; null where none are known. */
export function foodRulesFor(code: string): { rules: FoodRules; own: boolean; eu: boolean } | null;
/** Every piece of text shown, once, for translators. */
export function texts(): string[];
