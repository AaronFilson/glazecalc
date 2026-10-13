import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

/**
 * "Download my data" on the account page: links to the files the server builds
 * (server/routes/export_routes.ts). They are plain links, so the browser sends
 * its session cookie and saves the reply as a file. A trial has them too.
 */
@Component({
  selector: 'gc-export',
  imports: [TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <section class="auth-text">
      <h2>{{ t('account.export.heading') }}</h2>
      <p>{{ t('account.export.text') }}</p>
      <p>
        <a href="/api/export" download class="btn btn-primary">{{ t('account.export.json') }}</a>
      </p>
      <p>{{ t('account.export.csvText') }}</p>
      <p class="export-csv">
        <a href="/api/export/recipes.csv" download class="btn btn-primary">{{ t('account.export.recipes') }}</a>
        <a href="/api/export/materials.csv" download class="btn btn-primary">{{ t('account.export.materials') }}</a>
      </p>
    </section>
  </ng-container>`,
  styles: `
    .export-csv {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  `
})
export class ExportSection {}
