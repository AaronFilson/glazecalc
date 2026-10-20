import { Component, Injector, OnInit, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { amountOf, isAmount, totalOf } from '../../../../lib/recipe/amounts';
import {
  PASTE_LIMITS,
  ambiguousNumbers,
  foldedName,
  importAmounts,
  matchName,
  parsePaste,
  pasteTooLong
} from '../../../../lib/recipe/paste';
import type { MatchHow, PastedRecipe } from '../../../../lib/recipe/paste';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { Additive, AdditiveUnit, Material, Recipe } from '../../core/models';
import { Busy } from '../../shared/busy';
import { localDate } from '../../shared/dates';
import { IsolatedPipe } from '../../shared/format-pipes';
import { formatLocale, notANumber, parseNumber, typedDecimalMark, upTo } from '../../shared/format';
import { Notices, NoticesList } from '../../shared/notices';
import { NumberInput } from '../../shared/number-input';
import { PageHeader } from '../../shared/page-header';
import { evaluate } from '../recipe/recipe-analysis';
import { FiringBlock, firingFromLines, readFiring, readsDecimalComma } from '../../../../lib/cones/firing';
import { LocaleService } from '../../core/locale.service';
import { firingLine } from '../recipe/firing-text';

/** The most recipes one paste shows, so the page stays usable. */
export const MOST_RECIPES = 30;

/** A record a line can be: a material or an additive, the potter's own or standard. */
interface Choice {
  key: string;
  kind: 'material' | 'additive';
  own: boolean;
  record: Material | Additive;
}

/** What a line's select holds: a record's key, nothing chosen yet, or the line left out. */
const UNCHOSEN = '';
const LEAVE_OUT = 'leave-out';

interface DraftLine {
  line: number;
  text: string;
  name: string;
  /** As saved: "20.5", or '' for none. */
  amount: string;
  /** Under an additions heading, marked "+", or ticked here. */
  addition: boolean;
  /** An addition's unit, as the paste gave it. */
  unit?: AdditiveUnit;
  choice: string;
  how: MatchHow;
  /** Whether the person has changed the choice from what was found. */
  changed: boolean;
  candidates: string[];
}

interface Draft {
  title: string;
  include: boolean;
  notes: string[];
  /** The firing read from the notes ("Cone 6 ox", "^6", "SK8", "1240°C"); the notes keep the text as pasted. */
  firedAt: FiringBlock | null;
  setAside: string[];
  lines: DraftLine[];
  /** Saved already: shown as saved, and not saved again. */
  saved: boolean;
}

/** What a found name says beside the select, as the key of its message. */
const HOW_NOTES: Partial<Record<MatchHow, string>> = {
  alias: marker('recipe.import.how.alias'),
  close: marker('recipe.import.how.close'),
  choose: marker('recipe.import.how.choose'),
  none: marker('recipe.import.how.none')
};

/**
 * Paste-in import: recipes pasted as text or CSV are read into lines
 * (lib/recipe/paste.js), each line's material found in the library, and
 * shown to be checked; a line can take another material, another amount, or
 * be left out. Nothing is saved until Save; a trial's or an account's limit
 * on recipes stops the saving where the server says so.
 */
@Component({
  selector: 'gc-import-page',
  imports: [FormsModule, IsolatedPipe, NoticesList, NumberInput, PageHeader, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('recipe.import.title')" [lead]="t('recipe.import.lead')" />
    <p class="no-print">
      <a routerLink="/recipe">{{ t('recipe.import.backToRecipes') }}</a>
    </p>
    <gc-notices [notices]="notices" />

    <section class="panel" aria-labelledby="paste-heading">
      <h2 class="h4" id="paste-heading">{{ t('recipe.import.pasteHeading') }}</h2>
      <label class="form-label" for="paste-text">{{ t('recipe.import.pasteLabel') }}</label>
      <textarea
        id="paste-text"
        class="form-control import-text"
        rows="10"
        spellcheck="false"
        aria-describedby="paste-help"
        [attr.maxlength]="limits.chars"
        [ngModel]="text()"
        (ngModelChange)="typed($event)"
      ></textarea>
      <p id="paste-help" class="small muted import-help">{{ t('recipe.import.pasteHelp') }}</p>
      @if (tooLong(); as reason) {
        <p class="import-too-long" role="alert">
          {{ t('recipe.import.tooLong', { reason, chars: limits.chars, lines: limits.lines }) }}
        </p>
      }
      <div class="import-actions">
        <button type="button" class="btn btn-primary" [attr.aria-disabled]="!ready() || null" (click)="readPaste()">
          {{ t('recipe.import.read') }}
        </button>
        @if (!ready()) {
          <span class="muted small" role="status">{{ t('recipe.import.gettingLibrary') }}</span>
        }
      </div>
    </section>

    <p class="visually-hidden" role="status">{{ readStatus() }}</p>

    @if (drafts().length) {
      <h2 class="h4" id="preview-heading" tabindex="-1">{{ t('recipe.import.previewHeading') }}</h2>
      @if (ambiguous().length) {
        <section class="panel import-ambiguous" role="group" aria-labelledby="import-ambiguous-text">
          <p id="import-ambiguous-text" class="import-ambiguous-text">
            {{
              t('recipe.import.ambiguous', {
                count: ambiguous().length,
                example: ambiguous()[0],
                decimal: asDecimal(ambiguous()[0]),
                group: asGroup(ambiguous()[0])
              })
            }}
          </p>
          <div class="import-actions">
            <button
              type="button"
              class="btn btn-light border"
              [attr.aria-pressed]="readingNow() === 'decimal'"
              (click)="readAs('decimal')"
            >
              {{ t('recipe.import.readAsDecimal', { example: ambiguous()[0], value: asDecimal(ambiguous()[0]) }) }}
            </button>
            <button
              type="button"
              class="btn btn-light border"
              [attr.aria-pressed]="readingNow() === 'group'"
              (click)="readAs('group')"
            >
              {{ t('recipe.import.readAsGroup', { example: ambiguous()[0], value: asGroup(ambiguous()[0]) }) }}
            </button>
          </div>
        </section>
      }
      @if (tooMany()) {
        <p class="muted">{{ t('recipe.import.tooMany', { max: mostRecipes }) }}</p>
      }
      @for (draft of drafts(); track $index; let r = $index) {
        <section class="panel import-recipe" [attr.aria-labelledby]="'import-recipe-' + r">
          <h3 class="h5" [id]="'import-recipe-' + r">
            {{ draft.title || t('recipe.import.untitled', { number: r + 1 }) }}
            @if (draft.saved) {
              <span class="import-saved">{{ t('recipe.import.savedMark') }}</span>
            }
          </h3>
          @if (!draft.saved) {
            <div class="import-recipe-top">
              <div class="import-title">
                <label class="form-label" [for]="'import-title-' + r">{{ t('recipe.import.titleLabel') }}</label>
                <input
                  type="text"
                  class="form-control"
                  [id]="'import-title-' + r"
                  [ngModel]="draft.title"
                  (ngModelChange)="setTitle(r, $event)"
                />
              </div>
              <div class="form-check import-include">
                <input
                  type="checkbox"
                  class="form-check-input"
                  [id]="'import-include-' + r"
                  [ngModel]="draft.include"
                  (ngModelChange)="setInclude(r, $event)"
                />
                <label class="form-check-label" [for]="'import-include-' + r">{{ t('recipe.import.include') }}</label>
              </div>
            </div>
            @if (draft.lines.length) {
              <ol class="import-lines">
                @for (line of draft.lines; track line.line; let i = $index) {
                  <li class="import-line" [class.is-out]="line.choice === leaveOut">
                    <div class="import-pasted">
                      <span class="visually-hidden">{{ t('recipe.import.pastedLine', { line: line.line }) }}</span>
                      <code dir="auto">{{ line.text }}</code>
                    </div>
                    <div class="import-fields">
                      <div class="import-material">
                        <label class="form-label small" [for]="'import-' + r + '-' + i">{{
                          t('recipe.import.materialFor', { name: line.name })
                        }}</label>
                        <select
                          class="form-select form-select-sm"
                          [id]="'import-' + r + '-' + i"
                          [attr.aria-describedby]="howNote(line) ? 'import-how-' + r + '-' + i : null"
                          [attr.aria-invalid]="line.choice === unchosen || null"
                          [ngModel]="line.choice"
                          (ngModelChange)="choose(r, i, $event)"
                        >
                          <option [value]="unchosen" disabled>{{ t('recipe.import.chooseOption') }}</option>
                          <option [value]="leaveOut">{{ t('recipe.import.leaveOut') }}</option>
                          @if (line.candidates.length) {
                            <optgroup [label]="t('recipe.import.closest')">
                              @for (key of line.candidates; track key) {
                                <option [value]="key">{{ nameOf(key) | gcIsolated }}</option>
                              }
                            </optgroup>
                          }
                          @for (group of groups(); track group.label) {
                            @if (group.choices.length) {
                              <optgroup [label]="t(group.label)">
                                @for (choice of group.choices; track choice.key) {
                                  <option [value]="choice.key">{{ choice.record.name | gcIsolated }}</option>
                                }
                              </optgroup>
                            }
                          }
                        </select>
                        @if (howNote(line); as note) {
                          <p
                            class="small import-how"
                            [class.is-question]="line.how === 'none' || line.how === 'choose'"
                            [id]="'import-how-' + r + '-' + i"
                          >
                            {{ t(note, { name: nameOf(line.choice) }) }}
                          </p>
                        }
                      </div>
                      <div class="import-amount">
                        <label class="form-label small" [for]="'import-amount-' + r + '-' + i">{{
                          t('recipe.import.amountLabel')
                        }}</label>
                        <input
                          type="text"
                          inputmode="decimal"
                          class="form-control form-control-sm"
                          [id]="'import-amount-' + r + '-' + i"
                          [attr.aria-invalid]="amountProblem(line) ? true : null"
                          [gcNumber]="line.amount"
                          (gcNumberChange)="setAmount(r, i, $event)"
                        />
                      </div>
                      <div class="form-check import-addition">
                        <input
                          type="checkbox"
                          class="form-check-input"
                          [id]="'import-add-' + r + '-' + i"
                          [disabled]="isAdditive(line.choice)"
                          [ngModel]="line.addition || isAdditive(line.choice)"
                          (ngModelChange)="setAddition(r, i, $event)"
                        />
                        <label class="form-check-label small" [for]="'import-add-' + r + '-' + i">{{
                          t('recipe.import.additionLabel')
                        }}</label>
                      </div>
                    </div>
                  </li>
                }
              </ol>
              <p class="import-totals">
                {{ t('recipe.import.baseTotal', { total: baseTotal(draft) }) }}
                @if (additionCount(draft); as count) {
                  · {{ t('recipe.import.additionCount', { count }) }}
                }
              </p>
            } @else {
              <p class="muted">{{ t('recipe.import.noLines') }}</p>
            }
            @if (draft.notes.length) {
              <p class="small muted keep-lines">
                {{ t('recipe.import.notesKept') }}
                <bdi>{{ draft.notes.join('\\n') }}</bdi>
              </p>
            }
            @if (draft.firedAt) {
              <p class="small import-firing">
                {{ t('recipe.import.firingRead', { firing: firingText(draft.firedAt) }) }}
              </p>
            }
            @if (draft.setAside.length) {
              <p class="small muted">{{ t('recipe.import.setAside', { lines: draft.setAside.join(' · ') }) }}</p>
            }
            @if (draft.include && problems()[r]?.length) {
              <ul class="import-problems" [id]="'import-problems-' + r">
                @for (problem of problems()[r]; track problem) {
                  <li>{{ problem }}</li>
                }
              </ul>
            }
          }
        </section>
      }

      @if (unsavedCount()) {
        <div class="import-save">
          <button type="button" class="btn btn-success" [attr.aria-disabled]="saving.active() || null" (click)="save()">
            {{ saving.active() ? t('recipe.import.saving') : t('recipe.import.save', { count: chosenCount() }) }}
          </button>
          @if (saveProblem()) {
            <p class="import-save-problem" role="alert">{{ saveProblem() }}</p>
          }
        </div>
      }
      @if (savedCount()) {
        <p>
          <a routerLink="/recipe" fragment="saved-recipes">{{ t('recipe.import.openRecipes') }}</a>
        </p>
      }
    } @else if (readEmpty()) {
      <p class="muted">{{ t('recipe.import.nothingRead') }}</p>
    }
  </ng-container>`,
  styles: `
    .import-text {
      font-family: var(--bs-font-monospace, monospace);
      font-size: 0.9rem;
    }
    .import-too-long {
      color: var(--gc-danger-text);
      margin: 0 0 0.75rem;
    }
    .import-ambiguous-text {
      margin: 0 0 0.5rem;
    }
    .import-help {
      margin: 0.5rem 0 0.75rem;
    }
    .import-actions,
    .import-save {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
    }
    .import-save {
      margin-bottom: 1rem;
    }
    .import-save-problem,
    .import-problems {
      color: var(--gc-danger-text);
      margin: 0;
    }
    .import-problems {
      padding-inline-start: 1.25rem;
      margin-top: 0.75rem;
    }
    .import-recipe-top {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.75rem 1.5rem;
      margin-bottom: 1rem;
    }
    .import-title {
      flex: 1 1 16rem;
    }
    .import-saved {
      font-size: 0.85rem;
      font-weight: normal;
      color: var(--gc-success-text);
      margin-inline-start: 0.5rem;
    }
    .import-lines {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .import-line {
      border-top: 1px solid var(--gc-border);
      padding: 0.6rem 0;
    }
    .import-line.is-out .import-pasted code {
      text-decoration: line-through;
      color: var(--gc-muted);
    }
    .import-pasted code {
      color: var(--gc-text);
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    .import-fields {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 0.5rem 1rem;
      margin-top: 0.35rem;
    }
    .import-material {
      flex: 1 1 15rem;
      min-width: 0;
    }
    .import-material .form-label,
    .import-amount .form-label {
      margin-bottom: 0.15rem;
      overflow-wrap: anywhere;
    }
    .import-amount {
      flex: 0 1 7rem;
    }
    .import-addition {
      align-self: flex-end;
      margin-bottom: 0.3rem;
    }
    .import-how {
      margin: 0.2rem 0 0;
      color: var(--gc-muted);
    }
    /* Red only where there is something to settle: not found, or several close. A best guess stays muted. */
    .import-how.is-question {
      color: var(--gc-danger-text);
    }
    .import-totals {
      border-top: 1px solid var(--gc-border);
      padding-top: 0.6rem;
      margin: 0;
      font-weight: 600;
    }
  `
})
export class ImportPage implements OnInit {
  private readonly resources = inject(ApiResourceFactory);
  private readonly injector = inject(Injector);
  private readonly locale = inject(LocaleService);
  private readonly recipes = this.resources.for<Recipe>('recipe');
  private readonly materials = this.resources.for<Material>('materials');
  private readonly additives = this.resources.for<Additive>('additives');

  protected readonly notices = new Notices();
  protected readonly saving = new Busy();
  protected readonly unchosen = UNCHOSEN;
  protected readonly leaveOut = LEAVE_OUT;
  protected readonly mostRecipes = MOST_RECIPES;

  protected readonly text = signal('');
  protected readonly drafts = signal<Draft[]>([]);
  protected readonly tooMany = signal(false);
  protected readonly limits = PASTE_LIMITS;
  /** Numbers in the paste that can be read two ways (1,500 is 1.5 or 1500), shown with a choice. */
  protected readonly ambiguous = signal<string[]>([]);
  /** How the person chose to read them; null until they do, when the locale reads them. */
  private readonly reading = signal<'decimal' | 'group' | null>(null);
  protected readonly readingNow = signal<'decimal' | 'group' | null>(null);
  /** Which limit the text is over, once Read has been pressed. */
  protected readonly tooLong = signal<'chars' | 'lines' | null>(null);
  /** Read, and nothing found. */
  protected readonly readEmpty = signal(false);
  protected readonly readStatus = signal('');
  protected readonly saveProblem = signal('');
  /** Whether Save was pressed, so problems show from then on, not while the person is still choosing. */
  private readonly triedSave = signal(false);

  private readonly myMaterials = signal<Material[] | null>(null);
  private readonly standardMaterials = signal<Material[] | null>(null);
  private readonly myAdditives = signal<Additive[] | null>(null);
  private readonly standardAdditives = signal<Additive[] | null>(null);

  /** Whether the library has arrived, to find names in. */
  protected readonly ready = computed(
    () => !!this.myMaterials() && !!this.standardMaterials() && !!this.myAdditives() && !!this.standardAdditives()
  );

  /** Every record a line can be, by its key: the potter's own first, as findNamed takes them. */
  private readonly choices = computed<Choice[]>(() => {
    const list: Choice[] = [];
    const add = (records: (Material | Additive)[] | null, kind: Choice['kind'], own: boolean) =>
      (records ?? []).forEach((record) => list.push({ key: kind[0] + list.length, kind, own, record }));
    add(this.myMaterials(), 'material', true);
    add(this.standardMaterials(), 'material', false);
    add(this.myAdditives(), 'additive', true);
    add(this.standardAdditives(), 'additive', false);
    return list;
  });
  private readonly byKey = computed(() => new Map(this.choices().map((choice) => [choice.key, choice])));

  /** The select's groups, each label the key of its message. */
  protected readonly groups = computed(() => {
    const of = (kind: Choice['kind'], own: boolean) => this.choices().filter((c) => c.kind === kind && c.own === own);
    return [
      { label: marker('recipe.import.yourMaterials'), choices: of('material', true) },
      { label: marker('recipe.import.standardMaterials'), choices: of('material', false) },
      { label: marker('recipe.import.yourAdditives'), choices: of('additive', true) },
      { label: marker('recipe.import.standardAdditives'), choices: of('additive', false) }
    ];
  });

  protected readonly unsavedCount = computed(() => this.drafts().filter((d) => !d.saved).length);
  protected readonly chosenCount = computed(() => this.drafts().filter((d) => !d.saved && d.include).length);
  protected readonly savedCount = computed(() => this.drafts().filter((d) => d.saved).length);

  /** What stops each recipe being saved, shown once Save has been pressed. */
  protected readonly problems = computed(() =>
    this.triedSave() ? this.drafts().map((draft) => (draft.saved || !draft.include ? [] : this.problemsOf(draft))) : []
  );

  ngOnInit(): void {
    void this.load(this.materials.getAll(), this.myMaterials, marker('recipe.page.fetchMaterials'));
    void this.load(this.materials.getStandard(), this.standardMaterials, marker('recipe.page.fetchStandardMaterials'));
    void this.load(this.additives.getAll(), this.myAdditives, marker('recipe.page.fetchAdditives'));
    void this.load(this.additives.getStandard(), this.standardAdditives, marker('recipe.page.fetchStandardAdditives'));
  }

  private async load<T>(request: Promise<T[]>, target: { set(value: T[]): void }, failure: string): Promise<void> {
    try {
      target.set(await request);
    } catch {
      // Names are still read against what did arrive.
      target.set([]);
      this.notices.error(translate(failure));
    }
  }

  protected typed(value: string): void {
    this.text.set(value);
    this.reading.set(null);
  }

  protected asDecimal = (token: string): number => Number(token.replace(',', '.'));
  protected asGroup = (token: string): number => Number(token.replace(/[.,]/, ''));

  /** Reads the paste again with the person's choice for the numbers that can be read two ways. */
  protected readAs(reading: 'decimal' | 'group'): void {
    this.reading.set(reading);
    this.readPaste();
  }

  /** Reads the pasted text into recipes to check, each line matched to a record. */
  protected readPaste(): void {
    if (!this.ready()) return;
    // A box cut off at its limit may have lost the rest of the paste: say so.
    const over = pasteTooLong(this.text()) ?? (this.text().length >= PASTE_LIMITS.chars ? 'chars' : null);
    this.tooLong.set(over);
    if (over) {
      this.drafts.set([]);
      this.ambiguous.set([]);
      this.readEmpty.set(false);
      this.readStatus.set(translate('recipe.import.tooLong', { reason: over, ...PASTE_LIMITS }));
      return;
    }
    const choices = this.choices();
    const records = choices.map((c) => c.record);
    const names = new Set(choices.flatMap((c) => [c.record.name, ...(c.record.aliases ?? [])]).map(foldedName));
    const read = parsePaste(this.text(), {
      mark: typedDecimalMark(),
      locale: formatLocale(),
      reading: this.reading() ?? undefined,
      isName: (text) => names.has(foldedName(text)),
      // A line that is like any material, even only closely, is never taken for a title ("Leach 4321").
      known: (text) => matchName(text, records).how !== 'none'
    }).filter((recipe) => recipe.lines.length);
    const unsure = ambiguousNumbers(this.text(), typedDecimalMark());
    this.ambiguous.set(unsure);
    this.readingNow.set(
      !unsure.length
        ? null
        : (this.reading() ??
            (parseNumber(unsure[0], typedDecimalMark(), formatLocale()) === this.asDecimal(unsure[0])
              ? 'decimal'
              : 'group'))
    );
    this.tooMany.set(read.length > MOST_RECIPES);
    const drafts = read.slice(0, MOST_RECIPES).map((recipe) => this.draftOf(recipe, choices));
    this.drafts.set(drafts);
    this.triedSave.set(false);
    this.saveProblem.set('');
    this.readEmpty.set(!drafts.length);
    this.readStatus.set(
      drafts.length
        ? translate('recipe.import.readCount', {
            count: drafts.length,
            lines: drafts.reduce((sum, d) => sum + d.lines.length, 0)
          })
        : translate('recipe.import.nothingRead')
    );
    if (drafts.length) {
      afterNextRender(() => document.getElementById('preview-heading')?.focus(), { injector: this.injector });
    }
  }

  private draftOf(recipe: PastedRecipe, choices: Choice[]): Draft {
    const keyOf = new Map<object, string>(choices.map((c) => [c.record, c.key]));
    const materialsFirst = [
      ...choices.filter((c) => c.kind === 'material'),
      ...choices.filter((c) => c.kind === 'additive')
    ];
    const additivesFirst = [
      ...choices.filter((c) => c.kind === 'additive'),
      ...choices.filter((c) => c.kind === 'material')
    ];
    const amounts = importAmounts(recipe);
    const reading = { decimalComma: readsDecimalComma(typedDecimalMark(), formatLocale()) };
    return {
      title: recipe.title ?? '',
      include: true,
      notes: recipe.notes,
      // A title counts too, but only when it names a cone or a temperature ("Cone 6 Red"): a one-word
      // name such as "Red", "Salt" or "Wood" is a glaze's name, not a firing.
      firedAt: firingFromLines(
        [...(recipe.title && readFiring(recipe.title, reading)?.scale ? [recipe.title] : []), ...recipe.notes],
        this.locale.cones(),
        reading
      ),
      setAside: recipe.skipped.map((s) => s.text.trim()),
      saved: false,
      lines: recipe.lines.map((line, i) => {
        const order = (line.addition ? additivesFirst : materialsFirst).map((c) => c.record);
        const match = matchName(line.name, order);
        return {
          line: line.line,
          text: line.text,
          name: line.name,
          amount: amounts[i].amount,
          addition: line.addition,
          unit: amounts[i].unit,
          choice: match.record ? keyOf.get(match.record)! : UNCHOSEN,
          how: match.how,
          changed: false,
          candidates: match.candidates.map((record) => keyOf.get(record)!)
        };
      })
    };
  }

  protected nameOf(key: string): string {
    return this.byKey().get(key)?.record.name ?? '';
  }

  protected isAdditive(key: string): boolean {
    return this.byKey().get(key)?.kind === 'additive';
  }

  /** The note beside a line's select, as the key of its message, until the person changes the choice. */
  protected howNote(line: DraftLine): string | null {
    if (line.changed || line.choice === LEAVE_OUT) return null;
    return HOW_NOTES[line.how] ?? null;
  }

  private updateLine(r: number, i: number, change: Partial<DraftLine>): void {
    this.drafts.update((drafts) =>
      drafts.map((draft, at) =>
        at === r ? { ...draft, lines: draft.lines.map((line, j) => (j === i ? { ...line, ...change } : line)) } : draft
      )
    );
  }

  protected choose(r: number, i: number, key: string): void {
    this.updateLine(r, i, { choice: key, changed: true });
  }

  protected setAmount(r: number, i: number, amount: string): void {
    this.updateLine(r, i, { amount });
  }

  protected setAddition(r: number, i: number, addition: boolean): void {
    this.updateLine(r, i, { addition });
  }

  protected setTitle(r: number, title: string): void {
    this.drafts.update((drafts) => drafts.map((draft, at) => (at === r ? { ...draft, title } : draft)));
  }

  protected setInclude(r: number, include: boolean): void {
    this.drafts.update((drafts) => drafts.map((draft, at) => (at === r ? { ...draft, include } : draft)));
  }

  /** Whether a line, with its record, goes among the additions. */
  private goesInAdditions(line: DraftLine): boolean {
    return line.addition || this.isAdditive(line.choice);
  }

  private kept(draft: Draft): DraftLine[] {
    return draft.lines.filter((line) => line.choice !== LEAVE_OUT && line.choice !== UNCHOSEN);
  }

  protected baseTotal(draft: Draft): string {
    return upTo(
      totalOf(
        this.kept(draft)
          .filter((l) => !this.goesInAdditions(l))
          .map((l) => l.amount)
      ),
      3
    );
  }

  protected additionCount(draft: Draft): number {
    return this.kept(draft).filter((l) => this.goesInAdditions(l)).length;
  }

  protected amountProblem(line: DraftLine): string | null {
    if (line.choice === LEAVE_OUT) return null;
    if (!line.amount.trim()) return translate('recipe.import.problems.noAmount', { line: line.line });
    return isAmount(line.amount)
      ? null
      : translate('recipe.import.problems.amount', { line: line.line, problem: notANumber() });
  }

  /** The recipe a draft saves as: base materials, then additions, each a copy of its record. */
  private recipeOf(draft: Draft): Recipe {
    const lines = this.kept(draft);
    const base = lines.filter((l) => !this.goesInAdditions(l));
    // A colorant found among the base materials is a percent of a base that adds up to 100, otherwise parts of it.
    const baseUnit: AdditiveUnit = Math.abs(totalOf(base.map((l) => l.amount)) - 100) <= 0.5 ? 'percent' : 'parts';
    const record = (line: DraftLine) => structuredClone(this.byKey().get(line.choice)!.record);
    return {
      title: draft.title.trim(),
      date: localDate(),
      notes: draft.notes.join('\n'),
      materials: base.map((line) => ({ ...(record(line) as Material), amount: line.amount })),
      additives: lines
        .filter((l) => this.goesInAdditions(l))
        .map((line) => ({
          ...(record(line) as Additive),
          amount: line.amount,
          unit: line.addition ? (line.unit ?? baseUnit) : baseUnit
        })),
      includeAdditives: false,
      ...(draft.firedAt && { firedAt: draft.firedAt })
    };
  }

  /** A firing read from the notes, in words. */
  protected firingText(block: FiringBlock): string {
    return firingLine(block, { cones: this.locale.cones(), temperature: this.locale.temperature() });
  }

  private problemsOf(draft: Draft): string[] {
    const problems: string[] = [];
    if (!draft.title.trim()) problems.push(translate('recipe.import.problems.title'));
    const unchosen = draft.lines.filter((line) => line.choice === UNCHOSEN).length;
    if (unchosen) problems.push(translate('recipe.import.problems.choose', { count: unchosen }));
    for (const line of this.kept(draft)) {
      const problem = this.amountProblem(line);
      if (problem) problems.push(problem);
    }
    if (problems.length) return problems;
    const recipe = this.recipeOf(draft);
    if (!recipe.materials.some((m) => amountOf(m.amount) > 0)) {
      problems.push(translate('recipe.import.problems.noMaterials'));
      return problems;
    }
    const { analysis, problem } = evaluate(recipe.materials, recipe.additives ?? []);
    if (!analysis) {
      problems.push(
        problem !== null
          ? translate('recipe.import.problems.noUnity', { problem })
          : translate('recipe.page.notSavedNoUnity')
      );
    }
    return problems;
  }

  /** Saves each recipe chosen, one at a time, stopping at the first the server refuses. */
  protected save(): Promise<void> {
    return this.saving.run(async () => {
      this.triedSave.set(true);
      this.saveProblem.set('');
      const chosen = this.drafts()
        .map((draft, index) => ({ draft, index }))
        .filter(({ draft }) => !draft.saved && draft.include);
      if (!chosen.length) {
        this.saveProblem.set(translate('recipe.import.noneChosen'));
        return;
      }
      const firstProblem = chosen.find(({ draft }) => this.problemsOf(draft).length);
      if (firstProblem) {
        this.saveProblem.set(translate('recipe.import.fixFirst'));
        afterNextRender(() => document.getElementById('import-title-' + firstProblem.index)?.focus(), {
          injector: this.injector
        });
        return;
      }
      let saved = 0;
      for (const { draft, index } of chosen) {
        const recipe = this.recipeOf(draft);
        recipe.computed = evaluate(recipe.materials, recipe.additives ?? []).analysis!;
        try {
          await this.recipes.create(recipe);
        } catch (err) {
          const problem = errorMessage(err, translate('recipe.import.saveFailed'));
          this.saveProblem.set(
            saved
              ? translate('recipe.import.stopped', { saved, count: chosen.length, problem })
              : translate('recipe.import.notSaved', { problem })
          );
          return;
        }
        saved++;
        this.drafts.update((drafts) => drafts.map((d, at) => (at === index ? { ...d, saved: true } : d)));
      }
      this.notices.success(translate('recipe.import.saved', { count: saved }), 'save');
    });
  }
}
