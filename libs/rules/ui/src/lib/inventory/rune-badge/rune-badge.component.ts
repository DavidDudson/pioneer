import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Gem, GemTone } from '@pioneer/frontier';
import { FundamentalRune } from '@pioneer/rules/sdk';
import { runicPair } from '@pioneer/shared/kernel';

import { GRADED_RUNE_MESSAGES, RuneMessage } from '../rune-name';
import { RuneBadgeKind } from './rune-badge-data';
import type { RuneBadgeData } from './rune-badge-data';
import { FUNDAMENTAL_GLYPHS } from './rune-glyphs';

/** Each grade's tier colour: base blue, greater purple, major red, mythic gold. */
const GRADE_TONES: readonly GemTone[] = [GemTone.Blue, GemTone.Purple, GemTone.Red, GemTone.Gold];

/** A reinforcing rune's six grades, minor to supreme: greater (4th) is purple, major (5th) red, supreme gold. */
const REINFORCING_TONES: readonly GemTone[] = [
  GemTone.Blue,
  GemTone.Blue,
  GemTone.Blue,
  GemTone.Purple,
  GemTone.Red,
  GemTone.Gold,
];

/** A badge as the gem shows it. */
interface ShownRune {
  readonly glyphs: string;
  readonly tone: GemTone | undefined;
  readonly label: string;
}

const HOLE_GLYPH = '+';

/**
 * One rune on an item as a gem: a fundamental rune shows its own glyph in the colour of its grade, a property rune a
 * pair of Runic letters its content id picks (the same on every item), and a slot with no rune a `+` in an empty
 * outline. The accessible name carries the grade, so colour is never the only signal.
 *
 * ```html
 * <pio-rune-badge [rune]="rune" />
 * ```
 */
@Component({
  selector: 'pio-rune-badge',
  imports: [Gem],
  templateUrl: './rune-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuneBadge {
  public readonly rune = input.required<RuneBadgeData>();

  readonly #i18n = inject(TranslocoService);
  protected readonly shown = computed((): ShownRune => {
    const rune = this.rune();
    switch (rune.kind) {
      case RuneBadgeKind.Hole: {
        return { glyphs: HOLE_GLYPH, tone: undefined, label: this.#i18n.translate(RuneMessage.EmptySlot) };
      }
      case RuneBadgeKind.Property: {
        return { glyphs: runicPair(rune.id), tone: GemTone.Blue, label: rune.name };
      }
      case RuneBadgeKind.Fundamental: {
        const tones = rune.rune === FundamentalRune.Reinforcing ? REINFORCING_TONES : GRADE_TONES;
        const message =
          rune.rune === FundamentalRune.Potency ? RuneMessage.PotencyName : GRADED_RUNE_MESSAGES[rune.rune];
        return {
          glyphs: FUNDAMENTAL_GLYPHS[rune.rune],
          tone: tones[rune.grade - 1] ?? GemTone.Blue,
          label: this.#i18n.translate(message, { grade: rune.grade }),
        };
      }
      default: {
        return rune satisfies never;
      }
    }
  });
}
