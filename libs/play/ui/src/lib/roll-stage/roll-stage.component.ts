import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { DamageTone } from '@pioneer/frontier';
import {
  FontWeight,
  LocaleFormat,
  ScreenOverlay,
  Stack,
  Text,
  TextVariant,
  Toast,
  ToastEmphasis,
  Tone,
} from '@pioneer/frontier';

import { RollOutcome } from '../roll-outcome/roll-outcome.component';
import type { Natural, RollPresentation } from './roll-presentation';
import { RollPresenter } from './roll-presenter';

const UNADJUSTED_KEY = 'roll.toast.unadjusted';
/** The banner a natural 20 and a natural 1 earn. */
const NATURAL_BANNERS: Readonly<Record<Natural, string>> = { high: 'roll.natural.high', low: 'roll.natural.low' };

/** A muted word beside a damage total: a message key and its values, translated in the template. */
interface ToastNote {
  readonly key: string;
  readonly params: { readonly total?: string };
}

/** One damage type's row in the toast, its total written for the viewer's locale. */
interface ToastLine {
  readonly total: string;
  readonly tone: DamageTone | undefined;
  /** What the dice came to before a basic save scaled them, then the type's name; each only when there is one. */
  readonly notes: readonly ToastNote[];
}

/** What the toast shows of a roll: each type's total as the viewer's locale writes it, and the roll for its label. */
interface ToastView {
  readonly lines: readonly ToastLine[];
  readonly roll: RollPresentation;
  /** Message keys in bold under the totals: the natural die the roll earned, then the degree it reached. */
  readonly headlines: readonly string[];
  readonly emphasis: ToastEmphasis;
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
    const lines = roll.lines.map(({ total, unadjusted, tone, typeKey }) => ({
      total: this.#format.number(total),
      tone,
      notes: [
        ...(unadjusted === undefined
          ? []
          : [{ key: UNADJUSTED_KEY, params: { total: this.#format.number(unadjusted) } }]),
        ...(typeKey === undefined ? [] : [{ key: typeKey, params: {} }]),
      ],
    }));
    const headlines = [roll.natural === undefined ? undefined : NATURAL_BANNERS[roll.natural], roll.degreeKey].filter(
      (key) => key !== undefined,
    );
    return { lines, roll, headlines, emphasis: roll.natural ?? ToastEmphasis.None };
  });

  protected readonly emphasis = computed((): ToastEmphasis => this.view()?.emphasis ?? ToastEmphasis.None);

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
