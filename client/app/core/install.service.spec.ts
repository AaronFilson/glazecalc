import { TestBed } from '@angular/core/testing';
import { InstallService } from './install.service';

/** What the browser sends when the app can be installed. */
const offerEvent = () => {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  Object.assign(event, { prompt: vi.fn().mockResolvedValue(undefined) });
  return event as Event & { prompt: ReturnType<typeof vi.fn> };
};

describe('InstallService', () => {
  // The test browser has no matchMedia; this one answers for the installed app's display mode.
  const standalone = (yes: boolean) =>
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: yes && query === '(display-mode: standalone)' }));

  afterEach(() => vi.unstubAllGlobals());

  it('offers nothing until the browser does, and keeps the offer instead of the browser’s own bar', () => {
    standalone(false);
    const install = TestBed.inject(InstallService);
    expect(install.available()).toBe(false);
    const event = offerEvent();
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(install.available()).toBe(true);
  });

  it('shows the browser’s question when it is used, and then offers nothing', async () => {
    standalone(false);
    const install = TestBed.inject(InstallService);
    const event = offerEvent();
    window.dispatchEvent(event);
    await install.install();
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(install.available()).toBe(false);
    await install.install();
    expect(event.prompt).toHaveBeenCalledTimes(1);
  });

  it('stops offering once the app is installed', () => {
    standalone(false);
    const install = TestBed.inject(InstallService);
    window.dispatchEvent(offerEvent());
    expect(install.available()).toBe(true);
    window.dispatchEvent(new Event('appinstalled'));
    expect(install.available()).toBe(false);
  });

  it('offers nothing in the installed app itself', () => {
    standalone(true);
    const install = TestBed.inject(InstallService);
    window.dispatchEvent(offerEvent());
    expect(install.available()).toBe(false);
  });
});
