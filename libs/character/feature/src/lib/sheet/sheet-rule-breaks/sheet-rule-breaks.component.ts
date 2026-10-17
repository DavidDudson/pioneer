import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { inventoryViolations, itemContent, runeContent } from '@pioneer/character/domain';
import { BadgeTone, Tag } from '@pioneer/frontier';

import { CharacterRuleLimitStore } from '../../data/character-rule-limit-store';
import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { INVENTORY_CONTENT_KINDS } from '../inventory/sheet-inventory';
import { ruleBreakingCount } from '../inventory/sheet-violations';

/**
 * How many of the open character's items break the table's rules, for the sheet header: a warning when there are any,
 * nothing when there are none. Worked out on every read from the inventory and the loaded item kinds.
 */
@Component({
  selector: 'pio-sheet-rule-breaks',
  imports: [Tag, TranslocoPipe],
  templateUrl: './sheet-rule-breaks.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetRuleBreaks {
  readonly #store = inject(CharacterStore);
  readonly #items = injectContentRegistry(INVENTORY_CONTENT_KINDS);
  readonly #limits = inject(CharacterRuleLimitStore);
  protected readonly Tone = BadgeTone;
  /** The items past a limit; none while the item kinds load. */
  protected readonly count: Signal<number> = computed(() => {
    const registry = this.#items.data();
    const character = this.#store.selected();
    return registry === undefined || character === undefined
      ? 0
      : ruleBreakingCount(
          inventoryViolations(
            character.document.inventory,
            { items: itemContent(registry), runes: runeContent(registry) },
            this.#limits.limits(),
          ),
        );
  });
}
