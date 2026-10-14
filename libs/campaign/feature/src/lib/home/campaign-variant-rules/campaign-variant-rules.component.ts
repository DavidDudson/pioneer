import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideDices } from '@lucide/angular';
import type { CampaignVariantRules, VariantRuleOption } from '@pioneer/campaign/domain';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  EmptyState,
  Heading,
  List,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';

import { CampaignStore } from '../../data/campaign-store';
import { CampaignVariantRuleRow } from '../campaign-variant-rule-row/campaign-variant-rule-row.component';

/** Skeleton rows shown while the variant rules load. */
const PLACEHOLDERS = ['first', 'second'] as const;

/** A variant rule of the list and whether it is in force. */
interface VariantRuleLine {
  readonly rule: VariantRuleOption;
  readonly on: boolean;
}

/** Every variant rule the campaign can use, in name order, each with whether it is on. */
function variantRuleLines(rules: CampaignVariantRules): readonly VariantRuleLine[] {
  return [
    ...rules.enabled.map((rule): VariantRuleLine => ({ rule, on: true })),
    ...rules.available.map((rule): VariantRuleLine => ({ rule, on: false })),
  ].toSorted(
    (left, right) =>
      left.rule.name.localeCompare(right.rule.name) || left.rule.variantId.localeCompare(right.rule.variantId),
  );
}

/**
 * The variant rules of the packs the open campaign uses, each on or off. Every member reads the list; the GM turns one
 * on or off from it, and the characters in the campaign use the set. The list stays in name order as a variant rule
 * changes, so the focused button and its tick survive.
 */
@Component({
  selector: 'pio-campaign-variant-rules',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    CampaignVariantRuleRow,
    EmptyState,
    Heading,
    List,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './campaign-variant-rules.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignVariantRulesPanel {
  protected readonly store = inject(CampaignStore);

  protected readonly placeholders = PLACEHOLDERS;
  protected readonly emptyIcon = LucideDices;
  protected readonly linesOf = variantRuleLines;
}
