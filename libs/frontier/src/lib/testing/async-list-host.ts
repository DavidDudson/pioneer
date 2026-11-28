import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import { AsyncItem } from '../async/async-list/async-item.directive';
import { AsyncList } from '../async/async-list/async-list.component';
import { AsyncEmpty } from '../async/async-region/async-empty.directive';
import { AsyncFilteredEmpty } from '../async/async-region/async-filtered-empty.directive';
import type { AsyncQuery } from '../async/async-region/async-query';
import { ListItem } from '../list/list-item/list-item.component';
import { Text } from '../text/text/text.component';

const DEFAULT_ROWS = 3;

/** An `fr-async-list` of strings the way a feature fills it, with custom empty slots when `customEmpty` is set. */
@Component({
  selector: 'fr-async-list-host',
  imports: [AsyncEmpty, AsyncFilteredEmpty, AsyncItem, AsyncList, ListItem, Text],
  templateUrl: './async-list-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsyncListHost {
  public readonly query = input.required<AsyncQuery<ReadonlyArray<string>>>();
  public readonly filtered = input(false);
  public readonly skeletonRows = input(DEFAULT_ROWS);
  public readonly customEmpty = input(false);
  public readonly clearCount = signal(0);
  protected readonly emptyText = 'Nobody yet';
  protected readonly filteredEmptyText = 'No one matches';

  protected clear(): void {
    this.clearCount.update((count) => count + 1);
  }
}
