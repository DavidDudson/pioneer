import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import type { Params } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ContentEntryView } from '@pioneer/content/ui';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Button,
  HeadingLevel,
  Link,
  Page,
  PageBody,
  PageHeader,
  Skeleton,
  Stack,
} from '@pioneer/frontier';
import { TableViewKey } from '@pioneer/frontier/data';
import type { ContentEntry, ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { ENTRY_PREVIEWS, RICH_TEXT_LINKS } from '@pioneer/rules/ui';
import type { EntryPreview, EntryPreviews, RichTextLinks } from '@pioneer/rules/ui';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

import { KIND_PARAM } from '../browser/browse-kinds';
import { originOf } from '../panel/open-in-browser';
import { injectEntryDescription } from './entry-description';
import { entryCard, entryIndex, entryLinks, entryPreviews, findEntry, kindOfParam } from './entry-lookup';
import { injectEntryRegistry } from './entry-registry';
import { storeLinks } from './entry-sources';

const EntryMessage = {
  Title: 'content.page.title',
  Back: 'content.entry.back',
  BackToOrigin: 'content.entry.backToOrigin',
  LoadError: 'content.entry.loadError',
} as const;

/** Placeholder rows while the entries load. */
const LOADING_ROWS = ['first', 'second', 'third'];

/**
 * One entry of the public content browser, at `/content/:kind/:slug` (content-model.md, "Content browser"): its name,
 * level, traits, description and where it comes from. A reference in the description links to the entry it names.
 * The URL is the entry's, so it can be shared and survives a reload. Until the description bundle loads, the entry's
 * summary stands in for it.
 */
@Component({
  selector: 'pio-content-entry-page',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Button,
    ContentEntryView,
    Link,
    Page,
    PageBody,
    PageHeader,
    Skeleton,
    Stack,
    TranslocoPipe,
  ],
  templateUrl: './entry-page.component.html',
  providers: [
    { provide: RICH_TEXT_LINKS, useFactory: (): RichTextLinks => inject(EntryPage).links },
    { provide: ENTRY_PREVIEWS, useFactory: (): EntryPreviews => inject(EntryPage).previews },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryPage {
  readonly #params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });

  protected readonly Message = EntryMessage;
  protected readonly loadingRows = LOADING_ROWS;

  readonly #kind: Signal<ContentKind | undefined> = computed(() => kindOfParam(this.#params().get('kind')));

  /** The entry's kind with the ones its text refers to, so a reference can be named and linked. */
  protected readonly registry: CreateQueryResult<ContentRegistry> = injectEntryRegistry(() => this.#kind());

  readonly #index = computed(() => {
    const registry = this.registry.data();
    return registry === undefined ? undefined : entryIndex(registry);
  });
  public readonly links: RichTextLinks = entryLinks(() => this.#index());
  /** What a reference in the description previews on hover and focus. */
  public readonly previews: EntryPreviews = entryPreviews(() => this.#index());

  /** The entry the link names, or `undefined` once the registry is loaded without it. */
  protected readonly entry: Signal<ContentEntry | undefined> = computed(() => {
    const kind = this.#kind();
    const registry = this.registry.data();
    return kind === undefined || registry === undefined
      ? undefined
      : findEntry(registry, kind, this.#params().get('slug'));
  });

  readonly #description = injectEntryDescription(() => this.entry());

  protected readonly card: Signal<EntryPreview | undefined> = computed(() => {
    const entry = this.entry();
    return entry === undefined ? undefined : entryCard(entry, this.#description.data());
  });
  protected readonly stores = computed(() => {
    const entry = this.entry();
    return entry === undefined ? [] : storeLinks(entry);
  });

  readonly #router = inject(Router);
  readonly #query = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });

  protected readonly browse: readonly string[] = ['/content'];
  /** The kind and words the entry was opened from, so the list is as it was left. */
  protected readonly browseParams = computed((): Params => {
    const query = this.#query();
    return {
      [KIND_PARAM]: query.get(KIND_PARAM) ?? undefined,
      [TableViewKey.Search]: query.get(TableViewKey.Search) ?? undefined,
    };
  });
  /** The page this one was opened from, when it was the sheet's side panel. */
  protected readonly origin = originOf(inject(Location).getState());
  protected readonly headingLevel = HeadingLevel.Two;

  protected async backToOrigin(): Promise<void> {
    if (this.origin !== undefined) {
      await this.#router.navigateByUrl(this.origin);
    }
  }
}
