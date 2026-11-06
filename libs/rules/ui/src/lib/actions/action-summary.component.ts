import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ActionIcon, Badge, HeadingLevel, Stack, Text } from '@pioneer/frontier';
import type { RichText } from '@pioneer/rules/sdk';

import { RichTextView } from '../rich-text/rich-text.component';
import { StatisticConditions } from '../statistics/statistic-conditions/statistic-conditions.component';
import type { ShownAction } from './action-row.component';
import { ActionsMessage } from './actions-messages';

/** Blocks of the effect the summary shows: its opening, not the whole entry. */
const EFFECT_BLOCKS = 1;

/** A labelled passage of the summary: what the action needs, or when it can be used. */
interface Fact {
  readonly label: string;
  readonly text: RichText;
}

/**
 * The glance an action row opens while the pointer rests on its name or focus is on it: the cost and where the action
 * comes from, its traits, its trigger and requirements, the opening of its effect, and why it can't be used plainly.
 * Presentational: the row passes the action as it is shown.
 *
 * ```html
 * <pio-action-summary [action]="shown" />
 * ```
 */
@Component({
  selector: 'pio-action-summary',
  imports: [ActionIcon, Badge, RichTextView, Stack, StatisticConditions, Text, TranslocoPipe],
  templateUrl: './action-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionSummary {
  public readonly action = input.required<ShownAction>();

  protected readonly level = HeadingLevel.Four;
  /** The trigger and the requirements, for those the action has. */
  protected readonly facts = computed((): readonly Fact[] => {
    const { trigger, requirements } = this.action().line;
    return [
      ...(trigger === undefined ? [] : [{ label: ActionsMessage.SummaryTrigger, text: trigger }]),
      ...(requirements === undefined ? [] : [{ label: ActionsMessage.SummaryRequirements, text: requirements }]),
    ];
  });
  protected readonly effect = computed((): RichText => this.action().line.effect?.slice(0, EFFECT_BLOCKS) ?? []);
}
