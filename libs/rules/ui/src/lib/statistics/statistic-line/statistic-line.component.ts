import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Disclosure, Stack, Text } from '@pioneer/frontier';
import type { StatisticValue } from '@pioneer/rules/engine';
import type { ContentId, Proficiency, StatisticKind } from '@pioneer/rules/sdk';

import { BreakdownView } from '../../breakdown/breakdown.component';
import { NO_ORIGIN_NAMES } from '../../origin-chain/origin-names';
import type { OriginNames } from '../../origin-chain/origin-names';
import { ProficiencyBadge } from '../../proficiency-badge/proficiency-badge.component';
import type { RankSource } from '../../proficiency-badge/proficiency-badge.component';
import { SkillLine } from '../skill-line/skill-line.component';
import { StatisticRoll } from '../statistic-roll/statistic-roll.component';
import { StatisticTotal } from '../statistic-total/statistic-total.component';

/**
 * One derived statistic's line: its name, rank and total over the breakdown it expands to, with the roll beside it; or,
 * for a skill, the name, rank badge and roll alone, the breakdown being the roll's popover.
 *
 * ```html
 * <pio-statistic-line [name]="'Fortitude'" [statistic]="result" [kind]="kind" [total]="'+10'" />
 * ```
 */
@Component({
  selector: 'pio-statistic-line',
  imports: [BreakdownView, Disclosure, ProficiencyBadge, SkillLine, Stack, StatisticRoll, StatisticTotal, Text],
  templateUrl: './statistic-line.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticLine {
  public readonly name = input.required<string>();
  public readonly kind = input.required<StatisticKind>();
  public readonly statistic = input.required<StatisticValue>();
  /** The total as worded. */
  public readonly total = input.required<string>();
  public readonly computed = input<string | undefined>();
  /** True when a user added a modifier by hand: the total says so beside it. */
  public readonly adjusted = input(false);
  public readonly fromForm = input<string | undefined>();
  public readonly rank = input<Proficiency | undefined>();
  public readonly rankSources = input<readonly RankSource[]>([]);
  /** Lay the line out as a skill's. */
  public readonly skill = input(false, { transform: booleanAttribute });
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);
}
