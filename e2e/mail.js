const fs = require('fs');
const path = require('path');
const { expect } = require('@playwright/test');

// Emails the test server wrote (MAIL_TRANSPORT=file, see playwright.config.js).
const sentTo = (address) => {
  const dir = process.env.E2E_MAIL_DIR;
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')))
    .filter((message) => message.to === address);
};

/** Waits for the next email to the address (the count of earlier ones given) and returns it. */
const nextEmail = async (address, before = 0) => {
  await expect.poll(() => sentTo(address).length).toBeGreaterThan(before);
  return sentTo(address)[before];
};

/** The reset link in a reset email. */
const resetLink = (message) => /(https?:\/\/\S+\/reset#token=[A-Za-z0-9_-]+)/.exec(message.text)[1];

module.exports = { nextEmail, resetLink, sentTo };
