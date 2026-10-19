import { Component, Injector, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import type { IdentityProof, MfaSummary } from '../../../../lib/mfa';
import {
  AuthService,
  PROVIDER_NAMES,
  SIGN_IN_PROVIDERS,
  type ProviderId,
  type ProviderMethods
} from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { IdentityConfirm } from '../auth/identity-confirm';
import { ProviderLogo } from '../auth/provider-buttons';
import { DatePipe } from '../../shared/format-pipes';
import { Notices, NoticesList } from '../../shared/notices';

/** A link or an unlink waiting for the password (and a second step when it is on). */
interface Change {
  kind: 'link' | 'unlink';
  provider: ProviderId;
}

/**
 * "Sign in with Google, GitHub or Microsoft" on the account page
 * (docs/adr/0015-provider-sign-in.md): which providers are linked, and
 * linking or unlinking one, each confirmed with the password and, once
 * two-step sign-in is on, a second step. Linking goes to the provider, which
 * sends the browser back here with ?provider=<id>; the section then finishes
 * it. An account made with a provider has no password: it confirms with a
 * fresh sign-in with one of its providers instead (IdentityConfirm), which
 * also comes back here to be finished, and is offered the reset email to set
 * a password. Linking or unlinking signs out the account's other devices. Shown only
 * when a provider is on here.
 */
@Component({
  selector: 'gc-providers-section',
  imports: [DatePipe, IdentityConfirm, NoticesList, ProviderLogo, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    @if (shown(); as methods) {
      <section class="auth-text providers-section" aria-labelledby="providers-heading">
        <h2 id="providers-heading" tabindex="-1">{{ t('account.providers.heading') }}</h2>
        <p>{{ t('account.providers.intro') }}</p>
        <gc-notices [notices]="notices" />
        @if (methods.passwordless) {
          <div class="passwordless">
            <p>{{ t('account.providers.passwordless') }}</p>
            <button
              type="button"
              class="btn btn-light border"
              (click)="setPassword()"
              [attr.aria-disabled]="busy() || null"
            >
              {{ t('account.providers.setPassword') }}
            </button>
            <p class="form-text">{{ t('account.providers.setPasswordUnlinks') }}</p>
          </div>
        }
        @if (auth.unverified()) {
          <p class="form-text">{{ t('account.providers.confirmFirst') }}</p>
        }
        <ul class="provider-list">
          @for (row of rows(); track row.provider) {
            <li>
              <span class="provider-name">
                <gc-provider-logo [provider]="row.provider" />
                <span>{{ names[row.provider] }}</span>
              </span>
              <span class="provider-state">
                @if (row.linkedAt) {
                  {{ t('account.providers.linkedOn', { date: (row.linkedAt | gcDate) }) }}
                } @else {
                  {{ t('account.providers.notLinked') }}
                }
              </span>
              @if (!auth.unverified() && change()?.provider !== row.provider) {
                @if (row.linkedAt) {
                  <!-- Never the last way into an account with no password. -->
                  @if (!methods.passwordless || methods.linked.length > 1) {
                    <button
                      type="button"
                      class="btn btn-outline-secondary btn-sm"
                      [attr.data-unlink]="row.provider"
                      (click)="open({ kind: 'unlink', provider: row.provider })"
                    >
                      {{ t('account.providers.unlink', { provider: names[row.provider] }) }}
                    </button>
                  }
                } @else if (row.enabled) {
                  <button
                    type="button"
                    class="btn btn-light border btn-sm"
                    [attr.data-link]="row.provider"
                    (click)="open({ kind: 'link', provider: row.provider })"
                  >
                    {{ t('account.providers.link', { provider: names[row.provider] }) }}
                  </button>
                }
              }
            </li>
          }
        </ul>
        @if (change(); as pending) {
          <div class="account-form confirm-step">
            <p>{{ t('account.account.confirmStep') }}</p>
            <gc-identity-confirm
              [idPrefix]="'provider-confirm'"
              [mfaOn]="mfa()?.on ?? false"
              [hasTotp]="!!mfa()?.totp"
              [hasPasskeys]="!!mfa()?.passkeys?.length"
              [action]="
                pending.kind === 'link'
                  ? t('account.providers.link', { provider: names[pending.provider] })
                  : t('account.providers.unlink', { provider: names[pending.provider] })
              "
              [run]="runConfirmed"
              (cancelled)="change.set(null)"
            />
          </div>
        }
      </section>
    }
  </ng-container>`,
  styles: `
    .provider-list {
      list-style: none;
      padding: 0;
      margin: 0 0 1rem;
      max-width: 32rem;
    }
    .provider-list li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 1rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--gc-border, rgba(0, 0, 0, 0.1));
    }
    .provider-name {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      min-width: 6rem;
    }
    .provider-state {
      flex: 1;
      color: var(--gc-muted);
    }
    .account-form {
      max-width: 26rem;
    }
  `
})
export class ProvidersSection {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly signInProviders = inject(SIGN_IN_PROVIDERS);
  /** The two-step sign-in section's summary: whether a confirmation asks for a second step. */
  readonly mfa = input<MfaSummary | null>(null);
  protected readonly names = PROVIDER_NAMES;
  protected readonly notices = new Notices();
  protected readonly methods = signal<ProviderMethods | null>(null);
  protected readonly change = signal<Change | null>(null);
  protected readonly busy = signal(false);
  /** The section, once loaded, when there is anything to show. */
  protected readonly shown = computed(() => {
    const methods = this.methods();
    return methods && (methods.enabled.length || methods.linked.length) ? methods : null;
  });
  protected readonly rows = computed(() => {
    const methods = this.methods();
    if (!methods) return [];
    const order: ProviderId[] = ['google', 'github', 'microsoft'];
    return order
      .filter((provider) => methods.enabled.includes(provider) || methods.linked.some((l) => l.provider === provider))
      .map((provider) => ({
        provider,
        enabled: methods.enabled.includes(provider),
        linkedAt: methods.linked.find((l) => l.provider === provider)?.linkedAt ?? null
      }));
  });

  constructor() {
    afterNextRender(() => void this.start());
  }

  private async start(): Promise<void> {
    const notice = this.auth.providerNotice();
    if (notice) {
      this.auth.providerNotice.set(null);
      this.notices.success(notice);
    }
    if (this.route.snapshot?.queryParamMap.get('provider')) {
      // Back from the provider after "Link": finish it. The address loses ?provider.
      void this.router.navigate([], { queryParams: {}, replaceUrl: true });
      try {
        const result = await this.auth.finishProvider();
        if (result.kind === 'linked' || result.kind === 'reauthed') this.notices.success(result.message);
      } catch (err) {
        this.notices.error(errorMessage(err, translate('account.providers.linkFailed')));
      }
      afterNextRender(() => document.getElementById('providers-heading')?.scrollIntoView(), {
        injector: this.injector
      });
    }
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      // Nothing to show where no provider is on.
      if (!(await this.signInProviders()).length) return this.methods.set(null);
      this.methods.set(await this.auth.providerMethods());
    } catch {
      this.methods.set(null);
    }
  }

  protected open(change: Change): void {
    this.change.set(change);
  }

  /** Makes the change once IdentityConfirm has the proof; what goes wrong is thrown back for it to show. */
  protected readonly runConfirmed = async (proof: IdentityProof): Promise<void> => {
    const change = this.change();
    if (!change) return;
    if (change.kind === 'link') {
      const location = await this.auth.linkProvider(change.provider, proof, window.location.pathname);
      // On to the provider, which sends the browser back here.
      window.location.assign(location);
      return;
    }
    const message = await this.auth.unlinkProvider(change.provider, proof);
    this.change.set(null);
    this.notices.success(message);
    await this.load();
  };

  /** Emails the account a link to set a password (the reset email). */
  protected async setPassword(): Promise<void> {
    const email = this.auth.email();
    if (this.busy() || !email) return;
    this.busy.set(true);
    try {
      this.notices.success(await this.auth.requestReset(email));
    } catch (err) {
      this.notices.error(errorMessage(err, translate('account.providers.setPasswordFailed')));
    } finally {
      this.busy.set(false);
    }
  }
}
