import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  InventoryItemId,
  inventoryViolations,
  itemContent,
  partitionApproved,
  RuleBreak,
  runeContent,
} from '@pioneer/character/domain';
import type { AcknowledgeItemBody, ItemAcknowledgementId } from '@pioneer/character/domain';
import { AsyncButton, Stack } from '@pioneer/frontier';

import { CharacterRuleLimitStore } from '../../../data/character-rule-limit-store';
import { CharacterStore } from '../../../data/character-store';
import { injectContentRegistry } from '../../../data/content-registry-query';
import { INVENTORY_CONTENT_KINDS } from '../sheet-inventory';

/**
 * Acknowledge, beside an item's edits, for a character outside a campaign: it has no GM to approve a rule-breaking item,
 * so its owner silences the warning instead (ADR-0064). The acknowledgement holds for the count the item breaks the
 * rule by now, so the warning returns if the item grows. An acknowledged item is offered taking it back. Nothing in a
 * campaign, whose GM approves, or for an item that breaks no rule.
 */
@Component({
  selector: 'pio-item-acknowledge',
  imports: [AsyncButton, Stack, TranslocoPipe],
  templateUrl: './item-acknowledge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemAcknowledge {
  /** The inventory item's id, as the line carries it. */
  public readonly id = input.required({ transform: (id: string): InventoryItemId => InventoryItemId.parse(id) });
  /** The name the line shows, for the label. */
  public readonly name = input.required<string>();

  readonly #store = inject(CharacterStore);
  readonly #rules = inject(CharacterRuleLimitStore);
  readonly #items = injectContentRegistry(INVENTORY_CONTENT_KINDS);

  /** Whether the owner may acknowledge here: only outside a campaign. */
  protected readonly acknowledgeable: Signal<boolean> = computed(
    (): boolean => this.#rules.rules().acknowledgeable === true,
  );

  /** The rules the item breaks that no acknowledgement covers. */
  protected readonly open: Signal<readonly AcknowledgeItemBody[]> = computed((): readonly AcknowledgeItemBody[] => {
    const registry = this.#items.data();
    const character = this.#store.selected();
    if (!this.acknowledgeable() || registry === undefined || character === undefined) {
      return [];
    }
    const { limits, approvals } = this.#rules.rules();
    const content = { items: itemContent(registry), runes: runeContent(registry) };
    const { open } = partitionApproved(inventoryViolations(character.document.inventory, content, limits), approvals);
    return open
      .filter((violation) => violation.item === this.id())
      .map((violation) => ({
        item: violation.item,
        rule: violation.rule,
        rune: violation.rule === RuleBreak.RuneNotAllowed ? violation.rune : undefined,
      }));
  });

  /** The acknowledgements the owner made for the item. */
  protected readonly acknowledged: Signal<readonly ItemAcknowledgementId[]> = computed(
    (): readonly ItemAcknowledgementId[] =>
      this.acknowledgeable()
        ? this.#rules
            .rules()
            .approvals.filter((approval) => approval.item === this.id())
            .flatMap((approval) => (approval.acknowledgement === undefined ? [] : [approval.acknowledgement]))
        : [],
  );

  protected readonly acknowledge = async (): Promise<void> => {
    await Promise.all(this.open().map(async (target): Promise<void> => this.#rules.acknowledge(target)));
  };

  protected readonly revoke = async (): Promise<void> => {
    await Promise.all(
      this.acknowledged().map(async (acknowledgement): Promise<void> => this.#rules.revoke(acknowledgement)),
    );
  };
}
