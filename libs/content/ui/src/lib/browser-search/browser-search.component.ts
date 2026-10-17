import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { FilterChips, SearchInput, Stack } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import type { ContentKind } from '@pioneer/rules/sdk';

import type { ContentBrowserState } from '../browser-state';

const SearchMessage = {
  Kinds: 'contentBrowser.kinds.label',
  SearchLabel: 'contentBrowser.search.label',
} as const;

/** The words and the kinds of the browser: where a list starts. Picking either leaves any picked entry. */
@Component({
  selector: 'pio-browser-search',
  imports: [FilterChips, SearchInput, Stack, TranslocoPipe],
  templateUrl: './browser-search.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrowserSearch {
  public readonly state = model.required<ContentBrowserState>();
  /** The kinds on offer, named in the UI language. */
  public readonly kindOptions = input.required<readonly SelectOption<ContentKind>[]>();

  protected readonly Message = SearchMessage;
  protected readonly kindSet: Signal<ReadonlySet<ContentKind>> = computed(() => new Set(this.state().kinds));

  protected searched(query: string): void {
    this.state.update((state) => ({ ...state, query, selected: undefined }));
  }

  protected pickKinds(picked: ReadonlySet<ContentKind>): void {
    const kinds = this.kindOptions()
      .map((option) => option.value)
      .filter((kind) => picked.has(kind));
    this.state.update((state) => ({ ...state, kinds, selected: undefined }));
  }
}
