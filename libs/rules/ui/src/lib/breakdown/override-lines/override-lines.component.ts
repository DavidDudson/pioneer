import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, List, ListItem, Stack, Text } from '@pioneer/frontier';
import { OverrideStatusKind } from '@pioneer/rules/engine';
import type { ContentId } from '@pioneer/rules/sdk';

import { OriginChainView } from '../../origin-chain/origin-chain.component';
import { NO_ORIGIN_NAMES } from '../../origin-chain/origin-names';
import type { OriginNames } from '../../origin-chain/origin-names';
import { BreakdownMessage, OVERRIDE_STATUS_MESSAGES, OVERRIDE_STATUS_TONES } from '../breakdown-messages';
import type { ShownOverride } from '../shown-breakdown';

/**
 * A statistic's `Change`s and set overrides under their caption, already worded, in the order they ran; nothing
 * when it has none. Each reads as its name and what it did, a badge when a user set it by hand, then a status
 * badge and detail when it did not simply apply.
 */
@Component({
  selector: 'pio-override-lines',
  imports: [Badge, List, ListItem, OriginChainView, Stack, Text, TranslocoPipe],
  templateUrl: './override-lines.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverrideLines {
  public readonly lines = input.required<readonly ShownOverride[]>();
  /** Display names of the entries the lines' origins name. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly names = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly Overrides = BreakdownMessage.Overrides;
  protected readonly SetByHand = BreakdownMessage.SetByHand;
  protected readonly STATUS_MESSAGES = OVERRIDE_STATUS_MESSAGES;
  protected readonly STATUS_TONES = OVERRIDE_STATUS_TONES;
  /** Lines that left the value as it was read muted, beside their badge. */
  protected readonly MUTED: ReadonlySet<OverrideStatusKind> = new Set([
    OverrideStatusKind.Replaced,
    OverrideStatusKind.Inactive,
    OverrideStatusKind.Failed,
  ]);
}
