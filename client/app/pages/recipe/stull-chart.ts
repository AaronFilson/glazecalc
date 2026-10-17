import { Component, computed, input } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { STULL, StullPoint, StullXY } from '../../../../lib/recipe/analysis';
import { UnityRange } from '../../../../lib/recipe/limits';
import { fixed, upTo } from '../../shared/format';

// Stull's chart of silica against alumina (lib/recipe/analysis.js STULL), drawn
// in SVG: its regions, the line of the brightest glazes, the recipe's point and
// the chosen limit set's silica and alumina ranges where it has them. Colors are
// the page's own, so it follows the theme and prints black on white; the same
// facts are written out under it for those who cannot see it.

const WIDTH = 320;
const HEIGHT = 230;
const LEFT = 38;
const RIGHT = 8;
const TOP = 8;
const BOTTOM = 34;
const PLOT_W = WIDTH - LEFT - RIGHT;
const PLOT_H = HEIGHT - TOP - BOTTOM;
const { silica: SI, alumina: AL } = STULL;

const xOf = (silica: number): number => LEFT + ((silica - SI.min) / (SI.max - SI.min)) * PLOT_W;
const yOf = (alumina: number): number => TOP + (1 - (alumina - AL.min) / (AL.max - AL.min)) * PLOT_H;
const points = (polygon: ReadonlyArray<StullXY>): string =>
  polygon.map(([x, y]) => `${xOf(x).toFixed(1)},${yOf(y).toFixed(1)}`).join(' ');
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Each region's name, for the keys manager (they are looked up by region). */
const REGION_NAMES: Record<string, string> = {
  unfused: marker('recipe.stull.regions.unfused'),
  matte: marker('recipe.stull.regions.matte'),
  'semi-matte': marker('recipe.stull.regions.semi-matte'),
  bright: marker('recipe.stull.regions.bright'),
  underfired: marker('recipe.stull.regions.underfired')
};

/** Where each region's name goes, in moles (Glazy's places), and how strongly it is shaded. */
const REGIONS = [
  { name: 'unfused', at: [1.0, 0.93], shade: 0.38 },
  { name: 'matte', at: [2.75, 0.93], shade: 0.26 },
  { name: 'semi-matte', at: [3.95, 0.93], shade: 0.14 },
  { name: 'underfired', at: [4.6, 0.2], shade: 0.3 }
] as const;
const BRIGHT_AT: StullXY = [5.5, 0.84];
const CRAZED_AT: StullXY = [1.0, 0.14];

let charts = 0;

@Component({
  selector: 'gc-stull-chart',
  imports: [TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <figure class="stull">
      <svg
        [attr.viewBox]="'0 0 ' + width + ' ' + height"
        role="img"
        [attr.aria-labelledby]="id + '-title ' + id + '-desc'"
      >
        <title [id]="id + '-title'">{{ t('recipe.stull.title') }}</title>
        <desc [id]="id + '-desc'">{{ summary() }}</desc>
        <defs>
          <pattern
            [id]="id + '-hatch'"
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="5" class="stull-hatch" />
          </pattern>
          <clipPath [id]="id + '-plot'">
            <rect [attr.x]="left" [attr.y]="top" [attr.width]="plotW" [attr.height]="plotH" />
          </clipPath>
        </defs>
        <g [attr.clip-path]="'url(#' + id + '-plot)'">
          @for (region of regions; track region.name) {
            <polygon [attr.points]="region.points" class="stull-region" [attr.fill-opacity]="region.shade" />
          }
          <polygon [attr.points]="crazed" [attr.fill]="'url(#' + id + '-hatch)'" />
          @if (box(); as b) {
            <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" class="stull-box" />
            @for (edge of b.edges; track $index) {
              <line
                [attr.x1]="edge[0]"
                [attr.y1]="edge[1]"
                [attr.x2]="edge[2]"
                [attr.y2]="edge[3]"
                class="stull-edge"
              />
            }
          }
          <polyline [attr.points]="bright" class="stull-bright" />
        </g>
        @for (tick of xTicks; track tick.value) {
          <line [attr.x1]="tick.at" [attr.x2]="tick.at" [attr.y1]="top" [attr.y2]="top + plotH" class="stull-grid" />
          <text [attr.x]="tick.at" [attr.y]="top + plotH + 12" text-anchor="middle">{{ tick.label }}</text>
        }
        @for (tick of yTicks; track tick.value) {
          <line [attr.x1]="left" [attr.x2]="left + plotW" [attr.y1]="tick.at" [attr.y2]="tick.at" class="stull-grid" />
          <text [attr.x]="left - 4" [attr.y]="tick.at + 3" text-anchor="end">{{ tick.label }}</text>
        }
        <rect [attr.x]="left" [attr.y]="top" [attr.width]="plotW" [attr.height]="plotH" class="stull-frame" />
        @for (region of regions; track region.name) {
          <text [attr.x]="region.x" [attr.y]="region.y" text-anchor="middle" class="stull-name">
            {{ t(region.key) }}
          </text>
        }
        <text [attr.x]="brightX" [attr.y]="brightY" text-anchor="middle" class="stull-name">
          {{ t('recipe.stull.regions.bright') }}
        </text>
        <text [attr.x]="crazedX" [attr.y]="crazedY" text-anchor="middle" class="stull-name">
          {{ t('recipe.stull.regions.crazed') }}
        </text>
        <text [attr.x]="left + plotW / 2" [attr.y]="height - 4" text-anchor="middle" translate="no">SiO₂</text>
        <text [attr.x]="10" [attr.y]="top + plotH / 2" text-anchor="middle" translate="no" [attr.transform]="yAxis">
          Al₂O₃
        </text>
        @if (dot(); as d) {
          <circle [attr.cx]="d.x" [attr.cy]="d.y" r="4.5" class="stull-point" />
        }
      </svg>
      <figcaption>
        <p>{{ summary() }}</p>
        <ul class="stull-key">
          <li>{{ t('recipe.stull.keyPoint') }}</li>
          <li>{{ t('recipe.stull.keyBright') }}</li>
          @if (box()) {
            <li>{{ t('recipe.stull.keyLimits', { name: limitName() }) }}</li>
          }
          <li>{{ t('recipe.stull.keyCrazed') }}</li>
        </ul>
        <p class="stull-note">{{ t('recipe.stull.note') }}</p>
      </figcaption>
    </figure>
  </ng-container>`,
  styles: `
    .stull {
      margin: 0;
    }
    svg {
      display: block;
      width: 100%;
      max-width: 30rem;
      height: auto;
      font-size: 9px;
      color: var(--gc-text);
    }
    text {
      fill: currentColor;
    }
    .stull-name {
      font-size: 8.5px;
      fill: var(--gc-text);
    }
    .stull-region {
      fill: var(--gc-muted);
    }
    .stull-hatch {
      stroke: var(--gc-muted);
      stroke-width: 1;
    }
    .stull-grid {
      stroke: var(--gc-border);
      stroke-width: 0.5;
    }
    .stull-frame {
      fill: none;
      stroke: var(--gc-muted);
    }
    .stull-bright {
      fill: none;
      stroke: currentColor;
      stroke-width: 1;
      stroke-dasharray: 1.5 2.5;
    }
    .stull-box {
      fill: var(--gc-accent);
      fill-opacity: 0.12;
    }
    .stull-edge {
      stroke: var(--gc-accent);
      stroke-width: 1.5;
      stroke-dasharray: 5 3;
    }
    .stull-point {
      fill: var(--gc-primary);
      stroke: var(--gc-surface);
      stroke-width: 1.5;
    }
    figcaption p {
      margin: 0.5rem 0 0.25rem;
    }
    .stull-key {
      margin: 0;
      padding-inline-start: 1.1rem;
      font-size: 0.9rem;
    }
    .stull-note {
      font-size: 0.9rem;
      color: var(--gc-muted);
    }
  `
})
export class StullChart {
  /** Where the glaze sits (lib/recipe/analysis.js stullPoint); null without silica or alumina. */
  readonly point = input<StullPoint | null>(null);
  /** The chosen limit set's ranges for the firing, of which SiO2 and Al2O3 are drawn. */
  readonly ranges = input<Readonly<Record<string, UnityRange>> | null>(null);
  readonly limitName = input('');

  protected readonly id = 'stull-' + ++charts;
  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly left = LEFT;
  protected readonly top = TOP;
  protected readonly plotW = PLOT_W;
  protected readonly plotH = PLOT_H;
  protected readonly yAxis = `rotate(-90 10 ${TOP + PLOT_H / 2})`;
  protected readonly regions = REGIONS.map((region) => ({
    name: region.name,
    key: REGION_NAMES[region.name],
    shade: region.shade,
    points: points(STULL.regions[region.name]),
    x: xOf(region.at[0]),
    y: yOf(region.at[1])
  }));
  protected readonly crazed = points(STULL.crazed);
  protected readonly bright = points(STULL.bright);
  protected readonly brightX = xOf(BRIGHT_AT[0]);
  protected readonly brightY = yOf(BRIGHT_AT[1]);
  protected readonly crazedX = xOf(CRAZED_AT[0]);
  protected readonly crazedY = yOf(CRAZED_AT[1]);
  protected readonly xTicks = [1, 2, 3, 4, 5, 6, 7].map((value) => ({ value, at: xOf(value), label: upTo(value, 0) }));
  protected readonly yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((value) => ({
    value,
    at: yOf(value),
    label: fixed(value, 1)
  }));

  protected readonly dot = computed(() => {
    const point = this.point();
    return point?.region ? { x: xOf(point.silica), y: yOf(point.alumina) } : null;
  });

  /**
   * The set's silica and alumina ranges as a shaded box, open to the chart's
   * edge on a side it has no figure for, with a dashed line on each side it has.
   */
  protected readonly box = computed(() => {
    const silica = this.ranges()?.['SiO2'];
    const alumina = this.ranges()?.['Al2O3'];
    if (!silica && !alumina) return null;
    const x0 = xOf(clamp(silica?.min ?? SI.min, SI.min, SI.max));
    const x1 = xOf(clamp(silica?.max ?? SI.max, SI.min, SI.max));
    const yLow = yOf(clamp(alumina?.min ?? AL.min, AL.min, AL.max));
    const yHigh = yOf(clamp(alumina?.max ?? AL.max, AL.min, AL.max));
    const edges: number[][] = [];
    if (silica?.min !== undefined) edges.push([x0, yHigh, x0, yLow]);
    if (silica?.max !== undefined) edges.push([x1, yHigh, x1, yLow]);
    if (alumina?.min !== undefined) edges.push([x0, yLow, x1, yLow]);
    if (alumina?.max !== undefined) edges.push([x0, yHigh, x1, yHigh]);
    return { x: x0, y: yHigh, w: x1 - x0, h: yLow - yHigh, edges };
  });

  /** Where the glaze sits, in words: the chart's text alternative. */
  protected summary(): string {
    const point = this.point();
    if (!point) return translate('recipe.stull.noPoint');
    const values = { silica: fixed(point.silica, 2), alumina: fixed(point.alumina, 2), ratio: fixed(point.ratio, 1) };
    if (!point.region) return translate('recipe.stull.offChart', values);
    const where = translate('recipe.stull.at', { ...values, region: translate(REGION_NAMES[point.region]) });
    return point.crazed ? where + ' ' + translate('recipe.stull.inCrazed') : where;
  }
}
