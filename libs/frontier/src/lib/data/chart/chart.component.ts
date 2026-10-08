import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { Chart as TanStackChart } from '@tanstack/charts/angular';
import type { ChartDefinition, ChartOptions } from '@tanstack/charts/angular';

/** Shape of the plot. Width always follows the container. */
export const ChartAspect = { Wide: 'wide', Standard: 'standard', Square: 'square' } as const;
export type ChartAspect = ValueOf<typeof ChartAspect>;

const WIDE = { width: 16, height: 9 } as const;
const STANDARD = { width: 4, height: 3 } as const;
const ASPECT_RATIO: Record<ChartAspect, number> = {
  wide: WIDE.width / WIDE.height,
  standard: STANDARD.width / STANDARD.height,
  square: 1,
};

/**
 * A chart on TanStack Charts, themed by frontier: axes, labels and grid take
 * the text colour, series take the `--fr-chart-*` palette, and both follow
 * dark mode. Build `definition` with `defineChart` from `@tanstack/charts`;
 * give every chart a label and, for exact values, a table beside it.
 */
@Component({
  selector: 'fr-chart',
  imports: [TanStackChart],
  templateUrl: './chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full text-fg-muted chart-palette' },
})
export class Chart {
  public readonly definition = input.required<ChartDefinition>();
  /** Accessible name: what the chart shows. */
  public readonly label = input.required<string>();
  public readonly description = input<string | undefined>(undefined);
  public readonly aspect = input<ChartAspect>(ChartAspect.Wide);

  protected readonly options = computed<ChartOptions>(() => {
    const description = this.description();
    return {
      definition: this.definition(),
      ariaLabel: this.label(),
      aspectRatio: ASPECT_RATIO[this.aspect()],
      ...(description === undefined ? {} : { ariaDescription: description }),
    };
  });
}
