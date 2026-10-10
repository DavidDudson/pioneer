import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncButton, Button, Stack, Text } from '@pioneer/frontier';

/** The message keys of one membership change: its question, its button and the button's states. */
export interface MemberChangeText {
  readonly confirm: string;
  readonly action: string;
  readonly pending: string;
  readonly success: string;
}

/**
 * Asks before a membership change, inline (frontier never opens a modal): the question, a button
 * that makes the change, and Cancel until it is done.
 */
@Component({
  selector: 'pio-campaign-member-confirm',
  imports: [AsyncButton, Button, Stack, Text, TranslocoPipe],
  templateUrl: './campaign-member-confirm.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignMemberConfirm {
  public readonly text = input.required<MemberChangeText>();
  /** Whose membership changes, for the question; empty when it is the user's own. */
  public readonly name = input('');
  public readonly action = input.required<() => Promise<void>>();
  public readonly describeError = input.required<() => string>();
  /** True once the change is done: the button keeps its tick and Cancel goes. */
  public readonly settled = input(false);
  public readonly cancelled = output();
}
