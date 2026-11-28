import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import { AsyncData } from '../async/async-region/async-data.directive';
import { AsyncEmpty } from '../async/async-region/async-empty.directive';
import type { AsyncQuery } from '../async/async-region/async-query';
import { Section } from '../layout/section/section.component';
import { Text } from '../text/text/text.component';

/** An async `fr-section` listing the query's strings, with a custom empty slot when `customEmpty` is set. */
@Component({
  selector: 'fr-async-section-host',
  imports: [AsyncData, AsyncEmpty, Section, Text],
  templateUrl: './async-section-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsyncSectionHost {
  public readonly query = input.required<AsyncQuery<ReadonlyArray<string>>>();
  public readonly filtered = input(false);
  public readonly customEmpty = input(false);
  public readonly clearCount = signal(0);
  protected readonly emptyText = 'Nobody yet';

  protected clear(): void {
    this.clearCount.update((count) => count + 1);
  }
}
