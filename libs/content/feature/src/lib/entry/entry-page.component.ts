import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ContentEntryView } from '@pioneer/content/ui';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  HeadingLevel,
  Link,
  Page,
  PageBody,
  PageHeader,
  Skeleton,
  Stack,
} from '@pioneer/frontier';
import { ContentLoader } from '@pioneer/rules/data-access';
import type { ContentEntry, ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { RICH_TEXT_LINKS } from '@pioneer/rules/ui';
import type { EntryPreview, RichTextLinks } from '@pioneer/rules/ui';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

import { injectEntryDescription } from './entry-description';
import { entryCard, entryIndex, entryKinds, entryLinks, findEntry, kindOfParam } from './entry-lookup';

const EntryMessage = {
  Title: 'content.page.title',
  Back: 'content.entry.back',
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
  providers: [{ provide: RICH_TEXT_LINKS, useFactory: (): RichTextLinks => inject(EntryPage).links }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryPage {
  readonly #loader = inject(ContentLoader);
  readonly #params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });

  protected readonly Message = EntryMessage;
  protected readonly loadingRows = LOADING_ROWS;

  readonly #kind: Signal<ContentKind | undefined> = computed(() => kindOfParam(this.#params().get('kind')));

  /** The entry's kind with the ones its text refers to, so a reference can be named and linked; none for a link with no kind. */
  protected readonly registry: CreateQueryResult<ContentRegistry> = injectQuery(() => {
    const kind = this.#kind();
    return {
      queryKey: ['content', 'entry', kind],
      queryFn: async (): Promise<ContentRegistry> => this.#loader.registry(kind === undefined ? [] : entryKinds(kind)),
      staleTime: Number.POSITIVE_INFINITY,
    };
  });

  readonly #index = computed(() => {
    const registry = this.registry.data();
    return registry === undefined ? undefined : entryIndex(registry);
  });
  public readonly links: RichTextLinks = entryLinks(() => this.#index());

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

  protected readonly browse: readonly string[] = ['/content'];
  protected readonly headingLevel = HeadingLevel.Two;
}
