import jwt from 'jsonwebtoken';
import { api, expect, makeUser, sessionToken } from './support/app.ts';
import User from '../models/user.ts';
import Note from '../models/note.ts';
import Recipe from '../models/recipe.ts';
import * as guestNames from '../lib/guest_names.ts';
import * as sweeper from '../lib/guest_sweeper.ts';
import * as mailer from '../lib/mailer.ts';
import * as mail from './support/mail.ts';

const DAY = 24 * 60 * 60 * 1000;

/** What POST /guest answers. */
interface TrialBody {
  guest: boolean;
  name: string;
  expiresAt: string;
}

// Starts a trial; its token comes from the session cookie the answer sets.
const startTrial = async () => {
  const res = await api().post('/guest');
  expect(res).to.have.status(201);
  return {
    ...(res.body as TrialBody),
    token: sessionToken(res),
    cookie: ([] as string[]).concat(res.headers['set-cookie']).join()
  };
};
const placeholderFor = (name: string) => name.replace(/ /g, '-') + '@guest.invalid';
const signIn = (address: string, password: string) =>
  api()
    .get('/signin')
    .set('Authorization', 'Basic ' + Buffer.from(address + ':' + password).toString('base64'));
const addNote = (token: string | null, content = 'Cone 6 test') =>
  api()
    .post('/notes/create')
    .set('Authorization', 'Bearer ' + token)
    .send({ content, relatedCollection: 'Notes', relatedId: 'general notes' });
const addRecipe = (token: string | null) =>
  api()
    .post('/recipe/create')
    .set('Authorization', 'Bearer ' + token)
    .send({ title: 'Trial celadon', materials: [{ name: 'Silica', amount: '30' }] });
const idOf = async (token: string | null): Promise<string> =>
  (
    await api()
      .get('/verify')
      .set('Authorization', 'Bearer ' + token)
  ).body.id;

const withEnv = async (name: string, value: string, fn: () => Promise<void>) => {
  process.env[name] = value;
  try {
    await fn();
  } finally {
    delete process.env[name];
  }
};

const realUser = async () => (await makeUser()).user;

describe('trial names', () => {
  it('are two different describing words and a plural noun, in lower case', () => {
    for (let i = 0; i < 200; i++) {
      const { name, slug } = guestNames.randomName();
      const words = name.split(' ');
      expect(words).to.have.length(3);
      expect(guestNames.ADJECTIVES).to.include(words[0]);
      expect(guestNames.ADJECTIVES).to.include(words[1]);
      expect(words[0]).to.not.eql(words[1]);
      expect(guestNames.NOUNS).to.include(words[2]);
      expect(slug).to.eql(words.join('-'));
    }
  });

  it('come from lists without repeats, so each name is equally likely', () => {
    for (const list of [guestNames.ADJECTIVES, guestNames.NOUNS]) {
      expect(new Set(list).size).to.eql(list.length);
      for (const word of list) expect(word).to.match(/^[a-z]+$/);
    }
  });
});

describe('trial accounts', () => {
  it('starts a trial with a generated name, and its token works like any sign-in', async () => {
    const trial = await startTrial();
    expect(trial.guest).to.eql(true);
    expect(trial.name).to.match(/^[a-z]+ [a-z]+ [a-z]+$/);
    expect(new Date(trial.expiresAt).getTime() - Date.now()).to.be.within(14 * DAY - 60000, 14 * DAY + 60000);
    // The session lasts as long as the trial, and the answer has no token in it.
    expect((jwt.decode(trial.token!) as jwt.JwtPayload).exp! * 1000 - new Date(trial.expiresAt).getTime()).to.be.within(
      -60000,
      60000
    );
    expect(trial.cookie).to.include('Max-Age=1209600');
    expect(Object.keys(trial).sort()).to.eql(['cookie', 'expiresAt', 'guest', 'name', 'token']);

    const stored = await User.findOne({ displayname: trial.name });
    expect(stored!.email).to.eql(placeholderFor(trial.name));
    expect(stored!.guest).to.eql(true);

    // The placeholder email stays on the server.
    const me = await api()
      .get('/verify')
      .set('Authorization', 'Bearer ' + trial.token);
    expect(me).to.have.status(200);
    expect(me.body).to.include({ guest: true, name: trial.name, id: String(stored!._id) });
    expect(me.body).to.not.have.property('email');

    expect(await addRecipe(trial.token)).to.have.status(200);
    const recipes = await api()
      .get('/recipe/getAll')
      .set('Authorization', 'Bearer ' + trial.token);
    expect((recipes.body as { title: string }[]).map((r) => r.title)).to.eql(['Trial celadon']);
  });

  it('gives each trial its own name', async () => {
    const [a, b] = await Promise.all([startTrial(), startTrial()]);
    expect(a.name).to.not.eql(b.name);
  });

  it('draws again when a name is taken, and adds a number after five clashes', async () => {
    const original = guestNames.names.draw;
    let calls = 0;
    guestNames.names.draw = () => {
      calls++;
      return { name: 'glossy quiet kilns', slug: 'glossy-quiet-kilns' };
    };
    try {
      expect((await startTrial()).name).to.eql('glossy quiet kilns');
      calls = 0;
      const second = await startTrial();
      expect(second.name).to.match(/^glossy quiet kilns \d{1,3}$/);
      expect(calls).to.eql(6);
      const stored = await User.findOne({ displayname: second.name });
      expect(stored!.email).to.eql(placeholderFor(second.name));
    } finally {
      guestNames.names.draw = original;
    }
  });

  it('stops starting trials at the cap, or when trials are turned off', async () => {
    await startTrial();
    const active = await User.countDocuments({ guest: true, expiresAt: { $gt: new Date() } });
    await withEnv('GUEST_MAX_ACTIVE', String(active), async () => {
      const res = await api().post('/guest');
      expect(res).to.have.status(503);
      expect(res.body.msg).to.match(/create a free account instead/);
    });
    await withEnv('GUEST_TRIAL', 'off', async () => {
      expect(await api().post('/guest')).to.have.status(404);
    });
  });

  it('keeps trials away from passwords and email', async () => {
    const trial = await startTrial();
    const placeholder = placeholderFor(trial.name);

    // Its password is a random secret, and sign-in refuses trials anyway.
    const signin = await signIn(placeholder, 'anything-at-all');
    expect(signin).to.have.status(401);
    expect(signin.body.msg).to.eql('Email or password is incorrect.');

    const change = await api()
      .put('/password')
      .set('Authorization', 'Bearer ' + trial.token)
      .send({ current: 'anything', password: 'a-new-password' });
    expect(change).to.have.status(403);
    const settings = await api()
      .put('/usersettings/' + (await idOf(trial.token)))
      .set('Authorization', 'Bearer ' + trial.token)
      .send({ displayname: 'Renamed' });
    expect(settings).to.have.status(403);

    // Nobody can use the placeholder domain, and nothing is ever mailed to it.
    expect(await api().post('/password/forgot').send({ email: placeholder })).to.have.status(400);
    const signup = await api().post('/signup').send({ email: 'someone@Guest.Invalid', password: 'long-enough-1' });
    expect(signup).to.have.status(400);
    let refused: unknown = null;
    await mailer.send({ to: placeholder, subject: 'Hello', text: 'Hi' }).catch((err: unknown) => (refused = err));
    expect(refused instanceof Error && refused.message).to.eql('Not sending email to a trial account');
    await mail.settle();
    expect(mail.to(placeholder)).to.eql([]);
  });

  it('caps the records a trial keeps, but not an account', async () => {
    const trial = await startTrial();
    const user = await realUser();
    await withEnv('GUEST_MAX_RECORDS', '2', async () => {
      expect(await addNote(trial.token)).to.have.status(200);
      expect(await addNote(trial.token)).to.have.status(200);
      const third = await addNote(trial.token);
      expect(third).to.have.status(403);
      expect(third.body.msg).to.eql('A trial can keep up to 2 notes. Create a free account to save more.');
      // Other kinds have their own count.
      expect(await addRecipe(trial.token)).to.have.status(200);
      for (let i = 0; i < 3; i++) expect(await addNote(user.generateToken())).to.have.status(200);
    });
  });

  it('keeps the cap when many records are sent at the same moment', async () => {
    const trial = await startTrial();
    await withEnv('GUEST_MAX_RECORDS', '5', async () => {
      const results = await Promise.all(Array.from({ length: 30 }, () => addNote(trial.token)));
      expect(results.filter((r) => r.status === 200)).to.have.length(5);
      expect(results.filter((r) => r.status === 403)).to.have.length(25);
      const id = await idOf(trial.token);
      expect(await Note.countDocuments({ ownedBy: id })).to.eql(5);
    });
  });

  it('gives a place back when a record is removed, or a create fails', async () => {
    const trial = await startTrial();
    await withEnv('GUEST_MAX_RECORDS', '2', async () => {
      // A create the route refuses does not use up a place.
      const missing = await api()
        .post('/notes/create')
        .set('Authorization', 'Bearer ' + trial.token)
        .send({ content: 'No collection' });
      expect(missing).to.have.status(400);
      const first = await addNote(trial.token);
      expect(first).to.have.status(200);
      expect(await addNote(trial.token)).to.have.status(200);
      expect(await addNote(trial.token)).to.have.status(403);

      const removed = await api()
        .delete('/notes/delete/' + (first.body as { _id: string })._id)
        .set('Authorization', 'Bearer ' + trial.token);
      expect(removed).to.have.status(200);
      expect(await addNote(trial.token)).to.have.status(200);
      expect(await addNote(trial.token)).to.have.status(403);
    });
  });

  it('holds what a trial sends at once to 32 KB, on every route', async () => {
    const trial = await startTrial();
    const user = await realUser();
    const big = 'x'.repeat(40 * 1024);
    const tooBig = await addNote(trial.token, big);
    expect(tooBig).to.have.status(413);
    expect(tooBig.body.msg).to.eql('That is more than can be saved at once.');

    const small = await addNote(trial.token, 'Glaze crawled on the rim');
    expect(small).to.have.status(200);
    const change = await api()
      .put('/notes/change/' + small.body._id)
      .set('Authorization', 'Bearer ' + trial.token)
      .send({ content: big });
    expect(change).to.have.status(413);
    expect(await addNote(user.generateToken(), big)).to.have.status(200);
  });

  it('turns a trial into an account, keeping its records and its name', async () => {
    const trial = await startTrial();
    expect(await addRecipe(trial.token)).to.have.status(200);
    const address = 'claimed' + Date.now() + '@tester.com';

    const res = await api()
      .post('/guest/claim')
      .set('Authorization', 'Bearer ' + trial.token)
      .send({ email: ' ' + address.toUpperCase(), password: 'my-new-password' });
    expect(res).to.have.status(200);
    expect(res.body.email).to.eql(address);

    // The trial's token is retired; the new one is a normal sign-in.
    expect(
      await api()
        .get('/verify')
        .set('Authorization', 'Bearer ' + trial.token)
    ).to.have.status(401);
    expect(res.body).to.eql({ email: address });
    const token = sessionToken(res);
    const me = await api()
      .get('/verify')
      .set('Authorization', 'Bearer ' + token);
    expect(me.body).to.include({ email: address, name: trial.name });
    expect(me.body).to.not.have.property('guest');
    const recipes = await api()
      .get('/recipe/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect((recipes.body as { title: string }[]).map((r) => r.title)).to.eql(['Trial celadon']);
    expect(await signIn(address, 'my-new-password')).to.have.status(200);

    const stored = await User.findById(me.body.id).lean();
    expect(stored).to.include({ email: address, displayname: trial.name });
    expect(stored).to.not.have.any.keys('guest', 'expiresAt');
  });

  it('refuses a claim with a taken or placeholder email, a short password, or no trial', async () => {
    const trial = await startTrial();
    const user = await realUser();
    const claim = (body: object, token = trial.token) =>
      api()
        .post('/guest/claim')
        .set('Authorization', 'Bearer ' + token)
        .send(body);

    const taken = await claim({ email: user.email.toUpperCase(), password: 'long-enough-1' });
    expect(taken).to.have.status(400);
    expect(taken.body).to.eql({ msg: 'An account with that email already exists.', field: 'email' });
    expect(await claim({ email: 'me@guest.invalid', password: 'long-enough-1' })).to.have.status(400);
    expect(await claim({ email: 'new' + Date.now() + '@tester.com', password: 'short' })).to.have.status(400);
    const notTrial = await claim({ email: 'other@tester.com', password: 'long-enough-1' }, user.generateToken());
    expect(notTrial).to.have.status(403);
    expect(await api().post('/guest/claim').send({ email: 'x@tester.com', password: 'long-enough-1' })).to.have.status(
      401
    );
    // Still a trial after all that.
    expect(
      (
        await api()
          .get('/verify')
          .set('Authorization', 'Bearer ' + trial.token)
      ).body.guest
    ).to.eql(true);
  });

  it('brings a trial along when someone signs in to their account on the same browser', async () => {
    const trial = await startTrial();
    expect(await addRecipe(trial.token)).to.have.status(200);
    expect(await addNote(trial.token)).to.have.status(200);
    const trialId = await idOf(trial.token);
    const { user, email, password, token } = await makeUser();
    expect(await addNote(token, 'Already mine')).to.have.status(200);

    const res = await signIn(email, password).set('Cookie', 'glazecalc_session=' + trial.token);
    expect(res).to.have.status(200);
    expect(res.body).to.eql({ msg: 'Success in signin', email, kept: 2 });

    const notes = await api()
      .get('/notes/getAll')
      .set('Authorization', 'Bearer ' + sessionToken(res));
    expect((notes.body as { content: string }[]).map((n) => n.content).sort()).to.eql(['Already mine', 'Cone 6 test']);
    expect((await Recipe.find({ ownedBy: String(user._id) })).map((r) => r.title)).to.eql(['Trial celadon']);
    expect(await User.findById(trialId)).to.eql(null);
  });

  it('leaves an account alone when its own session is still on the browser', async () => {
    const { user, email, password, token } = await makeUser();
    expect(await addNote(token)).to.have.status(200);
    const res = await signIn(email, password).set('Cookie', 'glazecalc_session=' + token);
    expect(res.body.kept).to.eql(0);
    expect(await User.findById(user._id)).to.not.eql(null);
    expect(await Note.countDocuments({ ownedBy: String(user._id) })).to.eql(1);
  });

  it('discards a trial and everything in it, without a password', async () => {
    const trial = await startTrial();
    expect(await addNote(trial.token)).to.have.status(200);
    const id = await idOf(trial.token);

    const res = await api()
      .delete('/deleteuser/' + id)
      .set('Authorization', 'Bearer ' + trial.token);
    expect(res).to.have.status(200);
    // ...and the browser is signed out.
    expect(([] as string[]).concat(res.headers['set-cookie']).join()).to.include('glazecalc_session=;');
    expect(await User.findById(id)).to.eql(null);
    expect(await Note.countDocuments({ ownedBy: id })).to.eql(0);
  });

  it('shuts out an expired trial, and the sweeper removes it with its records', async () => {
    const expired = await startTrial();
    expect(await addRecipe(expired.token)).to.have.status(200);
    const expiredId = await idOf(expired.token);
    const active = await startTrial();
    const activeId = await idOf(active.token);
    const user = await realUser();
    await User.updateOne({ _id: expiredId }, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    // Out as soon as it expires, before any sweep.
    expect(
      await api()
        .get('/verify')
        .set('Authorization', 'Bearer ' + expired.token)
    ).to.have.status(401);

    expect(await sweeper.sweepExpiredGuests()).to.be.at.least(1);
    expect(await User.findById(expiredId)).to.eql(null);
    expect(await Recipe.countDocuments({ ownedBy: expiredId })).to.eql(0);
    expect(await User.findById(activeId)).to.not.eql(null);
    expect(await User.findById(user._id)).to.not.eql(null);
    expect(await sweeper.sweepExpiredGuests()).to.eql(0);
  });

  it('sweeps when the server starts, then every hour, without keeping the process alive', async () => {
    let sweeps = 0;
    const sweep = async () => {
      sweeps++;
      if (sweeps === 2) throw new Error('database away');
      return 1;
    };
    const timer = sweeper.start(5, sweep);
    try {
      expect(sweeps).to.eql(1);
      expect(timer.hasRef()).to.eql(false);
      // A failed sweep is logged, and the next one still runs.
      for (let waited = 0; sweeps < 3 && waited < 1000; waited += 5) await new Promise((r) => setTimeout(r, 5));
      expect(sweeps).to.be.at.least(3);
    } finally {
      clearInterval(timer);
    }
  });
});
