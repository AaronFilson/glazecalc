import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { baseLanguage } from '../../../lib/regions/languages';
import { PreferencesService } from '../core/preferences.service';
import { TAG_CLOSE, TAG_END, TAG_OPEN } from './icu-transpiler';
import { PAGE_LANGUAGE } from './language';

export type RichNode = { kind: 'text'; text: string } | { kind: 'tag'; name: string; children: RichNode[] };

/** What a tag in a message does: a page in the app ('/settings', '/guides/firing#cones'), a web page, or an action. */
export type RichLink = string | ((event: Event) => void);

/** A written message (i18n/icu-transpiler.ts) as text and tags. */
export function richNodes(text: string): RichNode[] {
  const root: RichNode[] = [];
  const open: Array<{ children: RichNode[] }> = [{ children: root }];
  const edge = new RegExp(`([${TAG_OPEN}${TAG_CLOSE}])([^${TAG_END}]*)${TAG_END}`, 'g');
  let last = 0;
  for (const match of text.matchAll(edge)) {
    const into = open[open.length - 1]!.children;
    if (match.index > last) into.push({ kind: 'text', text: text.slice(last, match.index) });
    last = match.index + match[0].length;
    if (match[1] === TAG_OPEN) {
      const tag: RichNode = { kind: 'tag', name: match[2]!, children: [] };
      into.push(tag);
      open.push(tag);
    } else if (open.length > 1) {
      open.pop();
    }
  }
  if (last < text.length) open[open.length - 1]!.children.push({ kind: 'text', text: text.slice(last) });
  return root;
}

const EMPHASIS: Record<string, 'b' | 'strong' | 'em' | 'code' | 'bdi'> = {
  b: 'b',
  strong: 'strong',
  em: 'em',
  i: 'em',
  code: 'code',
  bdi: 'bdi'
};

/**
 * A message with links or emphasis in it, from its tags: "Lead is off in
 * <settings>Settings</settings>" with links set to { settings: '/settings' }.
 * Whole sentences translate, links and all, and nothing in a message is
 * ever read as HTML. A translation may give the English for a key term,
 * "Fritte<en>frit</en>", shown in brackets to those who ask for English
 * terms in Settings.
 */
@Component({
  selector: 'gc-rich',
  imports: [NgTemplateOutlet, RouterLink],
  // Angular drops the whitespace between these tags (preserveWhitespaces is off), so the sentence
  // reads as the message writes it; i18n.spec.ts checks one.
  template: `<ng-template #list let-nodes>
      @for (node of nodes; track $index) {
        @if (node.kind === 'text') {
          <ng-container>{{ node.text }}</ng-container>
        } @else {
          @switch (kind(node.name)) {
            @case ('route') {
              <a [routerLink]="path(node.name)" [fragment]="fragment(node.name)"
                ><ng-container *ngTemplateOutlet="list; context: { $implicit: node.children }"
              /></a>
            }
            @case ('url') {
              <a [href]="links()[node.name]"
                ><ng-container *ngTemplateOutlet="list; context: { $implicit: node.children }"
              /></a>
            }
            @case ('action') {
              <button type="button" class="btn btn-link link-inline" (click)="act(node.name, $event)">
                <ng-container *ngTemplateOutlet="list; context: { $implicit: node.children }" />
              </button>
            }
            @case ('b') {
              <b><ng-container *ngTemplateOutlet="list; context: { $implicit: node.children }" /></b>
            }
            @case ('strong') {
              <strong><ng-container *ngTemplateOutlet="list; context: { $implicit: node.children }" /></strong>
            }
            @case ('em') {
              <em><ng-container *ngTemplateOutlet="list; context: { $implicit: node.children }" /></em>
            }
            @case ('code') {
              <code><ng-container *ngTemplateOutlet="list; context: { $implicit: node.children }" /></code>
            }
            @case ('english') {
              @if (englishTerms()) {
                <span class="english-term" lang="en"> ({{ plain(node.children) }})</span>
              }
            }
            @case ('bdi') {
              <bdi><ng-container *ngTemplateOutlet="list; context: { $implicit: node.children }" /></bdi>
            }
            @default {
              <ng-container *ngTemplateOutlet="list; context: { $implicit: node.children }" />
            }
          }
        }
      }</ng-template
    ><ng-container *ngTemplateOutlet="list; context: { $implicit: nodes() }" />`
})
export class RichText {
  /** The written message, from t() or translate(). */
  readonly text = input.required<string>();
  /** What each link tag does. */
  readonly links = input<Record<string, RichLink>>({});

  protected readonly nodes = computed(() => richNodes(this.text()));
  private readonly preferences = inject(PreferencesService);
  private readonly language = baseLanguage(inject(PAGE_LANGUAGE));
  /** Whether the English after key terms is shown: asked for, on a page not in English. */
  protected readonly englishTerms = computed(() => this.preferences.englishTerms() === 'on' && this.language !== 'en');

  protected kind(
    name: string
  ): 'route' | 'url' | 'action' | 'b' | 'strong' | 'em' | 'code' | 'bdi' | 'english' | 'text' {
    const link = this.links()[name];
    if (typeof link === 'function') return 'action';
    if (typeof link === 'string') return link.startsWith('/') ? 'route' : 'url';
    if (name === 'en') return 'english';
    return EMPHASIS[name] ?? 'text';
  }

  protected plain(nodes: RichNode[]): string {
    return nodes.map((node) => (node.kind === 'text' ? node.text : this.plain(node.children))).join('');
  }

  protected path(name: string): string {
    return String(this.links()[name]).split('#')[0]!;
  }

  protected fragment(name: string): string | undefined {
    return String(this.links()[name]).split('#')[1];
  }

  protected act(name: string, event: Event): void {
    const link = this.links()[name];
    if (typeof link === 'function') link(event);
  }
}
