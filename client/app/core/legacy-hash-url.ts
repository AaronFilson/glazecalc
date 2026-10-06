/**
 * Until 2026 the app used hash URLs (/#/recipe), and old bookmarks and emails
 * still do. Before the router starts, /#/recipe?x=1 becomes /recipe?x=1. This
 * only changes the browser's history entry; nothing is sent to the server.
 */
export function redirectLegacyHashUrl(location: Location = window.location, history: History = window.history): void {
  if (location.pathname === '/' && location.hash.startsWith('#/')) {
    history.replaceState(history.state, '', location.hash.slice(1));
  }
}
