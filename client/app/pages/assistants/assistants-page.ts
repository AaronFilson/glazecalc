import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { RichText } from '../../i18n/rich-text';
import { PageHeader } from '../../shared/page-header';

/** Where the setup shows the token: the person puts their own in its place. */
const TOKEN = 'YOUR_TOKEN';

/**
 * "Use Glazecalc from your AI assistant" (docs/integrations-plan.md, items 25
 * and 32): what the MCP tools do, the address, and how to add it to Claude
 * Code, VS Code, Cursor and Gemini CLI, with and without an access token. The
 * setups are code, the same in every language, so they are not messages.
 * In English for now, and not yet a public page in the sitemap: it becomes
 * one with its translations.
 */
@Component({
  selector: 'gc-assistants-page',
  imports: [NgTemplateOutlet, PageHeader, RichText, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('site.assistants.title')" [lead]="t('site.assistants.lead')" />

    <section class="panel">
      <h2>{{ t('site.assistants.whatHeading') }}</h2>
      <p>{{ t('site.assistants.what') }}</p>
      <p><gc-rich [text]="t('site.assistants.mine')" [links]="{ account: '/account' }" /></p>
      <p>{{ t('site.assistants.caution') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.assistants.addressHeading') }}</h2>
      <p>{{ t('site.assistants.address') }}</p>
      <ng-container
        [ngTemplateOutlet]="setup"
        [ngTemplateOutletContext]="{ id: 'address', code: url, name: t('site.assistants.copyAddress') }"
      />
      <p><gc-rich [text]="t('site.assistants.token')" [links]="{ account: '/account' }" /></p>
    </section>

    <section class="panel">
      <h2>{{ t('site.assistants.clientsHeading') }}</h2>

      <h3 class="h5">Claude Code</h3>
      <p>{{ t('site.assistants.claudeCode') }}</p>
      <ng-container
        [ngTemplateOutlet]="setup"
        [ngTemplateOutletContext]="{
          id: 'claude-code',
          code: claudeCode,
          name: t('site.assistants.copyFor', { client: 'Claude Code' })
        }"
      />
      <p>{{ t('site.assistants.claudeCodeToken') }}</p>
      <ng-container
        [ngTemplateOutlet]="setup"
        [ngTemplateOutletContext]="{
          id: 'claude-code-token',
          code: claudeCodeToken,
          name: t('site.assistants.copyForToken', { client: 'Claude Code' })
        }"
      />

      <h3 class="h5">VS Code</h3>
      <p>{{ t('site.assistants.vscode') }}</p>
      <ng-container
        [ngTemplateOutlet]="setup"
        [ngTemplateOutletContext]="{
          id: 'vscode',
          code: vscode,
          name: t('site.assistants.copyFor', { client: 'VS Code' })
        }"
      />

      <h3 class="h5">Cursor</h3>
      <p>{{ t('site.assistants.cursor') }}</p>
      <ng-container
        [ngTemplateOutlet]="setup"
        [ngTemplateOutletContext]="{
          id: 'cursor',
          code: cursor,
          name: t('site.assistants.copyFor', { client: 'Cursor' })
        }"
      />

      <h3 class="h5">Gemini CLI</h3>
      <p>{{ t('site.assistants.gemini') }}</p>
      <ng-container
        [ngTemplateOutlet]="setup"
        [ngTemplateOutletContext]="{
          id: 'gemini',
          code: gemini,
          name: t('site.assistants.copyFor', { client: 'Gemini CLI' })
        }"
      />

      <h3 class="h5">{{ t('site.assistants.appsHeading') }}</h3>
      <p>{{ t('site.assistants.apps') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.assistants.stopHeading') }}</h2>
      <p><gc-rich [text]="t('site.assistants.stop')" [links]="{ account: '/account' }" /></p>
      <p>{{ t('site.assistants.limits') }}</p>
    </section>

    <!-- A setup to copy: on one line each, as written, scrolling sideways in its box rather than
         breaking inside a string, with a Copy button that copies it exactly. -->
    <ng-template #setup let-id="id" let-code="code" let-name="name">
      <div class="setup-block">
        <pre class="setup" tabindex="0" [id]="'setup-' + id"><code>{{ code }}</code></pre>
        <div class="setup-copy">
          <button type="button" class="btn btn-light border btn-sm" [attr.aria-label]="name" (click)="copy(id, code)">
            {{ t('site.assistants.copy') }}
          </button>
          <span class="small" role="status">{{ said()?.id === id ? said()?.text : '' }}</span>
        </div>
      </div>
    </ng-template>
  </ng-container>`,
  styles: `
    .setup {
      background: var(--bs-tertiary-bg);
      border: 1px solid var(--bs-border-color);
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      margin-bottom: 0.4rem;
      white-space: pre;
      overflow-x: auto;
    }
    .setup-block {
      margin-bottom: 1rem;
    }
    .setup-copy {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.75rem;
    }
  `
})
export class AssistantsPage {
  /** What the last Copy did, beside its button. */
  protected readonly said = signal<{ id: string; text: string } | null>(null);

  protected async copy(id: string, code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.said.set({ id, text: translate('site.assistants.copied') });
    } catch {
      // No clipboard (an older browser, or not allowed): the text is selected, to copy by hand.
      const box = this.document.getElementById('setup-' + id);
      const selection = box ? this.document.getSelection() : null;
      if (box && selection) selection.selectAllChildren(box);
      this.said.set({ id, text: translate('site.assistants.copyByHand') });
    }
  }

  /** The endpoint on this site, as the person's assistant reaches it. */
  private readonly document = inject(DOCUMENT);
  protected readonly url = (this.document.location?.origin ?? 'https://glazecalcapp.com') + '/mcp';
  protected readonly claudeCode = `claude mcp add --transport http glazecalc ${this.url}`;
  protected readonly claudeCodeToken = `claude mcp add --transport http glazecalc ${this.url} \\\n  --header "Authorization: Bearer ${TOKEN}"`;
  protected readonly vscode = JSON.stringify(
    {
      servers: {
        glazecalc: { type: 'http', url: this.url, headers: { Authorization: 'Bearer ${input:glazecalc-token}' } }
      },
      inputs: [{ type: 'promptString', id: 'glazecalc-token', description: 'Glazecalc access token', password: true }]
    },
    null,
    2
  );
  protected readonly cursor = JSON.stringify(
    { mcpServers: { glazecalc: { url: this.url, headers: { Authorization: `Bearer ${TOKEN}` } } } },
    null,
    2
  );
  protected readonly gemini = JSON.stringify(
    { mcpServers: { glazecalc: { httpUrl: this.url, headers: { Authorization: `Bearer ${TOKEN}` } } } },
    null,
    2
  );
}
