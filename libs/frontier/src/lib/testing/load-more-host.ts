import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AsyncPending } from '../async/async-region/async-pending.directive';
import { LoadMoreItem } from '../async/load-more/load-more-item.directive';
import { LoadMore } from '../async/load-more/load-more.component';
import { Skeleton } from '../feedback/skeleton/skeleton.component';
import { ListItem } from '../list/list-item/list-item.component';
import { List } from '../list/list/list.component';
import { Text } from '../text/text/text.component';
import type { FakeInfiniteQuery } from './fake-infinite-query';

/** An `fr-load-more` over a list of the query's strings, with a skeleton row pending slot, the way a feature fills it. */
@Component({
  selector: 'fr-load-more-host',
  imports: [AsyncPending, List, ListItem, LoadMore, LoadMoreItem, Skeleton, Text],
  templateUrl: './load-more-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadMoreHost {
  public readonly query = input.required<FakeInfiniteQuery<string>>();
  public readonly label = input<string | undefined>(undefined);
  public readonly errorMessage = input<string | undefined>(undefined);
}
