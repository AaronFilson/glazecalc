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

// Adds a standard material to the recipe form and enters its amount.
const addStandardMaterial = async (page, name, amount) => {
  await page.locator('select[name="std-mats"]').selectOption({ label: name });
  await page.getByRole('button', { name: 'Add standard material to recipe' }).click();
  const row = page.locator('li', { has: page.locator('b', { hasText: new RegExp('^' + name + '$') }) });
  await row.locator('input.material-amount').fill(String(amount));
};

module.exports = { API, addStandardMaterial, signUpAndSignIn, uniqueEmail };
