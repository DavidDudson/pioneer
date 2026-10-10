import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

import { LocaleFormat } from '../../locale/locale-format';
import { meterTone } from './meter-tone';
import type { MeterTone } from './meter-tone';

export const MeterVariant = {
  /** A continuous bar. The default; for HP and other large ranges. */
  Bar: 'bar',
  /** One block per point, for small counts: hero points, dying 0-4. */
  Segmented: 'segmented',
} as const;
export type MeterVariant = ValueOf<typeof MeterVariant>;

/** Past this many points a segmented meter draws a bar: the blocks get too thin to count. */
export const MAX_SEGMENTS = 10;

/**
 * The native meter is the track; its fill is a pseudo-element (`meter-value:`). The track keeps its border in
 * every tone, so an empty meter still shows its extent.
 */
const barVariants = cva(
  'block h-meter min-w-none flex-1 appearance-none border border-line-default bg-surface-sunken',
  {
    variants: {
      tone: {
        accent: 'meter-value:bg-accent-solid',
        success: 'meter-value:bg-success-solid',
        warning: 'meter-value:bg-warning-solid',
        danger: 'meter-value:bg-danger-solid',
      } satisfies Record<MeterTone, string>,
    },
  },
);

const segmentVariants = cva('h-meter flex-1 border', {
  variants: {
    filled: { true: '', false: 'border-line-default bg-surface-sunken' },
    tone: { accent: '', success: '', warning: '', danger: '' } satisfies Record<MeterTone, string>,
  },
  compoundVariants: [
    {
      filled: true,
      tone: 'accent',
      class: 'border-accent-solid bg-accent-solid',
    },
    {
      filled: true,
      tone: 'success',
      class: 'border-success-solid bg-success-solid',
    },
    {
      filled: true,
      tone: 'warning',
      class: 'border-warning-solid bg-warning-solid',
    },
    {
      filled: true,
      tone: 'danger',
      class: 'border-danger-solid bg-danger-solid',
    },
  ],
});

const rowClasses = cva('flex min-w-none flex-1 gap-3xs')();
const hiddenMeterClasses = cva('sr-only')();
const numberClasses = cva('shrink-0 text-label whitespace-nowrap tabular-nums text-fg-default')();

/**
 * A current/max amount as a bar with the number beside it: HP, focus points, dying. Owns `<meter>`, which
 * carries the value and `label` for assistive tech; the visible number is hidden from it so it reads once.
 *
 * `low`, `high` and `optimum` follow `<meter>`: they set the fill's tone (success in the optimum range, warning
 * one range away, danger beyond). Without `low` or `high` the fill is the accent. The segmented variant draws
 * one block per point up to `MAX_SEGMENTS`, a bar beyond that.
 *
 * ```html
 * <fr-meter [label]="'sheet.hp' | transloco" [value]="hp" [max]="maxHp" [low]="maxHp / 4" [high]="maxHp / 2" [optimum]="maxHp" />
 * <fr-meter [label]="'sheet.dying' | transloco" variant="segmented" [value]="dying" [max]="4" [low]="1" [high]="2" [optimum]="0" />
 * ```
 */
@Component({
  selector: 'fr-meter',
  imports: [TranslocoPipe],
  templateUrl: './meter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-w-none items-center gap-xs' },
})
export class Meter {
  /** The accessible name: what is being measured ("Hit points"). */
  public readonly label = input.required<string>();
  public readonly value = input.required<number>();
  public readonly max = input.required<number>();
  public readonly min = input<number>(0);
  public readonly low = input<number | undefined>(undefined);
  public readonly high = input<number | undefined>(undefined);
  public readonly optimum = input<number | undefined>(undefined);
  public readonly variant = input<MeterVariant>(MeterVariant.Bar);

  readonly #format = inject(LocaleFormat);

  protected readonly tone = computed(() =>
    meterTone({
      value: this.value(),
      min: this.min(),
      max: this.max(),
      low: this.low(),
      high: this.high(),
      optimum: this.optimum(),
    }),
  );

  /** One entry per point when drawn as segments, whether it is filled; undefined when drawn as a bar. */
  protected readonly segments = computed(() => {
    const count = this.max() - this.min();
    if (this.variant() !== MeterVariant.Segmented || count > MAX_SEGMENTS || count < 1) {
      return undefined;
    }
    const filled = this.value() - this.min();
    return Array.from({ length: count }, (_unused, index) =>
      segmentVariants({ filled: index < filled, tone: this.tone() }),
    );
  });

  protected readonly meterClasses = computed(() =>
    this.segments() === undefined ? barVariants({ tone: this.tone() }) : hiddenMeterClasses,
  );

  /** Formatted in the UI locale, for the visible number and the meter's value text. */
  protected readonly numbers = computed(() => ({
    value: this.#format.number(this.value()),
    max: this.#format.number(this.max()),
  }));

  protected readonly rowClasses = rowClasses;
  protected readonly numberClasses = numberClasses;
}
