import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// index.html's script sends a reader who chose a language to the page in it, before anything is drawn.
// There is nothing to start for a page that is being left.
if (!document.documentElement.hasAttribute('data-leaving')) {
  bootstrapApplication(App, appConfig).catch((err) => console.error(err));
}
