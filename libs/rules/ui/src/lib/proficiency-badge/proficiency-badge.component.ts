import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, ButtonVariant, HoverCard, HoverCardContent, List, ListItem, Text } from '@pioneer/frontier';
import type { Proficiency } from '@pioneer/rules/sdk';

import { PROFICIENCY_NAMES } from '../proficiency-rank/proficiency-rank-messages';
import { ProficiencyRankView } from '../proficiency-rank/proficiency-rank.component';
import { ProficiencyBadgeMessage } from './proficiency-badge-messages';

/** What gave a rank, or will: a rank, the thing that gave it already worded, and the level it comes at when it is ahead. */
export interface RankSource {
  readonly rank: Proficiency;
  /** "Cleric", "Level 1 trained skill 1": already worded. */
  readonly source: string;
  /** The level the rank comes at; set for a future rank. */
  readonly level?: number | undefined;
  /** A rank the character does not have yet: shown in grey, with its level. */
  readonly future: boolean;
}

/** A source as the popover words it. */
interface ShownSource {
  readonly key: string;
  readonly params: { readonly rank: string; readonly source: string; readonly level: number | undefined };
  readonly future: boolean;
}

/**
 * A proficiency rank as its letter (U, T, E, M, L) that opens a popover on hover or focus, saying what gave the rank
 * (a class, a background, a skill increase) and, in grey, the ranks the character will have and at which level. With
 * no sources it is the plain letter. The popover never takes focus; a first touch tap opens it.
 *
 * ```html
 * <pio-proficiency-badge [rank]="rank" [sources]="sources" />
 * ```
 */
@Component({
  selector: 'pio-proficiency-badge',
  imports: [Button, HoverCard, HoverCardContent, List, ListItem, ProficiencyRankView, Text, TranslocoPipe],
  templateUrl: './proficiency-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProficiencyBadge {
  /** Undefined for a statistic with no rank: nothing is shown. */
  public readonly rank = input<Proficiency | undefined>();
  /** What gave the current rank, then the ranks ahead, in the order to list them. */
  public readonly sources = input<readonly RankSource[]>([]);

  protected readonly inline = ButtonVariant.Inline;
  protected readonly shown = computed((): readonly ShownSource[] =>
    this.sources().map(({ rank, source, level, future }) => ({
      key: future ? ProficiencyBadgeMessage.Future : ProficiencyBadgeMessage.Source,
      params: { rank: PROFICIENCY_NAMES[rank], source, level },
      future,
    })),
  );
}
