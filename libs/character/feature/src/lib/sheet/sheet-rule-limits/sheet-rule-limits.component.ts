import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncData, AsyncPending, AsyncRegion, List, Message, Skeleton, Stack } from '@pioneer/frontier';

import { CharacterRuleLimitSettingStore } from '../../data/character-rule-limit-setting-store';
import { SheetRuleLimitRow } from './sheet-rule-limit-row.component';

/** Skeleton rows shown while the limits load. */
const PLACEHOLDERS = ['first', 'second', 'third', 'fourth'] as const;

/**
 * The table limits the open character's inventory is held to: invested items, hands, property runes per rune grade and
 * lines in an inventory. A character outside campaigns has its owner set them, here; one in a campaign is held to the
 * campaign's, so the list is read-only and says which campaign decides (ADR-0064).
 */
@Component({
  selector: 'pio-sheet-rule-limits',
  imports: [AsyncData, AsyncPending, AsyncRegion, List, Message, SheetRuleLimitRow, Skeleton, Stack, TranslocoPipe],
  templateUrl: './sheet-rule-limits.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetRuleLimits {
  protected readonly store = inject(CharacterRuleLimitSettingStore);

  protected readonly placeholders = PLACEHOLDERS;
}
