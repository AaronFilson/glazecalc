// Reads the emails the server wrote with MAIL_TRANSPORT=file (see env.js).
const fs = require('fs');
const path = require('path');

const all = () => {
  const dir = process.env.MAIL_DIR;
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
};

/** Emails sent to an address so far. */
exports.to = (address) => all().filter((m) => m.to === address);

/** Waits for the count of emails to an address to reach `count`, then returns them. */
exports.waitFor = async (address, count, ms = 3000) => {
  const end = Date.now() + ms;
  for (;;) {
    const found = exports.to(address);
    if (found.length >= count || Date.now() > end) return found;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

/** The reset token from a reset email's link. */
exports.tokenIn = (message) => {
  const match = /#\/reset\?token=([A-Za-z0-9_-]+)/.exec(message.text);
  return match && match[1];
};

/** Lets any mail a request started finish, for tests that expect none. */
exports.settle = () => new Promise((resolve) => setTimeout(resolve, 300));
