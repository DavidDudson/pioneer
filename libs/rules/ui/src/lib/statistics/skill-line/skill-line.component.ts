import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Button, ButtonVariant, HoverCard, HoverCardContent, Stack, Text } from '@pioneer/frontier';
import type { StatisticValue } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';
import type { ContentId, Proficiency } from '@pioneer/rules/sdk';

import { BreakdownView } from '../../breakdown/breakdown.component';
import { NO_ORIGIN_NAMES } from '../../origin-chain/origin-names';
import type { OriginNames } from '../../origin-chain/origin-names';
import { ProficiencyBadge } from '../../proficiency-badge/proficiency-badge.component';
import type { RankSource } from '../../proficiency-badge/proficiency-badge.component';
import { StatisticRoll } from '../statistic-roll/statistic-roll.component';
import { STATISTIC_ROLLER } from '../statistic-roller';
import { StatisticTotal } from '../statistic-total/statistic-total.component';

/**
 * A skill's line: its name on the left, its rank badge, then the roll on the far right, whose popover holds the
 * breakdown. Where the page rolls nothing the total stands in for the roll.
 *
 * ```html
 * <pio-skill-line [name]="'Acrobatics'" [statistic]="result" [kind]="kind" [total]="'+7'" />
 * ```
 */
@Component({
  selector: 'pio-skill-line',
  imports: [
    BreakdownView,
    Button,
    HoverCard,
    HoverCardContent,
    ProficiencyBadge,
    Stack,
    StatisticRoll,
    StatisticTotal,
    Text,
  ],
  templateUrl: './skill-line.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillLine {
  public readonly name = input.required<string>();
  public readonly kind = input.required<StatisticKind>();
  public readonly statistic = input.required<StatisticValue>();
  /** The total as worded, for where nothing rolls. */
  public readonly total = input.required<string>();
  public readonly computed = input<string | undefined>();
  /** True when a user added a modifier by hand: the total says so beside it. */
  public readonly adjusted = input(false);
  public readonly fromForm = input<string | undefined>();
  public readonly rank = input<Proficiency | undefined>();
  public readonly rankSources = input<readonly RankSource[]>([]);
  /** The skill two sources train, worded, for the rank's popover. */
  public readonly rankNote = input<string | undefined>();
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly roller = inject(STATISTIC_ROLLER, { optional: true });
  protected readonly inline = ButtonVariant.Inline;
  /** Only a check is rolled, and only where the page rolls; a DC or a value shows its total, the breakdown on hover. */
  protected readonly rollable = computed((): boolean => this.roller !== null && this.kind() === StatisticKind.Check);
}
