import { Status } from './workplace';

/** What a shop sells, named by the app's messages (guides.suppliers.sells.<code>). */
export type Sells = 'materials' | 'frits' | 'oxides' | 'stains' | 'clays' | 'glazes' | 'kilns';

/** A shop selling raw glaze materials to potters (lib/regions/suppliers.js). */
export interface Shop {
  name: string;
  /** Its raw glaze materials page. */
  url: string;
  /** Its town, as it gives it. */
  place?: string;
  sells: Sells[];
  /** Pack sizes seen. */
  packs?: { unit: 'kilogram' | 'pound'; sizes: number[] };
  /** A few materials with the shop's own names or codes. */
  examples?: string[];
  status: Status;
  /** YYYY-MM-DD */
  checked: string;
  note?: string;
}

export interface RegionShops {
  shops: Shop[];
  /** Where none were found here: shops elsewhere that say they deliver here. */
  nearby?: Array<Shop & { region: string; /** Its page that says it delivers here. */ shipping: string }>;
}

export const SUPPLIERS: Readonly<Record<string, RegionShops>>;
/** A region's shops that may be shown (verified only); null for a region with no entry. */
export function shopsFor(code: string): Required<RegionShops> | null;
/** Every piece of text shown, once, for translators. */
export function texts(): string[];
