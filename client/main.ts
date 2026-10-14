import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

const start = (): void => {
  bootstrapApplication(App, appConfig).catch((err) => console.error(err));
};

/**
 * Runs `then` once the page has been painted. A prerendered page (scripts/prerender.mjs) is readable as it
 * arrives, and adopting it is the longest task of the start (a guide's hundreds of elements): painted first,
 * the reader sees the page while the app adopts it, rather than after. A page that is not shown (a tab opened
 * in the background) is not painted, so it starts at once, as it does if no paint is reported in time.
 */
function afterFirstPaint(then: () => void): void {
  const painted = () => performance.getEntriesByName('first-contentful-paint').length > 0;
  if (document.visibilityState !== 'visible' || typeof PerformanceObserver === 'undefined' || painted()) {
    then();
    return;
  }
  let started = false;
  const go = (): void => {
    if (started) return;
    started = true;
    observer.disconnect();
    clearTimeout(timer);
    then();
  };
  const observer = new PerformanceObserver(() => {
    if (painted()) go();
  });
  observer.observe({ type: 'paint', buffered: true });
  const timer = setTimeout(go, 500);
}

// index.html's script sends a reader who chose a language to the page in it, before anything is drawn.
// There is nothing to start for a page that is being left.
if (!document.documentElement.hasAttribute('data-leaving')) {
  // The transfer state the prerender writes at the end of a page marks it as prerendered.
  if (document.getElementById('ng-state')) afterFirstPaint(start);
  else start();
}
