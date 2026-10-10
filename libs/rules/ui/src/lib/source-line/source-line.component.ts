import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Link, LocaleFormat, Text } from '@pioneer/frontier';
import { BOOK_TITLES, SourceKind } from '@pioneer/rules/sdk';
import type { PackId, SourceRef } from '@pioneer/rules/sdk';
import type { UserId, ValueOf } from '@pioneer/shared/kernel';

import { SourceLineMessage } from './source-line-messages';

/** Glyphs between a source's parts; letter-free, so they need no message key. */
const PART_SEPARATOR = ' · ';
const SPACE = ' ';

const SegmentKind = {
  /** Text shown as it is: a title, a host, a pack name, a glyph. */
  Text: 'text',
  /** A message key and its params. */
  Message: 'message',
  /** A link to another site. */
  Link: 'link',
} as const;
type SegmentKind = ValueOf<typeof SegmentKind>;

interface TextSegment {
  readonly kind: typeof SegmentKind.Text;
  readonly text: string;
}

interface MessageSegment {
  readonly kind: typeof SegmentKind.Message;
  readonly key: string;
  readonly params: Readonly<Record<string, string>>;
}

/** A link's accessible name: a message whose `book` param is the book's title, itself a message. */
interface LinkLabel {
  readonly key: string;
  readonly book: MessageSegment;
  readonly page: string | undefined;
}

interface LinkSegment {
  readonly kind: typeof SegmentKind.Link;
  readonly url: string;
  readonly content: TextSegment | MessageSegment;
  readonly label: LinkLabel | undefined;
}

type Segment = TextSegment | MessageSegment | LinkSegment;

type BookSource = Extract<SourceRef, { readonly kind: typeof SourceKind.Book }>;
type WebSource = Extract<SourceRef, { readonly kind: typeof SourceKind.Web }>;
type HomebrewSource = Extract<SourceRef, { readonly kind: typeof SourceKind.Homebrew }>;

/** Display names the caller resolved for homebrew sources. */
interface HomebrewNames {
  readonly authors: ReadonlyMap<UserId, string>;
  readonly packs: ReadonlyMap<PackId, string>;
}

function text(value: string): TextSegment {
  return { kind: SegmentKind.Text, text: value };
}

function message(key: string, params: Readonly<Record<string, string>> = {}): MessageSegment {
  return { kind: SegmentKind.Message, key, params };
}

function link(url: string, content: TextSegment | MessageSegment, label?: LinkLabel): LinkSegment {
  return { kind: SegmentKind.Link, url, content, label };
}

/** "Player Core p. 46 · AoN": the registry's title (or the id, flagged), the page and the AoN entry. */
function bookSegments(source: BookSource, page: string | undefined): readonly Segment[] {
  const titleKey = BOOK_TITLES.get(source.book);
  const title =
    titleKey === undefined ? message(SourceLineMessage.UnregisteredBook, { book: source.book }) : message(titleKey);
  const segments: Segment[] = [title];
  if (page !== undefined) {
    segments.push(text(SPACE), message(SourceLineMessage.Page, { page }));
  }
  if (source.aon !== undefined) {
    const key = page === undefined ? SourceLineMessage.AonLabelNoPage : SourceLineMessage.AonLabel;
    segments.push(text(PART_SEPARATOR), link(source.aon, message(SourceLineMessage.Aon), { key, book: title, page }));
  }
  return segments;
}

/** The page's title, or its host when it has none, linked. */
function webSegments(source: WebSource): readonly Segment[] {
  return [link(source.url, text(source.title ?? new URL(source.url).host))];
}

/** "The Lost Lands by Ezren": the pack's name (or id), linked when the source has a URL, and its author. */
function homebrewSegments(source: HomebrewSource, names: HomebrewNames): readonly Segment[] {
  const pack = text(names.packs.get(source.pack) ?? source.pack);
  const author = names.authors.get(source.author);
  return [
    source.url === undefined ? pack : link(source.url, pack),
    text(SPACE),
    author === undefined ? message(SourceLineMessage.ByUnknownAuthor) : message(SourceLineMessage.ByAuthor, { author }),
  ];
}

/**
 * Where an entry comes from, on one line (ADR-0005): "Player Core p. 123 · AoN". Each source shows by kind: a book
 * by its title, page and AoN link; a web page by its title or host; a homebrew pack by its name and author. Sources
 * join in order. Presentational (ADR-0028): the caller resolves pack and author display names and passes them in;
 * a missing pack name shows the pack id, a missing author shows as unknown.
 *
 * ```html
 * <pio-source-line [sources]="entry.sources" [authorNames]="authors()" [packNames]="packs()" />
 * ```
 */
@Component({
  selector: 'pio-source-line',
  imports: [Link, Text, TranslocoPipe],
  templateUrl: './source-line.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourceLineView {
  public readonly sources = input.required<readonly SourceRef[]>();
  /** Display names of homebrew authors. */
  public readonly authorNames = input<ReadonlyMap<UserId, string>>(new Map());
  /** Display names of homebrew packs. */
  public readonly packNames = input<ReadonlyMap<PackId, string>>(new Map());

  readonly #format = inject(LocaleFormat);
  protected readonly SegmentKind = SegmentKind;

  /** The line as flat segments, separators included, so the template adds no whitespace of its own. */
  protected readonly segments = computed((): readonly Segment[] => {
    const names: HomebrewNames = { authors: this.authorNames(), packs: this.packNames() };
    const segments: Segment[] = [];
    for (const [index, source] of this.sources().entries()) {
      if (index > 0) {
        segments.push(message(SourceLineMessage.Separator));
      }
      segments.push(...this.#segments(source, names));
    }
    return segments;
  });

  #segments(source: SourceRef, names: HomebrewNames): readonly Segment[] {
    if (source.kind === SourceKind.Book) {
      return bookSegments(source, source.page === undefined ? undefined : this.#format.number(source.page));
    }
    if (source.kind === SourceKind.Web) {
      return webSegments(source);
    }
    return homebrewSegments(source, names);
  }
}
