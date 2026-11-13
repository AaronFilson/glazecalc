import { TestBed } from '@angular/core/testing';
import { skippedHeadings, testProviders, text } from '../../testing/test-providers';
import { AssistantsPage } from './assistants-page';

// "Use Glazecalc from your AI assistant": the MCP address of this site, the setup for each assistant to copy,
// and the studio notes skill to download.

describe('AssistantsPage', () => {
  const ADDRESS = location.origin + '/mcp';

  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
    document.getSelection()?.removeAllRanges();
  });

  const create = async () => {
    const fixture = TestBed.createComponent(AssistantsPage);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const setup = (id: string) => root.querySelector('#setup-' + id)?.textContent ?? '';
    const copyButton = (label: string) => root.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;
    const said = (button: HTMLButtonElement) => button.parentElement!.querySelector('[role="status"]')!.textContent;
    return { fixture, root, setup, copyButton, said };
  };

  /** The browser's clipboard, as a page reaches it. */
  const clipboard = (writeText: (text: string) => Promise<void>) =>
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

  it('says what an assistant can do, how to connect an account, and gives the address of this site', async () => {
    const { fixture, root, setup } = await create();
    expect(text(fixture, 'h1')).toBe('Use Glazecalc from your AI assistant');
    expect([...root.querySelectorAll('h2')].map((h2) => h2.textContent?.trim())).toEqual([
      'What it can do',
      'Letting it change your records',
      'Connecting your account',
      'The address',
      'Adding Glazecalc to your assistant',
      'Dictate your studio notes',
      'Stopping access'
    ]);
    expect(skippedHeadings(fixture)).toEqual([]);
    expect(setup('address')).toBe(ADDRESS);
    // The tokens are made on the account page, and every app connected is listed on Connected apps.
    const links = [...root.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href'));
    expect(links).toContain('/account');
    expect(links).toContain('/account/apps');
    expect(text(fixture, '#connect')).toContain('Sign in from the app.');
  });

  it('sets each assistant up with this address, with the token left for the person to put in', async () => {
    const { root, setup } = await create();
    expect([...root.querySelectorAll('h3')].map((h3) => h3.textContent?.trim())).toEqual([
      'Claude Code',
      'VS Code',
      'Cursor',
      'Gemini CLI',
      'Claude, ChatGPT and other apps'
    ]);
    expect(setup('claude-code')).toBe('claude mcp add --transport http glazecalc ' + ADDRESS);
    expect(setup('claude-code-token')).toBe(
      `claude mcp add --transport http glazecalc ${ADDRESS} \\\n  --header "Authorization: Bearer YOUR_TOKEN"`
    );
    // VS Code asks for the token itself, and keeps it hidden.
    const vscode = JSON.parse(setup('vscode'));
    expect(vscode.servers.glazecalc).toEqual({
      type: 'http',
      url: ADDRESS,
      headers: { Authorization: 'Bearer ${input:glazecalc-token}' }
    });
    expect(vscode.inputs).toEqual([
      { type: 'promptString', id: 'glazecalc-token', description: 'Glazecalc access token', password: true }
    ]);
    expect(JSON.parse(setup('cursor'))).toEqual({
      mcpServers: { glazecalc: { url: ADDRESS, headers: { Authorization: 'Bearer YOUR_TOKEN' } } }
    });
    expect(JSON.parse(setup('gemini'))).toEqual({
      mcpServers: { glazecalc: { httpUrl: ADDRESS, headers: { Authorization: 'Bearer YOUR_TOKEN' } } }
    });
    // Each box scrolls sideways in its own direction, for a keyboard too.
    for (const pre of root.querySelectorAll('pre.setup')) {
      expect(pre.getAttribute('dir')).toBe('ltr');
      expect(pre.getAttribute('tabindex')).toBe('0');
    }
  });

  it('offers the studio notes skill to download, with how to install it in each app', async () => {
    const { fixture, root } = await create();
    const download = root.querySelector('#dictation a.btn') as HTMLAnchorElement;
    expect(download.getAttribute('href')).toBe('/downloads/glazecalc-dictation.zip');
    expect(download.hasAttribute('download')).toBe(true);
    expect(download.textContent?.trim()).toBe('Download the skill (ZIP)');
    expect([...root.querySelectorAll('#dictation li b')].map((b) => b.textContent)).toEqual([
      'Claude',
      'Claude Code',
      'ChatGPT'
    ]);
    expect(text(fixture, '#dictation')).toContain('Glazecalc never hears it.');
  });

  it('copies a setup exactly as shown, and says so beside its button alone', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboard(writeText);
    const { fixture, copyButton, said } = await create();
    const claude = copyButton('Copy the setup for Claude Code');
    const address = copyButton('Copy the address');
    expect(claude.textContent?.trim()).toBe('Copy');

    claude.click();
    await fixture.whenStable();
    expect(writeText).toHaveBeenCalledWith('claude mcp add --transport http glazecalc ' + ADDRESS);
    expect(said(claude)).toBe('Copied.');
    expect(said(address)).toBe('');

    address.click();
    await fixture.whenStable();
    expect(writeText).toHaveBeenLastCalledWith(ADDRESS);
    expect(said(address)).toBe('Copied.');
    expect(said(claude)).toBe('');
  });

  it('selects the setup to copy by hand when the browser will not copy it', async () => {
    clipboard(() => Promise.reject(new DOMException('Not allowed', 'NotAllowedError')));
    const { fixture, setup, copyButton, said } = await create();
    const cursor = copyButton('Copy the setup for Cursor');
    cursor.click();
    await fixture.whenStable();
    expect(document.getSelection()?.toString()).toBe(setup('cursor'));
    expect(said(cursor)).toBe('It could not be copied for you. It is selected: copy it from the box.');

    // A browser with no clipboard to reach at all.
    Reflect.deleteProperty(navigator, 'clipboard');
    const token = copyButton('Copy the setup for Claude Code, with an access token');
    token.click();
    await fixture.whenStable();
    expect(document.getSelection()?.toString()).toBe(setup('claude-code-token'));
    expect(said(token)).toContain('It could not be copied for you.');
    expect(said(cursor)).toBe('');
  });
});
