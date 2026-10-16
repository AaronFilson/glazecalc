import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import {
  PASSKEY_LIMIT,
  PASSKEY_NAME_MAX,
  RECOVERY_CODE_COUNT,
  RECOVERY_CODES_LOW,
  TOTP_DIGITS
} from '../../../../lib/mfa';
import type { IdentityProof, MfaSummary, PasskeySummary, TotpStartResponse } from '../../../../lib/mfa';
import { AuthService, MfaChange } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { IdentityConfirm, passkeyNameCheck } from '../auth/identity-confirm';
import { PASSKEYS, passkeyMessage } from '../auth/passkeys';
import { serverCode, totpCheck, totpDigits } from '../auth/second-step';
import { DatePipe } from '../../shared/format-pipes';
import { FieldCheck, FieldChecks } from '../../shared/field-checks';
import { Notices, NoticesList } from '../../shared/notices';

/** A change that asks the person to confirm it is them first (decision 6). */
type Change =
  | { kind: 'add-totp' }
  // at: 'off' when opened from "Turning it off", where its confirmation then shows.
  | { kind: 'remove-totp'; at?: 'off' }
  | { kind: 'add-passkey' }
  | { kind: 'remove-passkey'; passkey: PasskeySummary }
  | { kind: 'new-codes' };

/**
 * Server answers that mean the section was out of date: two-step sign-in was
 * turned off, or a factor added or removed, on another device.
 */
const OUT_OF_DATE = ['mfa-not-on', 'totp-none', 'totp-exists', 'passkey-not-found'];

/**
 * How long the identity, once confirmed, lasts for making the passkey
 * (server/lib/change_grant.ts GRANT_MINUTES).
 */
const PASSKEY_GRANT_MINUTES = 5;

/** A passkey being added: the identity is confirmed, and the browser's step is next. */
interface PasskeyReady {
  /** From POST /api/mfa/passkeys/grant; kept in memory only. */
  grant: string;
  name: string;
}

/** An authenticator app's key in groups of four, as people read and type it. */
export const groupedKey = (secret: string): string => secret.match(/.{1,4}/g)?.join(' ') ?? secret;

/**
 * "Two-step sign-in" on the account page (docs/mfa-plan.md, item 13): whether
 * it is on, the authenticator app, the passkeys and the recovery codes. Every
 * change asks for the password and, once it is on, a current second step
 * (IdentityConfirm). Recovery codes are shown once, when they are made. A
 * trial has no section (the account page leaves it out); an account whose
 * email is not confirmed is asked to confirm it first (decision 5).
 */
@Component({
  selector: 'gc-sign-in-section',
  imports: [DatePipe, FieldCheck, FormsModule, IdentityConfirm, NgTemplateOutlet, NoticesList, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <section class="auth-text sign-in-section" aria-labelledby="mfa-heading">
      <div class="mfa-top">
        <h2 id="mfa-heading" tabindex="-1" #heading>{{ t('account.mfa.heading') }}</h2>
        <!-- Its state at a glance, beside the heading; the sentence under it says the same. -->
        @if (summary(); as mfa) {
          <span class="mfa-badge" [class.on]="mfa.on">{{
            mfa.on ? t('account.mfa.badgeOn') : t('account.mfa.badgeOff')
          }}</span>
        }
      </div>
      <p>{{ t('account.mfa.intro') }}</p>
      <gc-notices [notices]="notices" />

      @if (loadFailed()) {
        <p class="help-text">{{ t('account.mfa.loadFailed') }}</p>
      } @else if (summary(); as mfa) {
        @if (codes(); as list) {
          <div class="recovery-codes-panel">
            <h3 id="codes-heading" tabindex="-1" #panelHeading>{{ t('account.mfa.codesHeading') }}</h3>
            <p>{{ t('account.mfa.codesText') }}</p>
            <!-- What "Print the codes" prints, and nothing else on the page (styles.scss, gc-printing-codes). -->
            <div class="recovery-codes-print">
              <p class="print-only">{{ t('account.mfa.fileTitle', { email: email() }) }}</p>
              <ol class="recovery-codes" aria-labelledby="codes-heading">
                @for (code of list; track code) {
                  <li>{{ code }}</li>
                }
              </ol>
              <p class="print-only">{{ t('account.mfa.printNote') }}</p>
            </div>
            <div class="panel-buttons">
              <button type="button" class="btn btn-light border" (click)="printCodes()">
                {{ t('account.mfa.print') }}
              </button>
              <button type="button" class="btn btn-light border" (click)="downloadCodes(list)">
                {{ t('account.mfa.download') }}
              </button>
              <button type="button" class="btn btn-light border" (click)="copy(list.join('\\n'))">
                {{ t('account.mfa.copy') }}
              </button>
              <button type="button" class="btn btn-primary" (click)="codesSaved()">
                {{ t('account.mfa.saved') }}
              </button>
            </div>
            <p class="form-text clipboard-note">{{ t('account.mfa.clipboardNote') }}</p>
            <p role="status" class="form-text copied">{{ copied() }}</p>
          </div>
        } @else if (totpSetup(); as setup) {
          <div class="totp-setup">
            <h3 tabindex="-1" #panelHeading>{{ t('account.mfa.setupHeading') }}</h3>
            <ol class="setup-steps">
              @if (appLink(); as link) {
                <!-- A phone: the app is mostly added on the phone in hand, so its button comes first
                     and large; the QR code, for another device, opens on a tap. -->
                <li>
                  {{ t('account.mfa.setupTap') }}
                  <a class="btn btn-primary open-app" [href]="link">{{ t('account.mfa.openInApp') }}</a>
                  <details class="other-device">
                    <summary>{{ t('account.mfa.showQr') }}</summary>
                    {{ t('account.mfa.setupScanOther') }}
                    <img class="totp-qr" [src]="setup.qr" [alt]="t('account.mfa.qrAlt')" width="200" height="200" />
                  </details>
                  <ng-container [ngTemplateOutlet]="totpKey" [ngTemplateOutletContext]="{ $implicit: setup.secret }" />
                </li>
              } @else {
                <li>{{ t('account.mfa.setupOpen') }}</li>
                <li>
                  {{ t('account.mfa.setupScan') }}
                  <img class="totp-qr" [src]="setup.qr" [alt]="t('account.mfa.qrAlt')" width="200" height="200" />
                  <ng-container [ngTemplateOutlet]="totpKey" [ngTemplateOutletContext]="{ $implicit: setup.secret }" />
                </li>
              }
              <li>
                <form (ngSubmit)="confirmTotp()">
                  <label for="totp-code" class="form-label">{{ t('account.mfa.setupCode', { digits: digits }) }}</label>
                  <input
                    id="totp-code"
                    type="text"
                    name="totpCode"
                    class="form-control code-input"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    spellcheck="false"
                    [(ngModel)]="totpCode"
                    [gcField]="totpChecks"
                    gcFieldName="totpCode"
                  />
                  <div class="panel-buttons">
                    <button type="submit" class="btn btn-primary" [attr.aria-disabled]="busy() || null">
                      {{ t('account.mfa.setupFinish') }}
                    </button>
                    <button type="button" class="btn btn-light border" (click)="closeSetup()">
                      {{ t('account.mfa.cancel') }}
                    </button>
                  </div>
                </form>
              </li>
            </ol>
          </div>
        } @else {
          <p class="mfa-status">
            {{ mfa.on ? t('account.mfa.on') : t('account.mfa.off') }}
            {{ mfa.on ? t('account.mfa.onText') : t('account.mfa.offText') }}
          </p>
          @if (needsEmail()) {
            <p class="needs-email">{{ t('account.mfa.confirmEmailFirst') }}</p>
          }

          <h3>{{ t('account.mfa.appHeading') }}</h3>
          @if (mfa.totp; as totp) {
            <p class="totp-state">
              {{ t('account.mfa.added', { date: (totp.addedAt | gcDate) }) }}
              {{ totp.lastUsedAt ? t('account.mfa.lastUsed', { date: (totp.lastUsedAt | gcDate) }) : '' }}
            </p>
            @if (removingApp() === 'app') {
              <ng-container [ngTemplateOutlet]="confirm" />
            } @else if (removingApp() !== 'off') {
              <button
                id="mfa-remove-app"
                type="button"
                class="btn btn-outline-danger"
                (click)="open({ kind: 'remove-totp' }, 'mfa-remove-app')"
              >
                {{ t('account.mfa.removeApp') }}
              </button>
            }
          } @else {
            <p>{{ t('account.mfa.appText') }}</p>
            @if (change()?.kind === 'add-totp') {
              <ng-container [ngTemplateOutlet]="confirm" />
            } @else if (!needsEmail()) {
              <button
                id="mfa-add-app"
                type="button"
                class="btn btn-primary"
                (click)="open({ kind: 'add-totp' }, 'mfa-add-app')"
              >
                {{ t('account.mfa.addApp') }}
              </button>
            }
          }

          <h3>{{ t('account.mfa.passkeysHeading') }}</h3>
          <p>{{ t('account.mfa.passkeysText') }}</p>
          @if (!passkeysSupported) {
            <p class="no-passkeys">{{ t('account.mfa.noPasskeysHere') }}</p>
          }
          @if (mfa.passkeys.length) {
            <ul class="passkey-list">
              @for (passkey of mfa.passkeys; track passkey.id) {
                <li>
                  @if (renaming()?.id === passkey.id) {
                    <form (ngSubmit)="rename(passkey)" class="rename-form">
                      <label for="rename-passkey" class="form-label">{{
                        t('account.mfa.renameLabel', { name: passkey.name })
                      }}</label>
                      <input
                        #renameField
                        id="rename-passkey"
                        type="text"
                        name="newName"
                        class="form-control"
                        autocomplete="off"
                        [attr.maxlength]="nameMax"
                        [(ngModel)]="newName"
                        [gcField]="renameChecks"
                        gcFieldName="newName"
                      />
                      <div class="panel-buttons">
                        <button type="submit" class="btn btn-primary" [attr.aria-disabled]="busy() || null">
                          {{ t('account.mfa.saveName') }}
                        </button>
                        <button type="button" class="btn btn-light border" (click)="closeRename()">
                          {{ t('account.mfa.cancel') }}
                        </button>
                      </div>
                    </form>
                  } @else {
                    <span class="passkey-name">{{ passkey.name }}</span>
                    <span class="form-text d-block">
                      {{ t('account.mfa.added', { date: (passkey.addedAt | gcDate) }) }}
                      {{
                        passkey.lastUsedAt
                          ? t('account.mfa.lastUsed', { date: (passkey.lastUsedAt | gcDate) })
                          : t('account.mfa.notUsed')
                      }}
                    </span>
                    <span class="passkey-buttons">
                      <button
                        type="button"
                        class="btn btn-light border btn-sm"
                        [id]="'mfa-rename-' + passkey.id"
                        (click)="startRename(passkey)"
                      >
                        {{ t('account.mfa.rename') }}<span class="visually-hidden"> {{ passkey.name }}</span>
                      </button>
                      <button
                        type="button"
                        class="btn btn-outline-danger btn-sm"
                        [id]="'mfa-remove-' + passkey.id"
                        (click)="open({ kind: 'remove-passkey', passkey }, 'mfa-remove-' + passkey.id)"
                      >
                        {{ t('account.mfa.remove') }}<span class="visually-hidden"> {{ passkey.name }}</span>
                      </button>
                    </span>
                    @if (removing() === passkey.id) {
                      <ng-container [ngTemplateOutlet]="confirm" />
                    }
                  }
                </li>
              }
            </ul>
          }
          @if (passkeyReady(); as ready) {
            <div class="change-panel passkey-ready">
              <p id="passkey-ready-text">
                {{ t('account.mfa.passkeyReadyText', { name: ready.name, minutes: grantMinutes }) }}
              </p>
              <div role="alert">
                @if (passkeyError(); as message) {
                  <p class="errors-section">{{ message }}</p>
                }
              </div>
              <div class="panel-buttons">
                <button
                  #createButton
                  id="mfa-create-passkey"
                  type="button"
                  class="btn btn-primary"
                  aria-describedby="passkey-ready-text"
                  [attr.aria-disabled]="busy() || null"
                  (click)="createPasskey(ready)"
                >
                  {{ t('account.mfa.passkeyCreate') }}
                </button>
                <button type="button" class="btn btn-light border" (click)="closePasskeyReady()">
                  {{ t('account.mfa.cancel') }}
                </button>
              </div>
            </div>
          } @else if (change()?.kind === 'add-passkey') {
            <ng-container [ngTemplateOutlet]="confirm" />
          } @else if (passkeysSupported && !needsEmail()) {
            @if (mfa.passkeys.length >= passkeyLimit) {
              <p class="passkey-limit">{{ t('account.mfa.passkeyLimit', { most: passkeyLimit }) }}</p>
            } @else {
              <button
                id="mfa-add-passkey"
                type="button"
                class="btn btn-primary"
                (click)="open({ kind: 'add-passkey' }, 'mfa-add-passkey')"
              >
                {{ t('account.mfa.addPasskey') }}
              </button>
            }
          }

          @if (mfa.on) {
            <h3>{{ t('account.mfa.codesTitle') }}</h3>
            <p>{{ t('account.mfa.codesLeft', { count: mfa.codesLeft, total: codeCount }) }}</p>
            @if (mfa.codesLeft <= codesLow) {
              <p class="codes-low">{{ t('account.mfa.codesLow') }}</p>
            }
            @if (change()?.kind === 'new-codes') {
              <ng-container [ngTemplateOutlet]="confirm" />
            } @else {
              <button
                id="mfa-new-codes"
                type="button"
                class="btn btn-light border"
                (click)="open({ kind: 'new-codes' }, 'mfa-new-codes')"
              >
                {{ t('account.mfa.newCodes') }}
              </button>
            }

            <h3>{{ t('account.mfa.offHeading') }}</h3>
            <p>{{ t('account.mfa.offWhat') }}</p>
            <ul class="off-effects">
              <li>{{ t('account.mfa.offPassword') }}</li>
              <li>{{ t('account.mfa.offCodes') }}</li>
              <li>{{ t('account.mfa.offSignOut') }}</li>
              <li>{{ t('account.mfa.offEmail') }}</li>
            </ul>
            @if (mfa.totp) {
              @if (removingApp() === 'off') {
                <ng-container [ngTemplateOutlet]="confirm" />
              } @else {
                <!-- Named apart from the app's own Remove button, above: here it is about turning it off. -->
                <button
                  id="mfa-off-remove-app"
                  type="button"
                  class="btn btn-outline-danger"
                  (click)="open({ kind: 'remove-totp', at: 'off' }, 'mfa-off-remove-app')"
                >
                  {{ mfa.passkeys.length ? t('account.mfa.offRemoveAppFirst') : t('account.mfa.offRemoveApp') }}
                </button>
              }
            }
            @if (mfa.passkeys.length) {
              <p class="off-passkeys">
                {{
                  t(mfa.totp ? 'account.mfa.offPasskeysToo' : 'account.mfa.offPasskeys', {
                    count: mfa.passkeys.length
                  })
                }}
              </p>
            }
          }
        }
      }
    </section>

    <ng-template #totpKey let-secret>
      <span class="d-block" id="totp-key-label">{{ t('account.mfa.key') }}</span>
      <code class="totp-key" aria-labelledby="totp-key-label">{{ grouped(secret) }}</code>
      <button type="button" class="btn btn-light border btn-sm copy-key" (click)="copy(secret)">
        {{ t('account.mfa.copyKey') }}
      </button>
      <span role="status" class="form-text copied">{{ copied() }}</span>
      <span class="form-text d-block clipboard-note">{{ t('account.mfa.clipboardNote') }}</span>
    </ng-template>

    <ng-template #confirm>
      @if (change(); as current) {
        <div class="change-panel">
          <p>{{ changeText() }}</p>
          @if (lastFactor()) {
            <p class="last-factor">{{ t('account.mfa.lastFactor') }}</p>
          }
          <gc-identity-confirm
            [mfaOn]="summary()?.on ?? false"
            [hasTotp]="!!summary()?.totp"
            [hasPasskeys]="!!summary()?.passkeys?.length"
            [action]="changeAction()"
            [askName]="current.kind === 'add-passkey'"
            [run]="runChange"
            (cancelled)="close(true)"
          />
        </div>
      }
    </ng-template>
  </ng-container>`,
  styles: `
    .recovery-codes {
      font-family: var(--bs-font-monospace, monospace);
      font-size: 1.1rem;
      columns: 2;
      max-width: 22rem;
    }
    .totp-key {
      display: inline-block;
      font-size: 1.1rem;
      letter-spacing: 0.05em;
      word-spacing: 0.3em;
      margin: 0.25rem 0.5rem 0.5rem 0;
      color: inherit;
    }
    /* Three times a small button's height: on a phone, the step's one big action. */
    .open-app {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 6rem;
      margin: 0.75rem 0;
      font-size: 1.25rem;
    }
    .other-device {
      margin-bottom: 0.75rem;
    }
    .other-device summary {
      color: var(--bs-link-color);
      text-decoration: underline;
      cursor: pointer;
    }
    .totp-qr {
      display: block;
      margin: 0.5rem 0;
      background: #fff;
      padding: 8px;
      border-radius: 4px;
    }
    /* As wide as the six digits it takes, not the page: the box's width says what goes in it. */
    .code-input {
      font-family: var(--bs-font-monospace, monospace);
      letter-spacing: 0.1em;
      width: 8rem;
    }
    .setup-steps > li + li {
      margin-top: 1rem;
    }
    /* A step's label on a line of its own, so the step's number stays beside its first line when it wraps
       (Bootstrap's labels are inline blocks, which put the number beside their last). */
    .setup-steps label {
      display: block;
    }
    .mfa-top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.75rem;
      margin-bottom: 0.5rem;
    }
    .mfa-top h2 {
      margin: 0;
    }
    .mfa-badge {
      border: 1px solid var(--gc-border);
      border-radius: 999px;
      background: var(--gc-surface-2);
      color: var(--gc-text);
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.1rem 0.65rem;
    }
    .mfa-badge.on {
      border-color: var(--gc-success-text);
      background: var(--gc-success-bg);
      color: var(--gc-success-text);
    }
    .panel-buttons,
    .passkey-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .sign-in-section > h3 {
      margin-top: 2rem;
    }
    .off-passkeys {
      margin-top: 1rem;
    }
    .passkey-list {
      list-style: none;
      padding: 0;
    }
    .passkey-list > li {
      padding: 0.75rem 0;
      border-top: 1px solid var(--bs-border-color, #ddd);
    }
    .passkey-name {
      font-weight: 600;
    }
    .change-panel {
      margin: 0.75rem 0;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      background: var(--gc-surface-2);
    }
    .codes-low,
    .last-factor,
    .needs-email {
      font-weight: 600;
    }
    .rename-form {
      max-width: 26rem;
    }
  `
})
export class SignInSection {
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);

  private readonly passkeys = inject(PASSKEYS);
  protected readonly passkeysSupported = this.passkeys.supported();
  protected readonly passkeyLimit = PASSKEY_LIMIT;
  protected readonly codeCount = RECOVERY_CODE_COUNT;
  protected readonly codesLow = RECOVERY_CODES_LOW;
  protected readonly nameMax = PASSKEY_NAME_MAX;
  protected readonly digits = TOTP_DIGITS;
  protected readonly grantMinutes = PASSKEY_GRANT_MINUTES;
  protected readonly notices = new Notices();

  protected readonly summary = signal<MfaSummary | null>(null);
  /**
   * The summary each time it loads: the account page asks for a second step on
   * its own changes (the email, the password, deleting) while it is on.
   */
  readonly loaded = output<MfaSummary>();
  protected readonly loadFailed = signal(false);
  protected readonly change = signal<Change | null>(null);
  protected readonly totpSetup = signal<TotpStartResponse | null>(null);
  /** Adding a passkey, after "confirm it is you": the button that makes it, and what went wrong last. */
  protected readonly passkeyReady = signal<PasskeyReady | null>(null);
  protected readonly passkeyError = signal('');
  /** New recovery codes, shown once until the person says they have saved them. */
  protected readonly codes = signal<string[] | null>(null);
  protected readonly copied = signal('');
  protected readonly email = computed(() => this.auth.email() ?? '');

  /**
   * A link that hands the new key straight to an authenticator app on this
   * device (the otpauth:// URI the QR code holds), so it never goes through
   * the clipboard: iOS adds it to its own codes, Android opens Google
   * Authenticator or another app that takes these links. Only where the
   * pointer is a finger: on a computer, where no app usually takes them, the
   * link would do nothing (Chrome) or open an error page (Firefox). The URI is
   * our own server's, and only an otpauth://totp/ one is let through Angular's
   * URL check, which would otherwise refuse the scheme.
   */
  protected readonly appLink = computed(() => {
    const uri = this.totpSetup()?.uri;
    if (!uri?.startsWith('otpauth://totp/') || !this.touch) return null;
    return this.sanitizer.bypassSecurityTrustUrl(uri);
  });
  private readonly sanitizer = inject(DomSanitizer);
  private readonly touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  protected readonly busy = signal(false);

  protected readonly totpCode = signal('');
  protected readonly totpChecks = new FieldChecks(() => ({ totpCode: totpCheck(this.totpCode) }));
  protected readonly renaming = signal<PasskeySummary | null>(null);
  protected readonly newName = signal('');
  protected readonly renameChecks = new FieldChecks(() => ({ newName: passkeyNameCheck(this.newName) }));

  /** Turning it on needs a confirmed email (decision 5). */
  protected readonly needsEmail = computed(() => {
    const mfa = this.summary();
    return !!mfa && !mfa.on && !mfa.emailConfirmed;
  });
  /** Where the authenticator app's removal is being confirmed: under its own heading, or under "Turning it off". */
  protected readonly removingApp = computed(() => {
    const change = this.change();
    return change?.kind === 'remove-totp' ? (change.at ?? 'app') : null;
  });
  protected readonly removing = computed(() => {
    const change = this.change();
    return change?.kind === 'remove-passkey' ? change.passkey.id : null;
  });
  /** Whether the change removes the last second step, which turns two-step sign-in off. */
  protected readonly lastFactor = computed(() => {
    const mfa = this.summary();
    const kind = this.change()?.kind;
    if (!mfa || (kind !== 'remove-totp' && kind !== 'remove-passkey')) return false;
    return (mfa.totp ? 1 : 0) + mfa.passkeys.length === 1;
  });
  protected readonly changeText = computed(() => {
    const change = this.change();
    switch (change?.kind) {
      case 'add-totp':
        return translate('account.mfa.addAppText');
      case 'remove-totp':
        return translate('account.mfa.removeAppText');
      case 'add-passkey':
        return translate('account.mfa.addPasskeyText');
      case 'remove-passkey':
        return translate('account.mfa.removePasskeyText', { name: change.passkey.name });
      case 'new-codes':
        return translate('account.mfa.newCodesText');
      default:
        return '';
    }
  });
  protected readonly changeAction = computed(() => {
    switch (this.change()?.kind) {
      case 'add-totp':
        return translate('account.mfa.continue');
      case 'remove-totp':
        return translate('account.mfa.removeApp');
      case 'add-passkey':
        return translate('account.mfa.continue');
      case 'remove-passkey':
        return translate('account.mfa.removePasskey');
      default:
        return translate('account.mfa.newCodes');
    }
  });

  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly panelHeading = viewChild<ElementRef<HTMLElement>>('panelHeading');
  private readonly renameField = viewChild<ElementRef<HTMLElement>>('renameField');
  private readonly createButton = viewChild<ElementRef<HTMLElement>>('createButton');
  /** The id of the button that opened a change, for the focus to go back to if it is cancelled. */
  private opener: string | null = null;

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const summary = await this.auth.mfaSummary();
      this.summary.set(summary);
      this.loadFailed.set(false);
      this.loaded.emit(summary);
    } catch {
      this.loadFailed.set(true);
    }
  }

  protected grouped(secret: string): string {
    return groupedKey(secret);
  }

  protected open(change: Change, opener: string): void {
    this.opener = opener;
    this.renaming.set(null);
    this.passkeyReady.set(null);
    this.change.set(change);
  }

  /** Closes the change; a cancelled one gives the focus back to the button that opened it. */
  protected close(cancelled = false): void {
    this.change.set(null);
    const opener = this.opener;
    this.opener = null;
    this.afterRender(() =>
      ((cancelled && opener && document.getElementById(opener)) || this.heading()?.nativeElement)?.focus()
    );
  }

  /**
   * Makes the change once IdentityConfirm has the proof; what it throws,
   * IdentityConfirm shows. When the section was out of date (two-step sign-in
   * turned off, or a factor changed, on another device), the server's message
   * is shown above the section instead, which loads again.
   */
  protected readonly runChange = async (proof: IdentityProof, name: string): Promise<void> => {
    try {
      await this.makeChange(proof, name);
    } catch (err) {
      const code = serverCode(err);
      if (!code || !OUT_OF_DATE.includes(code)) throw err;
      this.notices.error(errorMessage(err, translate('account.mfa.failed')));
      this.change.set(null);
      this.opener = null;
      this.afterRender(() => this.heading()?.nativeElement.focus());
      await this.load();
    }
  };

  private async makeChange(proof: IdentityProof, name: string): Promise<void> {
    const change = this.change();
    if (!change) return;
    switch (change.kind) {
      case 'add-totp': {
        const setup = await this.auth.startTotp(proof);
        this.change.set(null);
        this.totpCode.set('');
        this.totpSetup.set(setup);
        this.focusPanel();
        return;
      }
      case 'remove-totp':
        return this.changed(await this.auth.removeTotp(proof));
      case 'add-passkey': {
        // The browser's step comes with a click of its own: some browsers allow
        // one passkey prompt per click, and a passkey may just have confirmed it is you.
        const { grant } = await this.auth.passkeyGrant(proof);
        this.change.set(null);
        this.passkeyError.set('');
        this.passkeyReady.set({ grant, name });
        this.afterRender(() => this.createButton()?.nativeElement.focus());
        return;
      }
      case 'remove-passkey':
        return this.changed(await this.auth.removePasskey(change.passkey.id, proof));
      case 'new-codes':
        return this.changed(await this.auth.newRecoveryCodes(proof));
    }
  }

  /** A change made: says so, shows new recovery codes if there are some, and loads the section again. */
  private async changed(result: MfaChange): Promise<void> {
    this.notices.success(result.message, 'mfa');
    this.change.set(null);
    this.opener = null;
    if (result.recoveryCodes?.length) {
      this.codes.set(result.recoveryCodes);
      this.focusPanel();
    } else {
      this.afterRender(() => this.heading()?.nativeElement.focus());
    }
    await this.load();
  }

  /**
   * Makes the passkey with the grant: the browser's step, then saving it. A
   * cancelled or failed try can be tried again while the grant lasts, without
   * confirming again. When it has run out, or the section is out of date, it
   * says so above the section, which loads again.
   */
  protected async createPasskey(ready: PasskeyReady): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.passkeyError.set('');
    try {
      const options = await this.auth.passkeyCreationOptions(ready.grant);
      const response = await this.passkeys.register(options);
      const result = await this.auth.addPasskey(ready.grant, response, ready.name);
      this.passkeyReady.set(null);
      await this.changed(result);
    } catch (err) {
      const code = serverCode(err);
      if (code && (code === 'mfa-start-again' || code === 'passkey-limit' || OUT_OF_DATE.includes(code))) {
        this.notices.error(errorMessage(err, translate('account.mfa.failed')));
        this.passkeyReady.set(null);
        this.opener = null;
        this.afterRender(() => this.heading()?.nativeElement.focus());
        await this.load();
      } else {
        this.passkeyError.set(passkeyMessage(err, translate('account.mfa.failed')));
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected closePasskeyReady(): void {
    this.passkeyReady.set(null);
    this.passkeyError.set('');
    this.close(true);
  }

  protected async confirmTotp(): Promise<void> {
    const setup = this.totpSetup();
    if (this.busy() || !setup || !this.totpChecks.validate()) return;
    this.busy.set(true);
    try {
      const result = await this.auth.confirmTotp(setup.setupId, totpDigits(this.totpCode()));
      this.totpSetup.set(null);
      await this.changed(result);
    } catch (err) {
      const message = errorMessage(err, translate('account.mfa.failed'));
      if (serverCode(err) === 'mfa-start-again') {
        this.notices.error(message);
        this.closeSetup();
      } else {
        this.totpCode.set('');
        this.totpChecks.report('totpCode', message);
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected closeSetup(): void {
    this.totpSetup.set(null);
    this.copied.set('');
    this.afterRender(() => this.heading()?.nativeElement.focus());
  }

  protected codesSaved(): void {
    this.codes.set(null);
    this.copied.set('');
    this.afterRender(() => this.heading()?.nativeElement.focus());
  }

  protected startRename(passkey: PasskeySummary): void {
    this.opener = 'mfa-rename-' + passkey.id;
    this.change.set(null);
    this.newName.set(passkey.name);
    this.renameChecks.clear();
    this.renaming.set(passkey);
    this.afterRender(() => this.renameField()?.nativeElement.focus());
  }

  protected closeRename(): void {
    this.renaming.set(null);
    this.close(true);
  }

  protected async rename(passkey: PasskeySummary): Promise<void> {
    if (this.busy() || !this.renameChecks.validate()) return;
    this.busy.set(true);
    try {
      const result = await this.auth.renamePasskey(passkey.id, this.newName().trim());
      this.renaming.set(null);
      await this.changed(result);
    } catch (err) {
      this.renameChecks.report('newName', errorMessage(err, translate('account.mfa.failed')));
    } finally {
      this.busy.set(false);
    }
  }

  protected downloadCodes(codes: string[]): void {
    const email = this.auth.email() ?? '';
    const text = [translate('account.mfa.fileTitle', { email }), '', ...codes, '', translate('account.mfa.fileNote')];
    const url = URL.createObjectURL(new Blob([text.join('\r\n') + '\r\n'], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'glazecalc-recovery-codes.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Prints the recovery codes alone: a class on <body> that the print styles
   * (styles.scss) use to hide the rest of the page, taken off once printing is
   * done. Nothing goes to the clipboard or to a file.
   */
  protected printCodes(): void {
    const body = document.body;
    const done = () => {
      body.classList.remove('gc-printing-codes');
      window.removeEventListener('afterprint', done);
    };
    body.classList.add('gc-printing-codes');
    window.addEventListener('afterprint', done);
    window.print();
  }

  protected async copy(text: string): Promise<void> {
    this.copied.set('');
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(translate('account.mfa.copied'));
    } catch {
      this.copied.set(translate('account.mfa.copyFailed'));
    }
  }

  private focusPanel(): void {
    this.afterRender(() => this.panelHeading()?.nativeElement.focus());
  }

  private afterRender(then: () => void): void {
    afterNextRender(then, { injector: this.injector });
  }
}
