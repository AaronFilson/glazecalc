const API = 'http://localhost:4000';

let count = 0;
const uniqueEmail = (label) => label + '-' + Date.now() + '-' + (count++) + '@test.com';

// Creates an account through the API and stores its token in the browser, so a
// test can start on a page already signed in.
const signUpAndSignIn = async (page, request) => {
  const email = uniqueEmail('user');
  const res = await request.post(API + '/signup', { data: { email, password: 'password123' } });
  if (!res.ok()) throw new Error('signup failed: ' + res.status());
  const { token } = await res.json();
  await page.addInitScript((value) => window.localStorage.setItem('token', value), token);
  return { email, token };
};

// Adds a standard material to the recipe form and enters its amount.
const addStandardMaterial = async (page, name, amount) => {
  await page.locator('select[name="std-mats"]').selectOption({ label: name });
  await page.getByRole('button', { name: 'Add standard material to recipe' }).click();
  const row = page.locator('li', { has: page.locator('b', { hasText: new RegExp('^' + name + '$') }) });
  await row.locator('input[name="amount"]').fill(String(amount));
};

module.exports = { API, addStandardMaterial, signUpAndSignIn, uniqueEmail };
