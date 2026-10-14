// The owner's script for someone who has lost every factor (server/clear_mfa.ts,
// docs/mfa-plan.md item 15): a notice first, then, 7 days later, the factors go.
import { clear, main, notify, WAIT_DAYS } from '../clear_mfa.ts';
import AuthChallenge from '../models/auth_challenge.ts';
import PendingSignIn from '../models/pending_sign_in.ts';
import User from '../models/user.ts';
import { api, expect, makeUser } from './support/app.ts';
import * as mail from './support/mail.ts';

const DAY = 24 * 60 * 60 * 1000;

const withMfa = async ({ unverified = false } = {}) => {
  const made = await makeUser();
  await User.updateOne(
    { _id: made.user._id },
    {
      $set: {
        ...(unverified && { emailUnverified: true }),
        mfa: {
          handle: 'handle-' + made.user.id,
          totp: { secret: 'v1.x', lastStep: 0, addedAt: new Date() },
          passkeys: [
            {
              credentialId: 'clear-' + made.user.id,
              publicKey: Buffer.from('k'),
              counter: 0,
              name: 'Phone',
              addedAt: new Date()
            }
          ],
          recoveryCodes: [{ hash: 'h' }]
        }
      }
    }
  );
  return made;
};

const verify = (token: string) =>
  api()
    .get('/verify')
    .set('Authorization', 'Bearer ' + token);

describe('turning off two-step sign-in for a lost account (clear_mfa.ts)', () => {
  it('notifies the address, and says when --clear may run', async () => {
    const { email, user } = await withMfa();
    const now = new Date('2026-10-14T12:00:00Z');
    const outcome = await notify(email.toUpperCase(), now);
    expect(outcome.ok).to.eql(true);
    expect(outcome.clearAfter).to.eql(new Date(now.getTime() + WAIT_DAYS * DAY));
    // The output never shows the address.
    expect(outcome.message).to.not.include(email);
    expect((await User.findById(user._id))!.mfa!.clearRequestedAt).to.eql(now);

    const [sent] = await mail.waitFor(email, 1);
    expect(sent!.subject).to.match(/Two-step sign-in will be turned off/);
    expect(sent!.text).to.include(outcome.clearAfter!.toUTCString());
    expect(sent!.text).to.include('privacy@glazecalcapp.com');
  });

  it('refuses to notify an unknown address, an account without MFA, or an unconfirmed address', async () => {
    expect((await notify('nobody-' + Date.now() + '@tester.com')).ok).to.eql(false);
    const plain = await makeUser();
    expect((await notify(plain.email)).ok).to.eql(false);
    const unconfirmed = await withMfa({ unverified: true });
    expect((await notify(unconfirmed.email)).ok).to.eql(false);
    expect((await User.findById(unconfirmed.user._id))!.mfa!.clearRequestedAt).to.eql(undefined);
    await mail.settle();
    expect(mail.to(plain.email)).to.eql([]);
    expect(mail.to(unconfirmed.email)).to.eql([]);
  });

  it('refuses --clear without a notice, and before 7 days have passed', async () => {
    const { email, user } = await withMfa();
    expect((await clear(email)).ok).to.eql(false);
    const notified = new Date('2026-10-01T00:00:00Z');
    await notify(email, notified);
    const early = await clear(email, new Date(notified.getTime() + WAIT_DAYS * DAY - 1000));
    expect(early.ok).to.eql(false);
    expect(early.message).to.match(/Too soon/);
    const after = await User.findById(user._id);
    expect(after!.mfa!.totp).to.not.eql(undefined);
    expect(after!.tokenVersion).to.eql(0);
  });

  it('starts the 7 days again when the address is notified again', async () => {
    const { email } = await withMfa();
    const first = new Date('2026-10-01T00:00:00Z');
    await notify(email, first);
    const second = new Date(first.getTime() + 6 * DAY);
    await notify(email, second);
    expect((await clear(email, new Date(first.getTime() + 8 * DAY))).ok).to.eql(false);
    expect((await clear(email, new Date(second.getTime() + WAIT_DAYS * DAY))).ok).to.eql(true);
  });

  it('after 7 days removes the factors and codes, signs out every device and ends pending sign-ins', async () => {
    const { email, user, token } = await withMfa();
    expect(await verify(token)).to.have.status(200);
    await PendingSignIn.create({
      tokenId: 'clear-' + user.id,
      userId: user._id,
      tokenVersion: 0,
      keep: false,
      expiresAt: new Date(Date.now() + 60000)
    });
    await AuthChallenge.create({ userId: user._id, kind: 'passkey-confirm', expiresAt: new Date(Date.now() + 60000) });
    const notified = new Date(Date.now() - WAIT_DAYS * DAY - 1000);
    await notify(email, notified);

    const outcome = await clear(email);
    expect(outcome.ok).to.eql(true);
    const after = await User.findById(user._id);
    expect(after!.mfa).to.eql(undefined);
    expect(after!.tokenVersion).to.eql(1);
    expect(await verify(token)).to.have.status(401);
    expect(await PendingSignIn.countDocuments({ userId: user._id })).to.eql(0);
    expect(await AuthChallenge.countDocuments({ userId: user._id })).to.eql(0);

    // The password alone signs in again.
    const res = await api()
      .get('/signin')
      .set('Authorization', 'Basic ' + Buffer.from(email + ':password123').toString('base64'));
    expect(res.body.code).to.eql('signed-in');
    // And there is nothing left to clear.
    expect((await clear(email)).ok).to.eql(false);
  });

  it('runs from the command line only with a flag and one address', async () => {
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => errors.push(args);
    try {
      expect(await main([])).to.eql(2);
      expect(await main(['--clear'])).to.eql(2);
      expect(await main(['--remove', 'a@b.c'])).to.eql(2);
      expect(await main(['--notify', 'a@b.c', 'extra'])).to.eql(2);
    } finally {
      console.error = original;
    }
    expect(errors).to.have.length(4);
  });
});
