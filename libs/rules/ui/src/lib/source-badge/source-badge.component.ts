import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideBookOpen } from '@lucide/angular';
import {
  Badge,
  BadgeTone,
  Button,
  ButtonVariant,
  HoverCard,
  HoverCardContent,
  Link,
  LocaleFormat,
  Stack,
  Text,
} from '@pioneer/frontier';
import {
  BOOK_TITLES,
  LICENSE_LABELS,
  PRODUCT_LINE_LABELS,
  PUBLISHER_LABELS,
  SourceKind,
  sourceType,
} from '@pioneer/rules/sdk';
import type { Book, ContentLicense, SourceRef } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { SOURCE_TYPE_MESSAGES, SourceBadgeMessage } from './source-badge-messages';
import { SOURCE_TONES } from './source-badge-tones';

export const SourceBadgeMode = {
  /** The book icon alone; everything else is in the popover. */
  Compact: 'compact',
  /** The icon, the book's name and its year. */
  Expanded: 'expanded',
} as const;
export type SourceBadgeMode = ValueOf<typeof SourceBadgeMode>;

/** A message key and its params. */
interface Phrase {
  readonly key: string;
  readonly params: Readonly<Record<string, string>>;
}

/** One line of the popover: a label key, and a message key or a text for its value. */
interface DetailRow {
  readonly label: string;
  readonly key?: string;
  readonly text?: string;
}

/** A link of the popover, to another site. */
interface DetailLink {
  readonly url: string;
  readonly label: string;
}

const phrase = (key: string, params: Readonly<Record<string, string>> = {}): Phrase => ({ key, params });

const row = (label: string, text: string | undefined): readonly DetailRow[] =>
  text === undefined ? [] : [{ label, text }];

const keyRow = (label: string, key: string | undefined): readonly DetailRow[] =>
  key === undefined ? [] : [{ label, key }];

/** The page a web or homebrew source links to, when it has one. */
function pageOf(source: SourceRef): string | undefined {
  return source.kind === SourceKind.Book ? undefined : source.url;
}

/**
 * Where an entry comes from, as a badge: a book icon alone (`compact`) or with the book's name and year (`expanded`).
 * The colour says what kind of source it is, the hue by product line and the fill by edition; the popover says the
 * same in words and gives the book's details and links to Archives of Nethys and the Paizo Store. Presentational
 * (ADR-0028): the caller resolves the book from the registry and passes the entry's effective licence.
 *
 * ```html
 * <pio-source [source]="entry.source" [book]="book" [license]="license" mode="expanded" />
 * ```
 */
@Component({
  selector: 'pio-source',
  imports: [Badge, Button, HoverCard, HoverCardContent, Link, Stack, Text, TranslocoPipe],
  templateUrl: './source-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourceBadge {
  public readonly source = input.required<SourceRef>();
  /** The book `source` names, from the registry; `undefined` for a source that is not a book or a book it lacks. */
  public readonly book = input<Book | undefined>(undefined);
  /** The licence of the entry that cites the source, which makes OGL content in a remaster book legacy. */
  public readonly license = input.required<ContentLicense>();
  public readonly mode = input<SourceBadgeMode>(SourceBadgeMode.Compact);
  /** The name of a homebrew pack; its id when absent. */
  public readonly packName = input<string | undefined>(undefined);

  readonly #format = inject(LocaleFormat);
  protected readonly Message = SourceBadgeMessage;
  protected readonly Variant = ButtonVariant;
  protected readonly BadgeTone = BadgeTone;
  protected readonly icon = LucideBookOpen;

  protected readonly type = computed(() =>
    sourceType({ source: this.source(), book: this.book(), license: this.license() }),
  );
  protected readonly tone = computed(() => SOURCE_TONES[this.type()]);
  protected readonly typeKey = computed(() => SOURCE_TYPE_MESSAGES[this.type()]);
  protected readonly expanded = computed(() => this.mode() === SourceBadgeMode.Expanded);
  protected readonly year = computed(() => this.book()?.released?.year.toString());

  /** The book's title, or what stands in for it: the id of a book the registry lacks, a pack, a page. */
  protected readonly heading = computed((): Phrase => {
    const source = this.source();
    if (source.kind === SourceKind.Web) {
      return phrase(SourceBadgeMessage.Web, { title: source.title ?? new URL(source.url).host });
    }
    if (source.kind === SourceKind.Homebrew) {
      return phrase(SourceBadgeMessage.Homebrew, { pack: this.packName() ?? source.pack });
    }
    const title = BOOK_TITLES.get(source.book);
    return title === undefined ? phrase(SourceBadgeMessage.UnregisteredBook, { book: source.book }) : phrase(title);
  });

  protected readonly rows = computed((): readonly DetailRow[] => {
    const book = this.book();
    const source = this.source();
    if (book === undefined) {
      return [];
    }
    const released = book.released?.toLocaleString(this.#format.locale(), { dateStyle: 'medium' });
    return [
      ...keyRow(
        SourceBadgeMessage.ProductLine,
        book.productLine === undefined ? undefined : PRODUCT_LINE_LABELS[book.productLine],
      ),
      ...row(SourceBadgeMessage.Authors, book.authors),
      ...keyRow(SourceBadgeMessage.Publisher, PUBLISHER_LABELS[book.publisher]),
      ...keyRow(SourceBadgeMessage.License, LICENSE_LABELS[book.license]),
      ...row(SourceBadgeMessage.Released, released),
      ...row(SourceBadgeMessage.Errata, book.errata),
      ...row(SourceBadgeMessage.FoundryVersion, book.foundryVersion),
      ...(source.kind === SourceKind.Book && source.page !== undefined
        ? row(SourceBadgeMessage.Page, this.#format.number(source.page))
        : []),
    ];
  });

  protected readonly links = computed((): readonly DetailLink[] => {
    const source = this.source();
    const book = this.book();
    const entry = source.kind === SourceKind.Book ? source.aon : undefined;
    const aon = entry ?? book?.aonSourceUrl;
    const web = pageOf(source);
    return [
      ...(aon === undefined ? [] : [{ url: aon, label: SourceBadgeMessage.Aon }]),
      ...(book?.storeUrl === undefined ? [] : [{ url: book.storeUrl, label: SourceBadgeMessage.Store }]),
      ...(web === undefined ? [] : [{ url: web, label: SourceBadgeMessage.Open }]),
    ];
  });
}
