import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { TemplateRef } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { Button } from '../../actions/button/button.component';
import { Alert } from '../../feedback/alert/alert.component';
import { EmptyStateTitle } from '../../feedback/empty-state/empty-state-title.component';
import { EmptyState } from '../../feedback/empty-state/empty-state.component';
import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { Stack } from '../../layout/stack/stack.component';
import type { AsyncQuery } from './async-query';

/** The default empty state's title, by whether a filter is active. */
const EMPTY_TITLE = { filtered: 'frontier.async.noMatches', plain: 'frontier.async.empty' } as const;

const DEFAULT_SKELETON_LINES: ReadonlyArray<number> = [0, 1, 2];

/** The query states shared by every async surface; the owner passes its slot templates down as inputs. */
@Component({
  selector: 'fr-async-view',
  imports: [Alert, Button, EmptyState, EmptyStateTitle, NgTemplateOutlet, Skeleton, Stack, TranslocoPipe],
  templateUrl: './async-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class AsyncView<TData> {
  public readonly query = input.required<AsyncQuery<TData>>();
  public readonly pendingTemplate = input<TemplateRef<unknown> | undefined>(undefined);
  public readonly dataTemplate = input.required<TemplateRef<unknown>>();
  public readonly errorTemplate = input<TemplateRef<unknown> | undefined>(undefined);
  public readonly emptyTemplate = input<TemplateRef<unknown> | undefined>(undefined);
  public readonly filteredEmptyTemplate = input<TemplateRef<unknown> | undefined>(undefined);
  public readonly errorMessage = input<string | undefined>(undefined);
  /** A filter or search is narrowing the data: nothing to show then is the filtered-empty state. */
  public readonly filtered = input(false, { transform: booleanAttribute });
  /** Show the empty and filtered-empty states. Off, an empty array renders through the data template. */
  public readonly detectEmpty = input(false, { transform: booleanAttribute });
  /** The default filtered-empty state's Clear button. */
  public readonly cleared = output();

  protected readonly lines = DEFAULT_SKELETON_LINES;
  protected readonly emptyStateTemplate = computed(() =>
    this.filtered() ? this.filteredEmptyTemplate() : this.emptyTemplate(),
  );
  protected readonly emptyTitle = computed(() => (this.filtered() ? EMPTY_TITLE.filtered : EMPTY_TITLE.plain));
  protected readonly pending = computed(() => this.query().isPending());
  protected readonly failed = computed(() => {
    const query = this.query();

    return query.isError() && query.isFetchNextPageError?.() !== true;
  });
  protected readonly error = computed(() => this.query().error());
  protected readonly value = computed(() => this.query().data());
  /** Loaded with nothing to show: an empty array, or no value. */
  protected readonly empty = computed(() => {
    const value = this.value();
    const hasNothing = Array.isArray(value) ? value.length === 0 : value === undefined || value === null;

    return this.detectEmpty() && hasNothing;
  });
}
