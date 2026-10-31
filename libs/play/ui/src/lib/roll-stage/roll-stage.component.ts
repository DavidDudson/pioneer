import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { DamageTone } from '@pioneer/frontier';
import { FontWeight, LocaleFormat, ScreenOverlay, Stack, Text, TextVariant, Toast, Tone } from '@pioneer/frontier';

import { RollOutcome } from '../roll-outcome/roll-outcome.component';
import type { RollPresentation } from './roll-presentation';
import { RollPresenter } from './roll-presenter';

/** One damage type's row in the toast, its total written for the viewer's locale. */
interface ToastLine {
  readonly total: string;
  readonly tone: DamageTone | undefined;
  readonly typeKey: string | undefined;
}

/** What the toast shows of a roll: each type's total as the viewer's locale writes it, and the roll for its label. */
interface ToastView {
  readonly lines: readonly ToastLine[];
  readonly roll: RollPresentation;
}

/**
 * Where rolls play: the dice tumbling across the whole screen, then a toast at the bottom centre with the result,
 * coloured by damage type (ADR-0074). Mounted once on a page that rolls; `RollPresenter` says what to show. The dice
 * never take a click, and the toast is a polite status for screen readers.
 *
 * ```html
 * <pio-roll-stage />
 * ```
 */
@Component({
  selector: 'pio-roll-stage',
  imports: [RollOutcome, ScreenOverlay, Stack, Text, Toast, TranslocoPipe],
  templateUrl: './roll-stage.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class RollStage {
  protected readonly presenter = inject(RollPresenter);
  readonly #format = inject(LocaleFormat);
  protected readonly overlay = viewChild(ScreenOverlay);
  protected readonly Heading = TextVariant.Heading;
  protected readonly Bold = FontWeight.Bold;
  protected readonly Muted = Tone.Muted;

  protected readonly view = computed((): ToastView | undefined => {
    const roll = this.presenter.toast();
    if (roll === undefined) {
      return undefined;
    }
    const lines = roll.lines.map(({ total, tone, typeKey }) => ({ total: this.#format.number(total), tone, typeKey }));
    return { lines, roll };
  });

  public constructor() {
    // The dice start once the overlay's surface is in the page.
    effect(() => {
      const overlay = this.overlay();
      const throwing = this.presenter.throwing();
      if (overlay !== undefined && throwing !== undefined) {
        untracked(() => {
          // oxlint-disable-next-line typescript/no-floating-promises -- play catches every error, so it never rejects
          this.presenter.play(overlay.surface().nativeElement, throwing);
        });
      }
    });
  }
}
