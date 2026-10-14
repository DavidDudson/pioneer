import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Size, Stack, Text, ToggleButton } from '@pioneer/frontier';

/** One thing a roll can take or leave, already worded: what it is, and whether it is on. */
export interface RollToggleView {
  /** Names the toggle to whoever handles the change; the component only passes it back. */
  readonly id: string;
  readonly text: string;
  readonly on: boolean;
}

/** A toggle flipped: which one, and the state it was flipped to. */
export interface RollToggleChange {
  readonly id: string;
  readonly on: boolean;
}

/**
 * The toggles offered before a roll (rules-engine.md, "Predicates and conditional modifiers"): the situations that
 * count for this roll only, and the toggles the character keeps from roll to roll. A group with nothing in it is
 * left out. The caller words the toggles and recomputes the roll when one changes.
 *
 * ```html
 * <pio-roll-toggles [perRoll]="situations()" (perRollChange)="choose($event)" />
 * ```
 */
@Component({
  selector: 'pio-roll-toggles',
  imports: [Stack, Text, ToggleButton, TranslocoPipe],
  templateUrl: './roll-toggles.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollToggles {
  /** Situations that count for this roll only. */
  public readonly perRoll = input<readonly RollToggleView[]>([]);
  /** Toggles the character keeps between rolls. */
  public readonly remembered = input<readonly RollToggleView[]>([]);
  public readonly perRollChange = output<RollToggleChange>();
  public readonly rememberedChange = output<RollToggleChange>();

  protected readonly small = Size.Sm;
}
