import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { FontWeight, LocaleFormat, ScreenOverlay, Text, TextVariant, Toast, Tone } from '@pioneer/frontier';

import type { RollPresentation } from './roll-presentation';
import { RollPresenter } from './roll-presenter';

/** What the toast shows of a roll: the total as the viewer's locale writes it, the label, and the type's name key. */
interface ToastView {
  readonly total: string;
  readonly roll: RollPresentation;
}

/**
 * Where rolls play: the dice tumbling across the whole screen, then a pill at the bottom centre with the result,
 * coloured by damage type (ADR-0074). Mounted once on a page that rolls; `RollPresenter` says what to show. The dice
 * never take a click, and the pill is a polite status for screen readers.
 *
 * ```html
 * <pio-roll-stage />
 * ```
 */
@Component({
  selector: 'pio-roll-stage',
  imports: [ScreenOverlay, Text, Toast, TranslocoPipe],
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
    return roll === undefined ? undefined : { total: this.#format.number(roll.total), roll };
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
