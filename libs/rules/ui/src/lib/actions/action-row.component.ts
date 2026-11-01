import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ActionIcon, Badge, HoverCard, HoverCardContent, Link, Stack, Text } from '@pioneer/frontier';
import type { ActionIconCost, BadgeTone } from '@pioneer/frontier';
import { ActionStatus } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';

import { ENTRY_PREVIEWS } from '../entry-preview/entry-preview';
import type { PanelLink } from '../entry-preview/entry-preview';
import { StatisticRoll } from '../statistics/statistic-roll/statistic-roll.component';
import type { ActionLine } from './action-line';
import { ActionSummary } from './action-summary.component';
import { ACTION_STATUS_MESSAGES } from './actions-messages';
import { UseButtons } from './use-buttons.component';

/** An action cost to draw as icons: what it costs, the cost a range runs to, and the name a screen reader says. */
export interface ActionCostIcon {
  readonly cost: ActionIconCost;
  readonly upTo?: ActionIconCost | undefined;
  readonly label: string;
}

/** One action as shown: the line with its cost, source and reasons already worded. */
export interface ShownAction {
  readonly line: ActionLine;
  /** "1 action, Basic action" or "Reaction, Granted by Shield Block": its cost and where it comes from. */
  readonly detail: string;
  /** The cost drawn as action icons, with its words; absent for a cost the icons cannot draw, which `detail` words. */
  readonly costIcon?: ActionCostIcon | undefined;
  /** What an item action spends and has left ("2/3 uses"); absent for any other action. */
  readonly resource?: string | undefined;
  /** Why it is not plainly available, worded. */
  readonly reasons: readonly string[];
  /** "+2 circumstance when your shield is raised (Steel Shield)": the roll's lines that apply only in some situations. */
  readonly conditions: readonly string[];
}

const STATUS_TONES: Readonly<Record<ActionStatus, BadgeTone>> = {
  [ActionStatus.Available]: 'success',
  [ActionStatus.Conditional]: 'warning',
  [ActionStatus.Unavailable]: 'danger',
};

/**
 * One action of the list (`pio-actions`) as a compact row: its cost icon and name on the left, its roll and use buttons
 * on the right. Hovering or focusing the name shows the action's summary; when the page has a side panel the name
 * opens the action there, and the roll and use buttons do not. The status shows only when asked for, as the Now view
 * lists nothing unusable.
 */
@Component({
  selector: 'pio-action-row',
  imports: [
    ActionIcon,
    ActionSummary,
    Badge,
    HoverCard,
    HoverCardContent,
    Link,
    Stack,
    StatisticRoll,
    Text,
    TranslocoPipe,
    UseButtons,
  ],
  templateUrl: './action-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionRow {
  public readonly action = input.required<ShownAction>();
  /** Whether to show the status, which the All view needs and the Now view does not. */
  public readonly showStatus = input(false);

  readonly #previews = inject(ENTRY_PREVIEWS);

  protected readonly Check = StatisticKind.Check;
  /** Where the name opens the action in the page's side panel; none when the page has no panel. */
  protected readonly panel = computed((): PanelLink | undefined => this.#previews.panel?.(this.action().line.id));
  protected readonly statusKey = computed(() => ACTION_STATUS_MESSAGES[this.action().line.status]);
  protected readonly statusTone = computed(() => STATUS_TONES[this.action().line.status]);
}
