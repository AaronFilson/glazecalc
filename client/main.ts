import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { chosenLanguage, ownLanguagePage } from './app/i18n/own-language';

// A reader who chose a language opens English pages in it, before anything is drawn.
const own = ownLanguagePage(chosenLanguage());
if (own) location.replace(own);
else bootstrapApplication(App, appConfig).catch((err) => console.error(err));
