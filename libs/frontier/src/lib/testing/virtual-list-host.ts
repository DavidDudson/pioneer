import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { VirtualItem } from '../data/virtual-list/virtual-item.directive';
import { VirtualEstimate, VirtualList } from '../data/virtual-list/virtual-list.component';
import { Text } from '../text/text/text.component';
import { Space } from '../tokens';

/** An `fr-virtual-list` whose rows show each string and its index, the way a feature fills it. */
@Component({
  selector: 'fr-virtual-list-host',
  imports: [Text, VirtualItem, VirtualList],
  templateUrl: './virtual-list-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VirtualListHost {
  public readonly items = input.required<readonly string[]>();
  public readonly gap = input<Space>(Space.Md);
  public readonly estimate = input<VirtualEstimate>(VirtualEstimate.Md);
  public readonly itemKey = input<((item: string, index: number) => string) | undefined>(undefined);
}
