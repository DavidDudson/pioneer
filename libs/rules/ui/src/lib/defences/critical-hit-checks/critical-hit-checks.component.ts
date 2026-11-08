import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, ButtonVariant, Size, Stack, Text } from '@pioneer/frontier';
import { DefenceStatusKind } from '@pioneer/rules/engine';
import type { CriticalHitCheckLine } from '@pioneer/rules/engine';
import type { Dc } from '@pioneer/rules/sdk';

import { DefencesMessage } from '../defences-messages';

/** A flat check asked for: the DC the card compares the d20 with. */
export interface CriticalHitRoll {
  readonly dc: Dc;
}

/** Whether a check counts: one that applies or may, not one that failed. */
export function isActiveCheck({ status }: CriticalHitCheckLine): boolean {
  return status.kind === DefenceStatusKind.Applied || status.kind === DefenceStatusKind.Conditional;
}

/**
 * The flat checks that turn a critical hit on the character into a normal hit (fortification runes), each worded from
 * its DC with a button that asks for the roll. Presentational (ADR-0028): the page rolls the dice, this only says
 * which check was pressed.
 *
 * ```html
 * <pio-critical-hit-checks [checks]="defences.criticalHitChecks" (rolled)="roll($event)" />
 * ```
 */
@Component({
  selector: 'pio-critical-hit-checks',
  imports: [Button, Stack, Text, TranslocoPipe],
  templateUrl: './critical-hit-checks.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CriticalHitChecks {
  public readonly checks = input.required<readonly CriticalHitCheckLine[]>();
  /** A check's roll was asked for. */
  public readonly rolled = output<CriticalHitRoll>();

  protected readonly Message = DefencesMessage;
  protected readonly outline = ButtonVariant.OutlineSubtle;
  protected readonly small = Size.Sm;
  protected readonly active = computed((): readonly CriticalHitCheckLine[] =>
    this.checks().filter((check) => isActiveCheck(check)),
  );
}
