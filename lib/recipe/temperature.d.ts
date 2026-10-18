// Types for lib/recipe/temperature.js (see index.d.ts).

export type Scale = 'C' | 'F';

export function fahrenheit(celsius: number): number;
export function celsius(fahrenheit: number): number;
/** A temperature in °C in the scale, to the whole degree. */
export function inScale(celsius: number, scale: Scale): number;
/** "1240 °C" or "2264 °F", with a no-break space; `write` writes the number. */
export function temperatureText(celsius: number, scale: Scale, write?: (value: number) => string): string;
