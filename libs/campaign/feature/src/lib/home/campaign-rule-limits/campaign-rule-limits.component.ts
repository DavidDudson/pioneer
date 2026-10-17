import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncData, AsyncPending, AsyncRegion, Heading, List, Skeleton, Stack, Surface, Text } from '@pioneer/frontier';

import { CampaignRuleLimitStore } from '../../data/campaign-rule-limit-store';
import { CampaignRuleLimitRow } from '../campaign-rule-limit-row/campaign-rule-limit-row.component';

/** Skeleton rows shown while the limits load. */
const PLACEHOLDERS = ['first', 'second', 'third', 'fourth'] as const;

/**
 * The table limits of the open campaign: invested items, hands, property runes per rune grade and lines in an
 * inventory. Every member reads them; the GM changes them, and the characters in the campaign are held to them.
 * Changing a limit never edits a character: only what its sheet flags changes (ADR-0064).
 */
@Component({
  selector: 'pio-campaign-rule-limits',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    CampaignRuleLimitRow,
    Heading,
    List,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './campaign-rule-limits.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignRuleLimitsPanel {
  protected readonly store = inject(CampaignRuleLimitStore);

  protected readonly placeholders = PLACEHOLDERS;
}
