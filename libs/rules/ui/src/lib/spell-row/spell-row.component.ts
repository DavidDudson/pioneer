import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, HoverCard, HoverCardContent, Link, Stack, StackAlign, Text } from '@pioneer/frontier';

import type { UsableLine } from '../actions/action-user';
import { UseButtons } from '../actions/use-buttons.component';
import { ENTRY_PREVIEWS } from '../entry-preview/entry-preview';
import type { PanelLink } from '../entry-preview/entry-preview';
import { ChipList } from '../picker-cells/chip-list/chip-list.component';
import { INLINE_ROLLER } from '../rich-text/inline-roller';
import type { SpellDetailLine, SpellEffectLine } from '../spell-list/spell-detail-line';
import { SpellDetails } from '../spell-list/spell-details.component';
import { SpellListMessage } from '../spell-list/spell-list-messages';

/** The cantrip badge: a cantrip is shown as one, whatever rank it is cast at. */
const CANTRIP_TAG = SpellListMessage.TagCantrip;

/**
 * One spell of a list as a compact two-row item, like an action's row. The first row has the spell's name on the left,
 * and on the right a dice button for each part of its damage or healing and the cast button; the second has its rank (or
 * cantrip) and traits on the left and its source on the right. Hovering or focusing the name shows the spell's summary;
 * when the page has a side panel the name opens the spell there, and the buttons do not. The dice buttons show only on a
 * page that rolls (`INLINE_ROLLER`), the cast button only on one that spends (`ActionUser`).
 *
 * ```html
 * <pio-spell-row [spell]="line" [use]="line.use" />
 * ```
 */
@Component({
  selector: 'pio-spell-row',
  imports: [Button, ChipList, HoverCard, HoverCardContent, Link, SpellDetails, Stack, Text, TranslocoPipe, UseButtons],
  templateUrl: './spell-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpellRow {
  public readonly spell = input.required<SpellDetailLine>();
  /** What casting it spends, when the page lets it be cast. */
  public readonly use = input<UsableLine | undefined>();

  readonly #previews = inject(ENTRY_PREVIEWS);
  protected readonly roller = inject(INLINE_ROLLER, { optional: true });

  protected readonly Message = { Roll: SpellListMessage.Roll } as const;
  protected readonly Align = StackAlign;

  /** Where the name opens the spell in the page's side panel; none when the page has no panel. */
  protected readonly panel = computed((): PanelLink | undefined => this.#previews.panel?.(this.spell().id));

  /** The message that words its rank: a cantrip is a cantrip, whatever rank it is cast at. */
  protected readonly rankKey = computed((): string =>
    this.spell().tags.includes(CANTRIP_TAG) ? SpellListMessage.TagCantrip : SpellListMessage.Rank,
  );

  /** Rolls the part as the sheet's damage roll, named for the spell. */
  protected roll({ roll }: SpellEffectLine): void {
    this.roller?.damage({ node: roll, label: this.spell().name });
  }
}
