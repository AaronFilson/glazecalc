import { Component } from '@angular/core';
import { PageHeader } from '../../shared/page-header';

@Component({
  selector: 'gc-trash-page',
  imports: [PageHeader],
  template: `
    <gc-page-header title="Trash" />
    <p class="help-text">
      The trash functionality is coming soon in the next version of the Glaze Calc app. Until then, use the delete /
      remove with care: once it is gone the info is lost.
    </p>
  `
})
export class TrashPage {}
