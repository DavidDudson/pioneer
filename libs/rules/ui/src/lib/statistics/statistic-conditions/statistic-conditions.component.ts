import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Size, Stack, Text, ToggleButton } from '@pioneer/frontier';

/** A conditional line the player can claim the situation of, already worded, and whether they have. */
export interface ConditionToggle {
  /** The rule the line comes from; the component only passes it back. */
  readonly id: string;
  readonly text: string;
  readonly on: boolean;
}

/** A condition toggled: which one, and the state it was flipped to. */
export interface ConditionChange {
  readonly id: string;
  readonly on: boolean;
}

/**
 * A statistic's lines that apply only in some situations, already worded, under its summary ("+2 circumstance when
 * your shield is raised (Steel Shield)"). Outside the disclosure's trigger, so they do not become part of its name.
 * Lines the player can claim the situation of come as toggles above the plain ones, and report a flip through
 * `toggled`.
 *
 * ```html
 * <pio-statistic-conditions [conditions]="lines()" [toggles]="claimable()" (toggled)="claim($event)" />
 * ```
 */
@Component({
  selector: 'pio-statistic-conditions',
  imports: [Stack, Text, ToggleButton],
  templateUrl: './statistic-conditions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticConditions {
  public readonly conditions = input.required<readonly string[]>();
  /** Lines whose situation can be claimed; none unless the page lets the player claim them. */
  public readonly toggles = input<readonly ConditionToggle[]>([]);
  public readonly toggled = output<ConditionChange>();

  protected readonly small = Size.Sm;
}
