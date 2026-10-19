import { DatePipe } from '../../shared/format-pipes';
import { Component, OnInit, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { FiringLinksService } from '../../core/firing-links.service';
import { LocaleService } from '../../core/locale.service';
import { Firing, Recipe } from '../../core/models';
import { Busy } from '../../shared/busy';
import { FORM_GRID_STYLES } from '../../shared/chemistry-form';
import { FieldCheck, FieldChecks, required } from '../../shared/field-checks';
import { Notices, NoticesList } from '../../shared/notices';
import { localDate, optional } from '../../shared/dates';
import { FIRING_FIELDS, firingFieldLabel, firstOf } from '../../shared/options';
import { PageHeader } from '../../shared/page-header';
import { Removal, RemoveButton } from '../../shared/remove-button';
import { FiringLog } from './firing-log';

@Component({
  selector: 'gc-firing-page',
  imports: [DatePipe, FieldCheck, FormsModule, NoticesList, PageHeader, RemoveButton, RouterLink, TranslocoDirective],
  templateUrl: './firing-page.html',
  // Labels above their fields, as on the recipe and account pages.
  styles: [
    FORM_GRID_STYLES,
    `
      .firing-field {
        margin-bottom: 1rem;
      }
      #firing-notes {
        max-width: 48rem;
      }
      .field-pick {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        max-width: 30rem;
      }
      .field-pick select {
        flex: 1 1 12rem;
        width: auto;
      }
      .included-fields {
        padding-inline-start: 1.25rem;
        margin: 0;
      }
      .included-fields > li {
        padding: 0.35rem 0;
        border-bottom: 1px solid var(--gc-border);
      }
      .included-name {
        display: inline-block;
        min-width: 10rem;
        margin-inline-end: 0.5rem;
      }
      .included-buttons {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 0.4rem;
      }
      /* Positioned, so the table's visually hidden heading stays inside the scrolling box rather than widening the page. */
      .firing-table-scroll {
        position: relative;
        overflow-x: auto;
      }
      .firing-cell {
        min-width: 6rem;
      }
      .firing-buttons {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem 1rem;
        margin-bottom: 1rem;
      }
      .stored-firings {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .stored-firing + .stored-firing {
        border-top: 1px solid var(--gc-border);
        padding-top: 1rem;
      }
      .stored-firing h3 {
        margin: 0 0 0.25rem;
      }
      .stored-firing p {
        margin: 0 0 0.5rem;
      }
      .fired-recipes {
        margin: 0.5rem 0;
      }
      .fired-list {
        list-style: none;
        padding: 0;
        margin: 0 0 0.5rem;
      }
      .fired-list li {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.25rem 0.75rem;
        padding: 0.15rem 0;
      }
    `
  ]
})
export class FiringPage implements OnInit {
  private readonly firings = inject(ApiResourceFactory).for<Firing>('firing');

  /** A column as the reader reads it; the log keeps its English name. */
  protected readonly fieldLabel = firingFieldLabel;
  protected readonly firstOf = firstOf;
  protected readonly notices = new Notices();
  protected readonly saving = new Busy();

  protected readonly title = signal('');
  protected readonly kiln = signal('');
  protected readonly date = signal('');
  protected readonly notes = signal('');
  private readonly locale = inject(LocaleService);
  /** A new log starts with Time, Temperature and Cone; until it is changed, the temperature follows the person's scale. */
  protected readonly log = linkedSignal<'C' | 'F', FiringLog>({
    source: this.locale.temperature,
    computation: (scale, previous) => (previous && !previous.value.pristine ? previous.value : FiringLog.starter(scale))
  });
  /** The fields not in the log yet: one already added is not offered again. */
  protected readonly fieldOptions = computed(() => FIRING_FIELDS.filter((field) => !this.log().fields.includes(field)));
  /** The field chosen to add: kept while it is still offered, else the first that is. */
  protected readonly selectedField = linkedSignal<string[], string>({
    source: this.fieldOptions,
    computation: (options, previous) =>
      previous && options.includes(previous.value) ? previous.value : (options[0] ?? '')
  });
  protected readonly checks = new FieldChecks(
    () => ({
      title: required(this.title, translate('notebook.firing.titleMissing')),
      fields: () =>
        this.log().fields.length
          ? null
          : translate('notebook.firing.fieldsMissing', { example: firingFieldLabel('Time') })
    }),
    { sendOnly: ['fields'] }
  );

  protected readonly myFirings = signal<Firing[]>([]);
  /** The saved firings have been asked for: until then, "None yet" would be premature. */
  protected readonly loaded = signal(false);
  protected readonly removal = new Removal(this.firings, this.myFirings, this.notices, (firing) => firing.title);

  // The recipes fired in each log (docs/adr/0021-recipe-firing.md): the links are kept on the recipes,
  // which list the logs they went through; here a log can pick them too.
  private readonly recipes = inject(ApiResourceFactory).for<Recipe>('recipe');
  private readonly links = inject(FiringLinksService);
  protected readonly myRecipes = signal<Recipe[]>([]);
  /** The recipes could not be fetched: a log offers none to pick, and says so. */
  protected readonly recipesFailed = signal(false);
  /** The log whose recipe link is being saved. */
  protected readonly linking = signal<string | null>(null);

  /** The recipes linked to a log. */
  protected firedIn(firing: Firing): Recipe[] {
    return this.myRecipes().filter((recipe) => recipe.firings?.some((link) => link.firing === firing._id));
  }

  /** The recipes that could be linked to a log: the rest, newest first. */
  protected notFiredIn(firing: Firing): Recipe[] {
    return [...this.myRecipes()].reverse().filter((recipe) => !recipe.firings?.some((l) => l.firing === firing._id));
  }

  /**
   * Links a recipe to a log, or takes the link off; the recipe keeps it (with its result note). One link
   * changes on the server, never the recipe's whole list, so the recipe page open at once loses nothing.
   */
  protected async setFiredIn(firing: Firing, recipeId: string, fired: boolean): Promise<void> {
    const recipe = this.myRecipes().find((r) => r._id === recipeId);
    if (!recipe || !firing._id) return;
    this.linking.set(firing._id);
    try {
      const next = fired ? await this.links.link(recipeId, firing._id) : await this.links.unlink(recipeId, firing._id);
      this.myRecipes.update((list) => list.map((r) => (r._id === recipeId ? { ...r, firings: next } : r)));
    } catch (err) {
      this.notices.error(errorMessage(err, translate('notebook.firing.linkFailed')));
    } finally {
      this.linking.set(null);
    }
  }

  async ngOnInit(): Promise<void> {
    void this.recipes.getAll().then(
      (list) => this.myRecipes.set(list),
      () => this.recipesFailed.set(true)
    );
    try {
      this.myFirings.set(await this.firings.getAll());
    } catch {
      this.notices.error(translate('notebook.firing.fetchFailed'));
    } finally {
      this.loaded.set(true);
    }
  }

  protected addField(): void {
    const field = this.selectedField();
    if (!field) {
      this.checks.report('fields', translate('notebook.firing.chooseField'));
      return;
    }
    this.change((log) => log.addField(field));
    this.checks.recheck('fields');
  }

  protected moveField(index: number, direction: -1 | 1): void {
    this.change((log) => log.moveField(index, direction));
  }

  protected removeField(index: number): void {
    this.change((log) => log.removeField(index));
  }

  protected addRow(): void {
    this.change((log) => log.addRow());
  }

  protected removeRow(index: number): void {
    this.change((log) => log.removeRow(index));
  }

  protected setCell(row: number, column: number, value: string): void {
    // Edits a cell in place; the row arrays are owned by this log.
    this.log().rows[row][column] = value;
  }

  protected save(): Promise<void> {
    return this.saving.run(() => this.saveNow());
  }

  private async saveNow(): Promise<void> {
    const log = this.log();
    if (!this.checks.validate()) return;
    try {
      const saved = await this.firings.create({
        title: this.title(),
        kiln: optional(this.kiln()),
        date: this.date() || localDate(),
        notes: optional(this.notes()),
        fieldsIncluded: log.fields,
        rows: log.rows
      });
      this.myFirings.update((list) => [...list, saved]);
      this.notices.success(translate('notebook.firing.saved'));
      for (const field of [this.title, this.kiln, this.date, this.notes]) field.set('');
      this.log.set(FiringLog.starter(this.locale.temperature()));
    } catch (err) {
      this.notices.error(errorMessage(err, translate('notebook.firing.saveFailed')));
    }
  }

  /** Applies a change to a copy of the log so the view sees a new value. */
  private change(edit: (log: FiringLog) => void): void {
    this.log.update((current) => {
      const next = Object.assign(new FiringLog(), current, { pristine: false });
      edit(next);
      return next;
    });
  }
}
