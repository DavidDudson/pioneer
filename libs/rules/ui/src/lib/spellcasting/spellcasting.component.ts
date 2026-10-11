import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, EmptyState, Heading, List, ListItem, Skeleton, Stack, Text } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';

import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import { StatisticsView } from '../statistics/statistics.component';
import type { SpellcastingEntryLine } from './spellcasting-entry-line';
import { PREPARATION_MESSAGES, SpellcastingMessage, TRADITION_MESSAGES } from './spellcasting-messages';

const LOADING_ROWS = 2;

/**
 * A character's spellcasting entries (ADR-0037): each one's tradition, how it casts (prepared, spontaneous or innate)
 * and where it came from ("from Wizard Spellcasting"), with its spell attack and spell DC, each expanding in place to
 * its breakdown as any statistic does.
 *
 * Read-only and presentational (ADR-0028): the caller works out the lines from the character's entries and the
 * engine's statistics, or passes undefined while they load, and the display names of the entries breakdown lines come
 * from.
 *
 * ```html
 * <pio-spellcasting [entries]="spellcasting()" [entryNames]="names()" />
 * ```
 */
@Component({
  selector: 'pio-spellcasting',
  imports: [Badge, EmptyState, Heading, List, ListItem, Skeleton, Stack, StatisticsView, Text, TranslocoPipe],
  templateUrl: './spellcasting.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpellcastingView {
  /** The entries in slug order, or undefined while they load. */
  public readonly entries = input<readonly SpellcastingEntryLine[] | undefined>();
  /** Display names of the entries the breakdown lines come from. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  /** Names for what the breakdown lines' origin chains refer to beyond entries. */
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly Message = SpellcastingMessage;
  protected readonly traditions = TRADITION_MESSAGES;
  protected readonly preparations = PREPARATION_MESSAGES;
  protected readonly loadingRows = Array.from({ length: LOADING_ROWS }, (_unused, index) => index);
}
