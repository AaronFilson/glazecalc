const { expect } = require('@playwright/test');
const API = 'http://localhost:' + (process.env.E2E_PORT || '3100') + '/api';

let count = 0;
const uniqueEmail = (label) => label + '-' + Date.now() + '-' + count++ + '@test.com';

// Creates an account through the API in the page's own browser context, so the
// session cookie it sets is there when the page opens, and notes the session as
// the app does, so a test can start on a page already signed in.
const signUpAndSignIn = async (page) => {
  const email = uniqueEmail('user');
  const res = await page.request.post(API + '/signup', { data: { email, password: 'password123' } });
  if (!res.ok()) throw new Error('signup failed: ' + res.status());
  await page.addInitScript(() => globalThis.localStorage.setItem('session', 'account'));
  return { email };
};

// Text to match as it is, inside a regular expression.
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A library entry's Add button: "Add Custer Spar", with ", Discontinued 2023" after
// the name when it is no longer current.
const addButtonName = (name) => new RegExp('^Add ' + escapeRegExp(name) + '(,|$)');

// Adds a material to the recipe from the library ('Standard' or 'My materials')
// and enters its amount.
const addMaterial = async (page, name, amount, tab = 'Standard') => {
  const library = page.locator('.library', { hasText: 'Add materials' });
  await library.getByRole('button', { name: new RegExp('^' + tab) }).click();
  await library.getByRole('searchbox').fill(name);
  await library.getByRole('button', { name: addButtonName(name) }).click();
  await page.getByRole('textbox', { name: 'Amount of ' + name, exact: true }).fill(String(amount));
};
const addStandardMaterial = (page, name, amount) => addMaterial(page, name, amount, 'Standard');

// Adds a standard colorant to the recipe and enters its amount (a percent of the base, unless changed).
const addColorant = async (page, name, amount) => {
  const library = page.locator('.library', { hasText: 'Add colorants and additives' });
  await library.getByRole('button', { name: /^Standard/ }).click();
  await library.getByRole('searchbox').fill(name);
  await library.getByRole('button', { name: addButtonName(name) }).click();
  await page.getByRole('textbox', { name: 'Amount of ' + name, exact: true }).fill(String(amount));
};

// A field marked wrong (client/app/shared/field-checks.ts): aria-invalid, and
// the message under it is the field's description, so a screen reader says it.
const expectFieldProblem = async (page, id, message) => {
  const field = page.locator('#' + id);
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toHaveAccessibleDescription(new RegExp(escapeRegExp(message) + '$'));
  await expect(page.locator('#' + id + '-problem')).toHaveText(message);
};

module.exports = {
  API,
  addColorant,
  addMaterial,
  addStandardMaterial,
  expectFieldProblem,
  signUpAndSignIn,
  uniqueEmail
};
