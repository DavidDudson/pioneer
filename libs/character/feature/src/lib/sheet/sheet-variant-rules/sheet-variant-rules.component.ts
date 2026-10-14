import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideDices } from '@lucide/angular';
import type { CharacterVariantRules, VariantRuleOption } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, EmptyState, List, Message, Skeleton, Stack } from '@pioneer/frontier';

import { CharacterVariantStore } from '../../data/character-variant-store';
import { SheetVariantRuleRow } from './sheet-variant-rule-row.component';

/** Skeleton rows shown while the variant rules load. */
const PLACEHOLDERS = ['first', 'second'] as const;

/** A variant rule of the list and whether it is in force. */
interface VariantRuleLine {
  readonly rule: VariantRuleOption;
  readonly on: boolean;
}

/** Every variant rule the character can use, in name order, each with whether it is on. */
function variantRuleLines(rules: CharacterVariantRules): readonly VariantRuleLine[] {
  return [
    ...rules.enabled.map((rule): VariantRuleLine => ({ rule, on: true })),
    ...rules.available.map((rule): VariantRuleLine => ({ rule, on: false })),
  ].toSorted(
    (left, right) =>
      left.rule.name.localeCompare(right.rule.name) || left.rule.variantId.localeCompare(right.rule.variantId),
  );
}

/**
 * The variant rules of the packs the open character uses, each on or off. A character outside campaigns has its owner
 * turn them on, here; one in a campaign uses the campaign's, so the list is read-only and says which campaign decides.
 * The list stays in name order as a variant rule changes, so the focused button and its tick survive.
 */
@Component({
  selector: 'pio-sheet-variant-rules',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    EmptyState,
    List,
    Message,
    SheetVariantRuleRow,
    Skeleton,
    Stack,
    TranslocoPipe,
  ],
  templateUrl: './sheet-variant-rules.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetVariantRules {
  protected readonly store = inject(CharacterVariantStore);

  protected readonly placeholders = PLACEHOLDERS;
  protected readonly emptyIcon = LucideDices;

  protected readonly linesOf = variantRuleLines;
}
