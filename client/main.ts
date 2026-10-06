import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { followSystemTheme } from './app/core/theme';

followSystemTheme();
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
