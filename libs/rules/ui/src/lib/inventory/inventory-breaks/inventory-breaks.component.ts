import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone, Stack, Text } from '@pioneer/frontier';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { InventoryMessage } from '../inventory-messages';

/** A tag and the reasons it stands over. */
interface BreakGroup {
  readonly label: string;
  readonly tone: BadgeTone;
  readonly reasons: ReadonlyArray<MessageDescriptor>;
}

/**
 * Why an item breaks the table's rules: a warning tag, then one reason per rule it breaks, and for the reasons the
 * campaign's GM approved or the owner acknowledged, a tag saying so. Nothing for an item that breaks none.
 */
@Component({
  selector: 'pio-inventory-breaks',
  imports: [Badge, Stack, Text, TranslocoPipe],
  templateUrl: './inventory-breaks.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryBreaks {
  public readonly reasons = input.required<ReadonlyArray<MessageDescriptor>>();
  /** The reasons the campaign's GM approved, which no longer warn. */
  public readonly approved = input<ReadonlyArray<MessageDescriptor>>([]);
  /** The reasons the owner acknowledged on a character outside a campaign, which no longer warn. */
  public readonly acknowledged = input<ReadonlyArray<MessageDescriptor>>([]);

  /** The tags to show, each with its reasons, leaving out the ones with none. */
  protected readonly groups: Signal<ReadonlyArray<BreakGroup>> = computed((): ReadonlyArray<BreakGroup> =>
    [
      { label: InventoryMessage.RuleBreaking, tone: BadgeTone.Warning, reasons: this.reasons() },
      { label: InventoryMessage.ApprovedByGm, tone: BadgeTone.Info, reasons: this.approved() },
      { label: InventoryMessage.AcknowledgedByOwner, tone: BadgeTone.Info, reasons: this.acknowledged() },
    ].filter((group) => group.reasons.length > 0),
  );
}
