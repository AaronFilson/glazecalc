import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { PageHeader } from '../../shared/page-header';

@Component({
  selector: 'gc-trash-page',
  imports: [PageHeader, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('notebook.trash.title')" />
    <p class="help-text">{{ t('notebook.trash.comingSoon') }}</p>
  </ng-container>`
})
export class TrashPage {}
