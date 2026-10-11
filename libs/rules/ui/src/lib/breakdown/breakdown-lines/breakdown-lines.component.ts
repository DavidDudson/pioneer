import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, List, ListItem, Stack, Text } from '@pioneer/frontier';
import { LineStatusKind } from '@pioneer/rules/engine';

import { LINE_STATUS_MESSAGES, LINE_STATUS_TONES } from '../breakdown-messages';
import type { ShownLine } from '../shown-breakdown';

/** A statistic's modifier lines, already worded: name and value, then a status badge and detail when it has them. */
@Component({
  selector: 'pio-breakdown-lines',
  imports: [Badge, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './breakdown-lines.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreakdownLines {
  public readonly lines = input.required<readonly ShownLine[]>();

  protected readonly STATUS_MESSAGES = LINE_STATUS_MESSAGES;
  protected readonly STATUS_TONES = LINE_STATUS_TONES;
  /** Lines that count for nothing now read muted, beside their badge. */
  protected readonly MUTED: ReadonlySet<LineStatusKind> = new Set([
    LineStatusKind.Suppressed,
    LineStatusKind.Inactive,
    LineStatusKind.Failed,
  ]);
}
