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

// Adds a material to the recipe from the library ('Standard' or 'My materials')
// and enters its amount.
const addMaterial = async (page, name, amount, tab = 'Standard') => {
  const library = page.locator('.library', { hasText: 'Add materials' });
  await library.getByRole('button', { name: new RegExp('^' + tab) }).click();
  await library.getByRole('searchbox').fill(name);
  await library.getByRole('button', { name: 'Add ' + name, exact: true }).click();
  await page.getByRole('textbox', { name: 'Amount of ' + name, exact: true }).fill(String(amount));
};
const addStandardMaterial = (page, name, amount) => addMaterial(page, name, amount, 'Standard');

module.exports = { API, addMaterial, addStandardMaterial, signUpAndSignIn, uniqueEmail };
