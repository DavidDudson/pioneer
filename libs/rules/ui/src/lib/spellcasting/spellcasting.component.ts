import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, EmptyState, Heading, List, ListItem, Skeleton, Stack, Text } from '@pioneer/frontier';
import type { SpellSlots } from '@pioneer/rules/engine';
import { SpellPreparation } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import { StatisticsView } from '../statistics/statistics.component';
import { SpellSlotsView } from './spell-slots/spell-slots.component';
import type { SpellcastingEntryLine } from './spellcasting-entry-line';
import { PREPARATION_MESSAGES, SpellcastingMessage, TRADITION_MESSAGES } from './spellcasting-messages';

const LOADING_ROWS = 2;

/** One block of slots an entry shows: its own, or one of its pools. */
interface SlotBlock {
  readonly key: string;
  readonly title: MessageDescriptor;
  readonly slots: SpellSlots;
}

/** An entry with the blocks of slots it shows. */
interface EntryRow {
  readonly entry: SpellcastingEntryLine;
  readonly slots: readonly SlotBlock[];
}

/** The own slots and pools an entry shows; none for a focus entry, which casts with Focus Points. */
function slotBlocks(entry: SpellcastingEntryLine): readonly SlotBlock[] {
  if (entry.preparation === SpellPreparation.Focus) {
    return [];
  }
  const own: SlotBlock = { key: '', title: message(SpellcastingMessage.Slots), slots: entry.slots };
  return [
    own,
    ...entry.pools.map((pool): SlotBlock => ({
      key: pool.key,
      title: message(SpellcastingMessage.PoolSlots, { source: pool.source }),
      slots: pool.slots,
    })),
  ];
}

/**
 * A character's spellcasting entries (ADR-0040): each one's tradition, how it casts (prepared, spontaneous, innate or
 * focus) and where it came from ("from Wizard Spellcasting"), with its spell attack and spell DC, each expanding in
 * place to its breakdown as any statistic does, then its cantrips and spell slots per rank and any pools of slots kept
 * apart (ADR-0041): a divine font, a curriculum. A focus entry casts with Focus Points, so it shows no slots (ADR-0048).
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
  imports: [
    Badge,
    EmptyState,
    Heading,
    List,
    ListItem,
    Skeleton,
    SpellSlotsView,
    Stack,
    StatisticsView,
    Text,
    TranslocoPipe,
  ],
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
  protected readonly rows = computed((): readonly EntryRow[] | undefined =>
    this.entries()?.map((entry) => ({ entry, slots: slotBlocks(entry) })),
  );
  protected readonly loadingRows = Array.from({ length: LOADING_ROWS }, (_unused, index) => index);
}
