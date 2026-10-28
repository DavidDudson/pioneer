import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Badge, List, ListItem, Stack, Text } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';

import { OriginChainView } from '../../origin-chain/origin-chain.component';
import { NO_ORIGIN_NAMES } from '../../origin-chain/origin-names';
import type { OriginNames } from '../../origin-chain/origin-names';
import type { ShownSense } from '../shown-senses';

/** Senses already worded, one row each with a badge when a battle form gives it and where it comes from. */
@Component({
  selector: 'pio-sense-list',
  imports: [Badge, List, ListItem, OriginChainView, Stack, Text],
  templateUrl: './sense-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SenseList {
  public readonly senses = input.required<readonly ShownSense[]>();
  /** Display names of the entries the origins name. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly names = input<OriginNames>(NO_ORIGIN_NAMES);
}
