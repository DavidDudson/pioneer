import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, List, ListItem, Stack, Text } from '@pioneer/frontier';
import { LineStatusKind } from '@pioneer/rules/engine';
import type { ContentId } from '@pioneer/rules/sdk';

import { OriginChainView } from '../../origin-chain/origin-chain.component';
import { NO_ORIGIN_NAMES } from '../../origin-chain/origin-names';
import type { OriginNames } from '../../origin-chain/origin-names';
import { LINE_STATUS_MESSAGES, LINE_STATUS_TONES } from '../breakdown-messages';
import type { ShownLine } from '../shown-breakdown';

/** A statistic's modifier lines, already worded: name and value, then a status badge and detail when it has them. */
@Component({
  selector: 'pio-breakdown-lines',
  imports: [Badge, List, ListItem, OriginChainView, Stack, Text, TranslocoPipe],
  templateUrl: './breakdown-lines.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreakdownLines {
  public readonly lines = input.required<readonly ShownLine[]>();
  /** Display names of the entries the lines' origins name. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly names = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly STATUS_MESSAGES = LINE_STATUS_MESSAGES;
  protected readonly STATUS_TONES = LINE_STATUS_TONES;
  /** Lines that count for nothing now read muted, beside their badge. */
  protected readonly MUTED: ReadonlySet<LineStatusKind> = new Set([
    LineStatusKind.Suppressed,
    LineStatusKind.Inactive,
    LineStatusKind.Failed,
  ]);
}
