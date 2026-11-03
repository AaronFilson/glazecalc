import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../core/api-base';
import { errorMessage } from '../../core/error-message';
import { DatePipe } from '../../shared/format-pipes';

/** The kinds of record an import carries, in the order the page lists them (server/lib/import_data.ts). */
export const IMPORT_KINDS = ['recipes', 'materials', 'additives', 'firing', 'notes', 'advice'] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];
export type Choice = 'both' | 'skip' | 'replace';

/** The largest file the server takes (IMPORT_BODY_LIMIT); checked here first, so a big file is never sent. */
export const IMPORT_MOST_BYTES = 20 * 1024 * 1024;

/** A record of the file with the name of one of the account's, but other content. */
export interface SimilarRecord {
  kind: ImportKind;
  index: number;
  title: string;
  existingId: string;
  existingTitle: string;
}

/** What POST /api/import/preview answers. */
export interface ImportPreview {
  version: number;
  counts: Partial<Record<ImportKind, { inFile: number; new: number; identical: number; similar: number }>>;
  similar: SimilarRecord[];
  warnings: Partial<Record<WarningCode, number>>;
  preferences: number;
  prices: number;
  shelf: number;
  accountHasPrices: boolean;
  adding: number;
  roomLeft: number;
  fits: boolean;
}

/** What POST /api/import answers. */
export interface ImportResult {
  importId: string;
  undoUntil: string;
  counts: Partial<Record<ImportKind, { added: number; replaced: number; skipped: number }>>;
  warnings: Partial<Record<WarningCode, number>>;
}

/** A record the server could not read, from a 422 import-invalid. */
export interface ImportProblem {
  kind: ImportKind;
  index: number;
  title?: string;
  reason: 'not-object' | 'missing' | 'invalid';
  field?: string;
}

type WarningCode = 'line-unlinked' | 'firing-link-dropped' | 'note-unlinked' | 'key-dropped';

const KIND_NAMES: Record<ImportKind, string> = {
  recipes: marker('account.import.kinds.recipes'),
  materials: marker('account.import.kinds.materials'),
  additives: marker('account.import.kinds.additives'),
  firing: marker('account.import.kinds.firing'),
  notes: marker('account.import.kinds.notes'),
  advice: marker('account.import.kinds.advice')
};
const WARNINGS: Record<WarningCode, string> = {
  'line-unlinked': marker('account.import.warnings.lineUnlinked'),
  'firing-link-dropped': marker('account.import.warnings.firingLinkDropped'),
  'note-unlinked': marker('account.import.warnings.noteUnlinked'),
  'key-dropped': marker('account.import.warnings.keyDropped')
};
const REASONS: Record<ImportProblem['reason'], string> = {
  'not-object': marker('account.import.problemNotObject'),
  missing: marker('account.import.problemMissing'),
  invalid: marker('account.import.problemInvalid')
};

const keyOf = (record: { kind: string; index: number }): string => `${record.kind}:${record.index}`;

/**
 * "Import my data" on the account page: reads a file from Download my data
 * (server/routes/import_routes.ts) in the browser and posts it, first for a
 * preview (what would be added, what is already here, which records have the
 * name of one already here), then for the import. For each record with a
 * name already here the person chooses: keep both, skip, or replace theirs;
 * each kind has shortcuts to choose for all of it. The file stays in memory
 * between the two steps and is never kept by the server. For 24 hours an
 * import can be undone. Not for a trial: the page leaves it out.
 */
@Component({
  selector: 'gc-import',
  imports: [DatePipe, FormsModule, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <section class="auth-text" aria-labelledby="import-heading">
      <h2 id="import-heading" tabindex="-1">{{ t('account.import.heading') }}</h2>
      <p>{{ t('account.import.text') }}</p>
      <p class="small muted">{{ t('account.import.never') }}</p>
      @if (!result()) {
        <div class="mb-3 import-file">
          <label for="import-file" class="form-label">{{ t('account.import.choose') }}</label>
          <input
            #picker
            id="import-file"
            type="file"
            accept=".json,application/json"
            class="form-control"
            [attr.aria-disabled]="busy() || null"
            (change)="chosen(picker)"
          />
        </div>
      }
      @if (problem()) {
        <p class="text-danger import-problem" role="alert">{{ problem() }}</p>
      }
      @if (problems().length) {
        <ul class="import-problems">
          @for (row of problems(); track $index) {
            <li>
              {{
                t('account.import.problemRow', {
                  kind: row.kind,
                  number: row.index + 1,
                  title: row.title ?? '',
                  reason: t(reason(row.reason), { field: row.field ?? '' })
                })
              }}
            </li>
          }
        </ul>
      }
      @if (preview(); as p) {
        <div class="import-preview" role="region" aria-labelledby="import-preview-heading">
          <h3 id="import-preview-heading" class="h5" tabindex="-1">{{ t('account.import.previewHeading') }}</h3>
          <ul class="import-counts">
            @for (kind of kindsIn(p); track kind) {
              <li>
                {{
                  t('account.import.row', {
                    what: t(kindName(kind), { count: p.counts[kind]!.inFile }),
                    new: p.counts[kind]!.new,
                    identical: p.counts[kind]!.identical,
                    similar: p.counts[kind]!.similar
                  })
                }}
              </li>
            }
          </ul>
          @for (code of warningsIn(p.warnings); track code) {
            <p class="small import-warning">{{ t(warning(code), { count: p.warnings[code] }) }}</p>
          }
          @if (p.similar.length) {
            <h4 class="h6">{{ t('account.import.similarHeading') }}</h4>
            <p>{{ t('account.import.similarText') }}</p>
            <p class="small muted">{{ t('account.import.replaceNote') }}</p>
            @for (kind of similarKinds(); track kind) {
              <fieldset class="import-kind">
                <legend class="h6">{{ t(kindName(kind), { count: similarOf(kind).length }) }}</legend>
                <div class="import-all d-flex flex-wrap gap-2 mb-3">
                  <button type="button" class="btn btn-light border btn-sm" (click)="chooseAll(kind, 'both')">
                    {{ t('account.import.allBoth') }}
                  </button>
                  <button type="button" class="btn btn-light border btn-sm" (click)="chooseAll(kind, 'skip')">
                    {{ t('account.import.allSkip') }}
                  </button>
                  <button type="button" class="btn btn-light border btn-sm" (click)="chooseAll(kind, 'replace')">
                    {{ t('account.import.allReplace') }}
                  </button>
                </div>
                <ul class="import-similar">
                  @for (row of similarOf(kind); track row.index) {
                    <li>
                      <div class="import-names">
                        <bdi>{{ row.title || t('account.import.untitled') }}</bdi>
                        <span class="small muted">{{
                          t('account.import.yours', { title: row.existingTitle || t('account.import.untitled') })
                        }}</span>
                      </div>
                      <div
                        class="import-choice"
                        role="radiogroup"
                        [attr.aria-label]="row.title || t('account.import.untitled')"
                      >
                        @for (choice of choiceList; track choice.value) {
                          <label class="form-check form-check-inline">
                            <input
                              class="form-check-input"
                              type="radio"
                              [name]="'import-' + keyOf(row)"
                              [value]="choice.value"
                              [checked]="choices()[keyOf(row)] === choice.value"
                              (change)="choose(row, choice.value)"
                            />
                            <span class="form-check-label">{{ t(choice.label) }}</span>
                          </label>
                        }
                      </div>
                    </li>
                  }
                </ul>
              </fieldset>
            }
          }
          @if (p.preferences || p.prices || p.shelf) {
            <fieldset class="import-options">
              <legend class="h6">{{ t('account.import.optionsHeading') }}</legend>
              @if (p.preferences) {
                <div class="form-check">
                  <input
                    id="import-preferences"
                    class="form-check-input"
                    type="checkbox"
                    [(ngModel)]="takePreferences"
                  />
                  <label for="import-preferences" class="form-check-label">{{
                    t('account.import.optPreferences', { count: p.preferences })
                  }}</label>
                </div>
              }
              @if (p.prices) {
                <div class="form-check">
                  <input id="import-prices" class="form-check-input" type="checkbox" [(ngModel)]="takePrices" />
                  <label for="import-prices" class="form-check-label">{{
                    t('account.import.optPrices', { count: p.prices })
                  }}</label>
                </div>
              }
              @if (p.shelf) {
                <div class="form-check">
                  <input id="import-shelf" class="form-check-input" type="checkbox" [(ngModel)]="takeShelf" />
                  <label for="import-shelf" class="form-check-label">{{
                    t('account.import.optShelf', { count: p.shelf })
                  }}</label>
                </div>
              }
            </fieldset>
          }
          @if (!p.fits) {
            <p class="text-danger" role="alert">
              {{ t('account.import.overLimit', { count: adding(), room: p.roomLeft }) }}
            </p>
          } @else if (!adding() && !replacing()) {
            <p class="import-nothing">{{ t('account.import.nothingNew') }}</p>
          }
          <div class="d-flex flex-wrap gap-2">
            <button
              id="import-submit"
              type="button"
              class="btn btn-primary"
              [attr.aria-disabled]="busy() || null"
              (click)="importNow()"
            >
              {{ t('account.import.import') }}
            </button>
            <button type="button" class="btn btn-light border" (click)="reset()">
              {{ t('account.import.cancel') }}
            </button>
          </div>
        </div>
      }
      @if (result(); as r) {
        <div class="import-result" role="region" aria-labelledby="import-done-heading">
          <h3 id="import-done-heading" class="h5" tabindex="-1">{{ t('account.import.doneHeading') }}</h3>
          <ul>
            @for (kind of resultKinds(r); track kind) {
              <li>
                {{
                  t('account.import.doneRow', {
                    what: t(kindName(kind), {
                      count: r.counts[kind]!.added + r.counts[kind]!.replaced + r.counts[kind]!.skipped
                    }),
                    added: r.counts[kind]!.added,
                    replaced: r.counts[kind]!.replaced,
                    skipped: r.counts[kind]!.skipped
                  })
                }}
              </li>
            }
          </ul>
          @for (code of warningsIn(r.warnings); track code) {
            <p class="small import-warning">{{ t(warning(code), { count: r.warnings[code] }) }}</p>
          }
          @if (undone()) {
            <p role="status" class="import-undone">{{ undone() }}</p>
            <button type="button" class="btn btn-light border" (click)="reset()">
              {{ t('account.import.again') }}
            </button>
          } @else {
            <p>{{ t('account.import.undoText', { date: (r.undoUntil | gcDate: 'moment') }) }}</p>
            <div class="d-flex flex-wrap gap-2">
              <button
                id="import-undo"
                type="button"
                class="btn btn-outline-secondary"
                [attr.aria-disabled]="busy() || null"
                (click)="undo()"
              >
                {{ t('account.import.undo') }}
              </button>
              <button type="button" class="btn btn-light border" (click)="reset()">
                {{ t('account.import.again') }}
              </button>
            </div>
          }
        </div>
      }
    </section>
  </ng-container>`,
  styles: `
    .import-file,
    .import-preview,
    .import-result {
      max-width: 40rem;
    }
    .import-similar {
      list-style: none;
      margin: 0 0 1rem;
      padding: 0;
    }
    .import-similar > li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.25rem 1rem;
      padding: 0.5rem 0;
    }
    .import-similar > li + li {
      border-top: 1px solid var(--gc-border);
    }
    .import-names {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .import-kind,
    .import-options {
      margin-bottom: 1rem;
    }
  `
})
export class ImportSection {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE) + '/import';

  protected readonly busy = signal(false);
  protected readonly problem = signal('');
  protected readonly problems = signal<ImportProblem[]>([]);
  protected readonly preview = signal<ImportPreview | null>(null);
  protected readonly choices = signal<Record<string, Choice>>({});
  protected readonly result = signal<ImportResult | null>(null);
  protected readonly undone = signal('');
  protected takePreferences = false;
  protected takePrices = false;
  protected takeShelf = false;
  /** The file as read, kept for the import itself. */
  private file: unknown = null;

  protected readonly choiceList: Array<{ value: Choice; label: string }> = [
    { value: 'both', label: marker('account.import.choiceBoth') },
    { value: 'skip', label: marker('account.import.choiceSkip') },
    { value: 'replace', label: marker('account.import.choiceReplace') }
  ];
  protected readonly keyOf = keyOf;

  protected readonly similarKinds = computed(() =>
    IMPORT_KINDS.filter((kind) => this.preview()?.similar.some((row) => row.kind === kind))
  );
  /** How many records the import adds, with the choices made so far. */
  protected readonly adding = computed(() => {
    const p = this.preview();
    if (!p) return 0;
    const chosen = this.choices();
    const both = p.similar.filter((row) => (chosen[keyOf(row)] ?? 'both') === 'both').length;
    return IMPORT_KINDS.reduce((sum, kind) => sum + (p.counts[kind]?.new ?? 0), 0) + both;
  });
  protected readonly replacing = computed(
    () => Object.values(this.choices()).filter((choice) => choice === 'replace').length
  );

  protected kindName(kind: ImportKind): string {
    return KIND_NAMES[kind];
  }
  protected warning(code: WarningCode): string {
    return WARNINGS[code];
  }
  protected reason(reason: ImportProblem['reason']): string {
    return REASONS[reason];
  }
  protected kindsIn(p: ImportPreview): ImportKind[] {
    return IMPORT_KINDS.filter((kind) => (p.counts[kind]?.inFile ?? 0) > 0);
  }
  protected resultKinds(r: ImportResult): ImportKind[] {
    return IMPORT_KINDS.filter((kind) => {
      const c = r.counts[kind];
      return c && c.added + c.replaced + c.skipped > 0;
    });
  }
  protected warningsIn(warnings: Partial<Record<WarningCode, number>>): WarningCode[] {
    return (Object.keys(WARNINGS) as WarningCode[]).filter((code) => (warnings[code] ?? 0) > 0);
  }
  protected similarOf(kind: ImportKind): SimilarRecord[] {
    return this.preview()?.similar.filter((row) => row.kind === kind) ?? [];
  }

  protected choose(row: SimilarRecord, choice: Choice): void {
    this.choices.update((all) => ({ ...all, [keyOf(row)]: choice }));
  }

  /** The shortcut: one choice for every record of a kind with a name already here. */
  protected chooseAll(kind: ImportKind, choice: Choice): void {
    this.choices.update((all) => {
      const next = { ...all };
      for (const row of this.similarOf(kind)) next[keyOf(row)] = choice;
      return next;
    });
  }

  protected reset(): void {
    this.file = null;
    this.preview.set(null);
    this.result.set(null);
    this.choices.set({});
    this.problem.set('');
    this.problems.set([]);
    this.undone.set('');
  }

  /** A file was chosen: read it here, then ask the server what importing it would do. */
  protected async chosen(input: HTMLInputElement): Promise<void> {
    const chosen = input.files?.[0];
    if (!chosen || this.busy()) return;
    this.reset();
    if (chosen.size > IMPORT_MOST_BYTES) {
      this.problem.set(translate('account.import.tooBig'));
      input.value = '';
      return;
    }
    this.busy.set(true);
    try {
      let file: unknown;
      try {
        file = JSON.parse(await chosen.text());
      } catch {
        this.problem.set(translate('account.import.notJson'));
        input.value = '';
        return;
      }
      const preview = await firstValueFrom(this.http.post<ImportPreview>(this.base + '/preview', { file }));
      this.file = file;
      this.takePreferences = false;
      this.takeShelf = false;
      // Prices are taken by default only into an account that has none of its own.
      this.takePrices = preview.prices > 0 && !preview.accountHasPrices;
      this.preview.set(preview);
    } catch (err) {
      input.value = '';
      this.showError(err, translate('account.import.previewFailed'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async importNow(): Promise<void> {
    const p = this.preview();
    if (!p || this.busy()) return;
    const chosen = this.choices();
    if (p.similar.some((row) => !chosen[keyOf(row)])) {
      this.problem.set(translate('account.import.chooseEach'));
      return;
    }
    this.problem.set('');
    this.busy.set(true);
    try {
      const result = await firstValueFrom(
        this.http.post<ImportResult>(this.base, {
          file: this.file,
          choices: chosen,
          include: { preferences: this.takePreferences, prices: this.takePrices, shelf: this.takeShelf }
        })
      );
      this.file = null;
      this.preview.set(null);
      this.result.set(result);
    } catch (err) {
      this.showError(err, translate('account.import.importFailed'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async undo(): Promise<void> {
    const r = this.result();
    if (!r || this.busy()) return;
    this.problem.set('');
    this.busy.set(true);
    try {
      await firstValueFrom(this.http.post(this.base + '/undo/' + r.importId, {}));
      this.undone.set(translate('account.import.undone'));
    } catch (err) {
      this.problem.set(errorMessage(err, translate('account.import.undoFailed')));
    } finally {
      this.busy.set(false);
    }
  }

  /** The server's message, with the list of records it could not read when it sends one. */
  /** fallback: the message, already translated (written as translate('…') at the call, so the key check sees it). */
  private showError(err: unknown, fallback: string): void {
    this.problem.set(errorMessage(err, fallback));
    const body = (err as { error?: { problems?: ImportProblem[] } })?.error;
    this.problems.set(Array.isArray(body?.problems) ? body.problems : []);
  }
}
