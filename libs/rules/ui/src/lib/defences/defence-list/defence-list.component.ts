import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, EmptyState, Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';
import { DefenceStatusKind } from '@pioneer/rules/engine';
import type { ContentId } from '@pioneer/rules/sdk';

import { OriginChainView } from '../../origin-chain/origin-chain.component';
import { NO_ORIGIN_NAMES } from '../../origin-chain/origin-names';
import type { OriginNames } from '../../origin-chain/origin-names';
import { DEFENCE_STATUS_MESSAGES, DEFENCE_STATUS_TONES } from '../defences-messages';
import type { ShownList } from '../shown-defences';

/** One list of the defences panel under its heading, already worded, or the empty state saying it has none. */
@Component({
  selector: 'pio-defence-list',
  imports: [Badge, EmptyState, Heading, List, ListItem, OriginChainView, Stack, Text, TranslocoPipe],
  templateUrl: './defence-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DefenceList {
  public readonly list = input.required<ShownList>();
  /** Display names of the entries the lines' origins name. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly names = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly STATUS_MESSAGES = DEFENCE_STATUS_MESSAGES;
  protected readonly STATUS_TONES = DEFENCE_STATUS_TONES;
  protected readonly Superseded = DefenceStatusKind.Superseded;
}
