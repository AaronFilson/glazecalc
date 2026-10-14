import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appServerConfig } from './app/app.config.server';

// What the prerender calls once for each page (scripts/prerender.mjs), with the
// context renderApplication passes to say which render this is.
const bootstrap = (context: BootstrapContext) => bootstrapApplication(App, appServerConfig, context);

export default bootstrap;

// Exported from here so the script uses the copy built with the app: the
// package's own files are only partly compiled, and Node cannot run them as they are.
export { renderApplication } from '@angular/platform-server';
