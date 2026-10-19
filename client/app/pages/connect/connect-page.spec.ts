import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { OPEN_PAGE } from '../../i18n/language';
import { API, httpMock, settle, skippedHeadings, testProviders, text } from '../../testing/test-providers';
import { ConnectPage, type ConnectRequest } from './connect-page';

const UID = 'aB3_dE5-gH7iJ9kL1mN';
const ADDRESS = API + '/connect/' + UID;

/** A self-registered app on the person's own computer that asks to change records, as Claude Code might. */
const LOOPBACK: ConnectRequest = {
  uid: UID,
  client: { name: 'Claude Code', source: 'dcr', host: null, selfDescribed: true },
  redirect: { scheme: 'http:', host: '127.0.0.1:33418', loopback: true, app: null },
  redirectElsewhere: false,
  writeRequested: true,
  expiresAt: '2026-10-19T12:15:00Z'
};

/** An app named by its address, answering on its own website, asking only to read. */
const CIMD: ConnectRequest = {
  uid: UID,
  client: { name: 'Claude', source: 'cimd', host: 'claude.ai', selfDescribed: false },
  redirect: { scheme: 'https:', host: 'claude.ai', loopback: false, app: null },
  redirectElsewhere: false,
  writeRequested: false,
  expiresAt: '2026-10-19T12:15:00Z'
};

describe('ConnectPage', () => {
  let opened: string[];

  const create = async (shown: ConnectRequest | { status: number; body: object }) => {
    opened = [];
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ uid: UID }) } } },
        { provide: OPEN_PAGE, useValue: (address: string) => opened.push(address) }
      ]
    });
    const fixture = TestBed.createComponent(ConnectPage);
    await fixture.whenStable();
    const req = httpMock().expectOne(ADDRESS);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('accept')).toBe('application/json');
    if ('status' in shown) req.flush(shown.body, { status: shown.status, statusText: 'Refused' });
    else req.flush(shown);
    await settle(fixture);
    const root: HTMLElement = fixture.nativeElement;
    const button = (name: string) =>
      [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === name);
    /** Each line of the list of hosts, as "term: description". */
    const hosts = () =>
      [...root.querySelectorAll('.hosts dt')].map(
        (dt) => dt.textContent!.trim() + ': ' + dt.nextElementSibling!.textContent!.replace(/\s+/g, ' ').trim()
      );
    return { fixture, root, button, hosts };
  };

  afterEach(() => httpMock().verify());

  it('shows the app, marked self-described, the loopback warnings and an unticked box to change records', async () => {
    const { fixture, root, button, hosts } = await create(LOOPBACK);
    const all = text(fixture);
    expect(hosts()).toEqual(['Where your answer goes: Your own computer (127.0.0.1:33418)']);
    expect(text(fixture, 'h2')).toBe('Claude Code self-described');
    expect(all).toContain('It registered itself, so this name is only what it says about itself.');
    expect(all).toContain('This app receives the answer on your own computer.');
    expect(all).toContain('It also asks to change your records');
    expect(all).toContain('Read your recipes, notebook, materials, shelf and settings.');
    expect(all).not.toContain('checked by Glazecalc');
    const box = root.querySelector<HTMLInputElement>('#connect-write')!;
    expect(box.checked).toBe(false);
    expect(root.querySelector('label[for="connect-write"]')!.textContent!.trim()).toBe('Also let it change my records');
    expect(box.getAttribute('aria-describedby')).toBe('connect-write-warning');
    expect(text(fixture, '#connect-write-warning')).toContain('move them to the Trash');
    expect(text(fixture, '#connect-write-warning')).toContain('undo it');
    expect(text(fixture, '#connect-write-warning')).toContain('revoke it at any time on Connected apps');
    expect(root.querySelector('a[href="/privacy#ai-apps"]')).not.toBeNull();
    // Nothing is chosen or focused for the person.
    expect(button('Allow')).toBeDefined();
    expect(button('Don’t allow')).toBeDefined();
    expect(button('Allow')!.hasAttribute('autofocus')).toBe(false);
    expect(document.activeElement).not.toBe(button('Allow'));
    expect(skippedHeadings(fixture)).toEqual([]);
  });

  it('sends read only unless the box is ticked, then goes where the answer says', async () => {
    const { fixture, button } = await create(LOOPBACK);
    button('Allow')!.click();
    const post = httpMock().expectOne(ADDRESS);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ decision: 'allow', write: false });
    post.flush({ redirectTo: 'https://glazecalc.test/oauth/authorize/resume' });
    await settle(fixture);
    expect(opened).toEqual(['https://glazecalc.test/oauth/authorize/resume']);
    expect(text(fixture)).toContain('Sending your answer to the app');
  });

  it('sends write only when the person ticks it', async () => {
    const { fixture, root, button } = await create(LOOPBACK);
    root.querySelector<HTMLInputElement>('#connect-write')!.click();
    await settle(fixture);
    button('Allow')!.click();
    const post = httpMock().expectOne(ADDRESS);
    expect(post.request.body).toEqual({ decision: 'allow', write: true });
    post.flush({ redirectTo: 'https://glazecalc.test/oauth/authorize/resume' });
    await settle(fixture);
  });

  it('sends a no, never with write', async () => {
    const { fixture, root, button } = await create(LOOPBACK);
    root.querySelector<HTMLInputElement>('#connect-write')!.click();
    await settle(fixture);
    button('Don’t allow')!.click();
    const post = httpMock().expectOne(ADDRESS);
    expect(post.request.body).toEqual({ decision: 'deny', write: false });
    post.flush({ redirectTo: 'https://glazecalc.test/oauth/authorize/resume' });
    await settle(fixture);
    expect(opened.length).toBe(1);
  });

  it('shows a checked address with no warnings, and no box when the app only reads', async () => {
    const { fixture, root, hosts } = await create(CIMD);
    const all = text(fixture);
    expect(text(fixture, 'h2')).toBe('Claude');
    expect(all).not.toContain('self-described');
    expect(hosts()).toEqual([
      'The app’s address: claude.ai (checked by Glazecalc)',
      'Where your answer goes: claude.ai'
    ]);
    expect(all).toContain('It cannot change anything.');
    expect(root.querySelector('#connect-write')).toBeNull();
    expect(root.querySelector('.warning')).toBeNull();
  });

  it('warns when an app named by its address sends the answer to another host', async () => {
    const { fixture } = await create({
      ...CIMD,
      redirect: { ...CIMD.redirect, host: 'elsewhere.example' },
      redirectElsewhere: true
    });
    expect(text(fixture, '.warning')).toBe(
      'This app’s address is claude.ai, but your answer goes to elsewhere.example. Only allow it if you expected that.'
    );
  });

  it('shows an app’s own link scheme whole, with a warning, never as the website it looks like', async () => {
    const { fixture, hosts } = await create({
      ...LOOPBACK,
      client: { ...LOOPBACK.client, name: 'Claude' },
      redirect: { scheme: 'evilapp:', host: null, loopback: false, app: 'evilapp://claude.ai/cb' },
      writeRequested: false
    });
    const all = text(fixture);
    expect(hosts()).toEqual([
      'Where your answer goes: An app on your device that opens evilapp: links evilapp://claude.ai/cb'
    ]);
    expect(text(fixture, '.warning')).toContain('whichever app on your device opens evilapp: links');
    expect(all).not.toContain('This app receives the answer on your own computer.');
  });

  for (const [code, message] of [
    ['connect-trial', 'A trial cannot connect apps. Please create a free account first.'],
    ['connect-needs-confirmed-email', 'Please confirm your email before connecting an app.']
  ] as const) {
    it(`says plainly why it cannot connect (${code}), with nothing to allow`, async () => {
      const { fixture, root, button } = await create({ status: 403, body: { code, msg: message } });
      expect(text(fixture, '[role="alert"]')).toBe(message);
      expect(button('Allow')).toBeUndefined();
      expect(root.querySelector('a[href="/account"]')).not.toBeNull();
    });
  }

  it('says when the request has ended, when the answer finds it gone', async () => {
    const { fixture, button } = await create(CIMD);
    button('Allow')!.click();
    httpMock().expectOne(ADDRESS).flush(
      {
        code: 'connect-not-found',
        msg: 'This request to connect an app has ended or was already answered. Please start again in the app.'
      },
      { status: 404, statusText: 'Not Found' }
    );
    await settle(fixture);
    expect(text(fixture, '[role="alert"]')).toContain('has ended or was already answered');
    expect(button('Allow')).toBeUndefined();
    expect(opened).toEqual([]);
  });

  it('keeps the page when an answer fails for another reason, to try again', async () => {
    const { fixture, button } = await create(CIMD);
    button('Allow')!.click();
    httpMock().expectOne(ADDRESS).flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '[role="alert"]')).toBe('Error: your answer could not be sent. Please try again.');
    expect(button('Allow')).toBeDefined();
  });
});
