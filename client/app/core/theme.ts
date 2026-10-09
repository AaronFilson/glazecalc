import { effect, inject, signal, untracked } from '@angular/core';
import { translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { AuthService } from './auth.service';
import { PreferencesService } from './preferences.service';

/** Light or dark: as the device is set, or chosen in Settings. */
export type ThemeMode = 'system' | 'light' | 'dark';

/** The colors of the buttons, links and tabs, named for glazes; styles.scss has their values. */
export type Palette = 'tenmoku' | 'celadon' | 'cobalt' | 'oxblood' | 'shino' | 'ash';

const palette = (value: Palette, name: string, swatch: [light: string, dark: string]) => ({
  value,
  /** In the page's language. */
  get label() {
    return translate(name);
  },
  swatch
});

export const PALETTES: ReadonlyArray<{ value: Palette; label: string; swatch: [light: string, dark: string] }> = [
  palette('tenmoku', marker('palettes.tenmoku'), ['#9c3d1f', '#e8956b']),
  palette('celadon', marker('palettes.celadon'), ['#2e6650', '#8fcfb2']),
  palette('cobalt', marker('palettes.cobalt'), ['#24509e', '#9db9f2']),
  palette('oxblood', marker('palettes.oxblood'), ['#962231', '#f2a0a9']),
  palette('shino', marker('palettes.shino'), ['#94501a', '#f0b27a']),
  palette('ash', marker('palettes.ash'), ['#5a6136', '#c5cc93'])
];

/**
 * Sets the page's colors: data-theme for a mode chosen in Settings (none
 * follows the device), data-palette for a palette other than the first, and
 * Bootstrap's data-bs-theme, for the details it draws itself (select arrows,
 * check marks), and the browser's bar color. A script in index.html does the
 * same from this browser's copy before the page first paints, so it does not
 * flash in the wrong colors.
 */
export function applyTheme(
  mode: ThemeMode,
  palette: Palette,
  root: HTMLElement = document.documentElement,
  media: MediaQueryList | undefined = globalThis.matchMedia?.('(prefers-color-scheme: dark)')
): void {
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
  if (palette === 'tenmoku') root.removeAttribute('data-palette');
  else root.setAttribute('data-palette', palette);
  const dark = mode === 'dark' || (mode === 'system' && !!media?.matches);
  root.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
  // index.html has one bar color for each device setting; a chosen mode sets both.
  for (const meta of root.ownerDocument.querySelectorAll('meta[name="theme-color"]')) {
    const own = meta.getAttribute('media')?.includes('dark') ? 'dark' : 'light';
    meta.setAttribute('content', BAR_COLORS[mode === 'system' ? own : mode]);
  }
}

/** The page background in light and dark (styles.scss --gc-bg), for the browser's bar. */
const BAR_COLORS = { light: '#f7f3ec', dark: '#1e1a17' };

/**
 * Keeps the page in the account's colors (an app initializer): as they are
 * chosen, when the device switches between light and dark, and on any device
 * the account signs in on, once the server has confirmed the session.
 */
export function watchTheme(): void {
  const preferences = inject(PreferencesService);
  const auth = inject(AuthService);
  const media = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
  const deviceDark = signal(!!media?.matches);
  media?.addEventListener('change', () => deviceDark.set(media.matches));

  effect(() => {
    deviceDark();
    applyTheme(preferences.theme(), preferences.palette(), document.documentElement, media);
  });

  effect(() => {
    const session = auth.sessionVersion();
    if (!auth.hasSession()) return;
    untracked(() => {
      void auth.whenChecked().then(() => {
        if (auth.hasSession() && auth.sessionVersion() === session) void preferences.load();
      });
    });
  });
}
