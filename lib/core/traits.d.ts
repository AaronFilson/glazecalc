/** What the core needs to know about a record beyond its chemistry. */
export type Traits = Readonly<Record<string, any>>;
/** The traits of a record (by default `record.traits`); empty for none. */
export function traitsOf(record: unknown): Traits;
/** Sets how the core reads a record's traits. */
export function setTraitsOf(read: (record: any) => Traits): void;
