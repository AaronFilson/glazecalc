/**
 * Trimmed, lower-case email, or null when the value is not a string. Rejecting
 * non-strings stops query operators such as { "$ne": null } reaching Mongo.
 */
export const normalize = (value: unknown): string | null =>
  typeof value === 'string' ? value.trim().toLowerCase() : null;

// Trial accounts get a placeholder address here (no-poor-machines@guest.invalid),
// which keeps every account's email unique. .invalid is reserved (RFC 2606), so
// no real address can use it and mail to it can never be delivered.
export const GUEST_DOMAIN = 'guest.invalid';

/** A trial account's placeholder address. */
export const isGuestAddress = (address: unknown): boolean =>
  typeof address === 'string' &&
  address
    .trim()
    .toLowerCase()
    .endsWith('@' + GUEST_DOMAIN);

/**
 * Looks like an address (something@domain.tld) that a person can use; mail
 * delivery is the real test. Trial placeholders are not, so nobody can sign up
 * with one or change their email to one.
 */
export const isValid = (address: unknown): address is string =>
  typeof address === 'string' &&
  address.length <= 254 &&
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address) &&
  !isGuestAddress(address);

/** Case-insensitive match, so accounts made before emails were lower-cased still work. */
export const collation = { locale: 'en', strength: 2 };
