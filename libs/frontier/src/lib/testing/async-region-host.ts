import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AsyncData } from '../async/async-region/async-data.directive';
import { AsyncError } from '../async/async-region/async-error.directive';
import { AsyncPending } from '../async/async-region/async-pending.directive';
import type { AsyncQuery } from '../async/async-region/async-query';
import { AsyncRegion } from '../async/async-region/async-region.component';
import { Skeleton } from '../feedback/skeleton/skeleton.component';
import { Stack } from '../layout/stack/stack.component';
import { Text } from '../text/text/text.component';

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * An `fr-async-region` with a skeleton pending slot and a data slot that lists the query's strings in a stack, the way a
 * feature fills it, plus an error slot showing the error's message when `customError` is set.
 */
@Component({
  selector: 'fr-async-region-host',
  imports: [AsyncData, AsyncError, AsyncPending, AsyncRegion, Skeleton, Stack, Text],
  templateUrl: './async-region-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsyncRegionHost {
  public readonly query = input.required<AsyncQuery<readonly string[]>>();
  public readonly errorMessage = input<string | undefined>(undefined);
  public readonly customError = input(false);

  protected readonly describe = describeError;
}
