'use strict';

// Firing temperatures. The app keeps them in °C and shows them in the reader's
// scale, to the whole degree.

/** °F from °C. */
const fahrenheit = (celsius) => (celsius * 9) / 5 + 32;

/** °C from °F. */
const celsius = (fahrenheit) => ((fahrenheit - 32) * 5) / 9;

/** A temperature in °C in the reader's scale, to the whole degree: 1240 (°C) or 2264 (°F). */
const inScale = (degrees, scale) => Math.round(scale === 'F' ? fahrenheit(degrees) : degrees);

/**
 * A temperature in the reader's scale, from °C: "1240 °C" or "2264 °F", with
 * a no-break space. `write` writes the number (the reader's locale); plainly
 * by default.
 */
const temperatureText = (degrees, scale, write = String) => write(inScale(degrees, scale)) + ' °' + scale;

module.exports = { fahrenheit, celsius, inScale, temperatureText };
