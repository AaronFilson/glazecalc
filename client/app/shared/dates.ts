/** Today's date as YYYY-MM-DD in the user's time zone, matching a date input. */
export function localDate(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
}

/** The text, or undefined when blank, so optional fields are left out of saves. */
export function optional(value: string): string | undefined {
  return value.trim() ? value : undefined;
}
