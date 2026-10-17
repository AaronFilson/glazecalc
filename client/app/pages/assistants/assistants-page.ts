import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
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
  imports: [PageHeader, RichText, TranslocoDirective],
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
      <pre class="setup"><code>{{ url }}</code></pre>
      <p><gc-rich [text]="t('site.assistants.token')" [links]="{ account: '/account' }" /></p>
    </section>

    <section class="panel">
      <h2>{{ t('site.assistants.clientsHeading') }}</h2>

      <h3 class="h5">Claude Code</h3>
      <p>{{ t('site.assistants.claudeCode') }}</p>
      <pre class="setup"><code>{{ claudeCode }}</code></pre>
      <p>{{ t('site.assistants.claudeCodeToken') }}</p>
      <pre class="setup"><code>{{ claudeCodeToken }}</code></pre>

      <h3 class="h5">VS Code</h3>
      <p>{{ t('site.assistants.vscode') }}</p>
      <pre class="setup"><code>{{ vscode }}</code></pre>

      <h3 class="h5">Cursor</h3>
      <p>{{ t('site.assistants.cursor') }}</p>
      <pre class="setup"><code>{{ cursor }}</code></pre>

      <h3 class="h5">Gemini CLI</h3>
      <p>{{ t('site.assistants.gemini') }}</p>
      <pre class="setup"><code>{{ gemini }}</code></pre>

      <h3 class="h5">{{ t('site.assistants.appsHeading') }}</h3>
      <p>{{ t('site.assistants.apps') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.assistants.stopHeading') }}</h2>
      <p><gc-rich [text]="t('site.assistants.stop')" [links]="{ account: '/account' }" /></p>
      <p>{{ t('site.assistants.limits') }}</p>
    </section>
  </ng-container>`,
  styles: `
    .setup {
      background: var(--bs-tertiary-bg);
      border: 1px solid var(--bs-border-color);
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  `
})
export class AssistantsPage {
  /** The endpoint on this site, as the person's assistant reaches it. */
  protected readonly url = (inject(DOCUMENT).location?.origin ?? 'https://glazecalcapp.com') + '/mcp';
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
