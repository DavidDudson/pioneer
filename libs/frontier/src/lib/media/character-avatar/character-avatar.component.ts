import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { cva } from 'class-variance-authority';

import { meterTone } from '../../feedback/meter/meter-tone';
import type { MeterTone } from '../../feedback/meter/meter-tone';
import { LocaleFormat } from '../../locale/locale-format';
import { Size } from '../../tokens';
import { Avatar } from '../avatar/avatar.component';

/** Arc geometry in a 100-unit box: the bottom half of a circle just outside the portrait (radius 50). */
const ARC_PATH = 'M 4 50 A 46 46 0 0 0 96 50';
const ARC_LENGTH = 100;

/** The bar turns warning below this share of max, and danger below `DANGER_SHARE`. */
const WARNING_SHARE = 0.5;
const DANGER_SHARE = 0.25;

const portraitClasses = cva('block clip-circle')();
const svgClasses = cva('pointer-events-none absolute inset-none size-full overflow-visible')();
const trackClasses = cva('stroke-line-default forced-colors:stroke-system-canvas-text')();
const tempClasses = cva('stroke-info-solid forced-colors:stroke-system-highlight')();
const nameClasses = cva('absolute inset-x-none -bottom-2xs flex justify-center')();
const nameTextClasses = cva(
  'max-w-full truncate border border-line-default bg-surface-raised px-xs text-caption text-fg-default',
)();
const startClasses = cva('absolute -start-2xs -top-2xs')();
const endClasses = cva('absolute -end-2xs -top-2xs')();

const fillVariants = cva('', {
  variants: {
    tone: {
      accent: 'stroke-accent-solid',
      success: 'stroke-success-solid',
      warning: 'stroke-warning-solid',
      danger: 'stroke-danger-solid',
    } satisfies Record<MeterTone, string>,
  },
});

/**
 * A character's portrait as a circle (or the initials, via `fr-avatar`), with the name across the bottom edge and
 * a semicircular health bar around the lower half. Presentational: it takes numbers, not a character.
 *
 * The bar shows `current` of `max` HP in the meter tones (success, warning below half, danger below a quarter),
 * and `temp` points after it. The bar's whole is `max` or `current + temp`, whichever is larger, so temporary HP
 * never overflows the arc. Screen readers get the numbers as one image label; the visible name is read once, as
 * text. Nothing here moves, so reduced motion needs no special case.
 *
 * Project overlapping badges (conditions, gifts) into the top corners:
 *
 * ```html
 * <fr-character-avatar [name]="name" [src]="portrait" [current]="12" [max]="20" [temp]="3">
 *   <fr-badge frCharacterAvatarStart>…</fr-badge>
 *   <fr-badge frCharacterAvatarEnd>…</fr-badge>
 * </fr-character-avatar>
 * ```
 *
 * The circle is a clip, not a border radius: frontier has no rounded corners (see `clip-circle` in frontier.css).
 */
@Component({
  selector: 'fr-character-avatar',
  imports: [Avatar, TranslocoPipe],
  templateUrl: './character-avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-block p-xs' },
})
export class CharacterAvatar {
  readonly #format = inject(LocaleFormat);

  public readonly name = input.required<string>();
  public readonly src = input<string | undefined>(undefined);
  public readonly current = input.required<number>();
  public readonly max = input.required<number>();
  public readonly temp = input(0);
  public readonly size = input<Size>(Size.Lg);

  /** HP as non-negative amounts: current never past max, temp never negative. */
  readonly #amounts = computed(() => {
    const max = Math.max(this.max(), 0);
    return { max, current: Math.min(Math.max(this.current(), 0), max), temp: Math.max(this.temp(), 0) };
  });

  protected readonly hasBar = computed(() => this.#amounts().max > 0);

  /** The arc's pieces as dash arrays over a 100-long path: the HP fill, then the temp fill after it. */
  protected readonly dashes = computed(() => {
    const { max, current, temp } = this.#amounts();
    const whole = Math.max(max, current + temp);
    const hp = whole === 0 ? 0 : (current / whole) * ARC_LENGTH;
    const extra = whole === 0 ? 0 : (temp / whole) * ARC_LENGTH;
    return { hp: `${hp} ${ARC_LENGTH}`, temp: `0 ${hp} ${extra} ${ARC_LENGTH}`, hasTemp: temp > 0 };
  });

  protected readonly fillClasses = computed(() => {
    const { max, current } = this.#amounts();
    return fillVariants({
      tone: meterTone({
        value: current,
        min: 0,
        max,
        low: max * DANGER_SHARE,
        high: max * WARNING_SHARE,
        optimum: max,
      }),
    });
  });

  protected readonly numbers = computed(() => {
    const { max, current, temp } = this.#amounts();
    return { current: this.#format.number(current), max: this.#format.number(max), temp: this.#format.number(temp) };
  });

  protected readonly arcPath = ARC_PATH;
  protected readonly arcLength = ARC_LENGTH;
  protected readonly portraitClasses = portraitClasses;
  protected readonly svgClasses = svgClasses;
  protected readonly trackClasses = trackClasses;
  protected readonly tempClasses = tempClasses;
  protected readonly nameClasses = nameClasses;
  protected readonly nameTextClasses = nameTextClasses;
  protected readonly startClasses = startClasses;
  protected readonly endClasses = endClasses;
}
