/**
 * Until 2026 the app used hash URLs (/#/recipe), and old bookmarks and emails
 * still do. Before the router starts, /#/recipe?x=1 becomes /recipe?x=1. This
 * only changes the browser's history entry; nothing is sent to the server.
 *
 * Only a path on this site: /#//other.example (or /#/\other.example) would
 * name another site, which replaceState refuses with an error, and an error
 * here, in the app's initializer, would stop the app from starting. Any other
 * address the browser will not take is left as it is, for the same reason.
 */
export function redirectLegacyHashUrl(location: Location = window.location, history: History = window.history): void {
  if (location.pathname !== '/' || !/^#\/(?![/\\])/.test(location.hash)) return;
  try {
    history.replaceState(history.state, '', location.hash.slice(1));
  } catch {
    // The page starts at the address it has.
  }
}
