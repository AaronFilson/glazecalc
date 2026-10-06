/**
 * The palette follows the system light/dark setting in CSS (styles.scss). This
 * tells Bootstrap too, for the details it draws itself (select arrows, check
 * marks, close buttons), and keeps it in step if the setting changes.
 */
export function followSystemTheme(
  root: HTMLElement = document.documentElement,
  media: MediaQueryList | undefined = globalThis.matchMedia?.('(prefers-color-scheme: dark)')
): void {
  if (!media) return;
  const apply = () => root.setAttribute('data-bs-theme', media.matches ? 'dark' : 'light');
  apply();
  media.addEventListener('change', apply);
}
