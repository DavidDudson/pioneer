import { InjectionToken } from '@angular/core';
import type { Provider } from '@angular/core';
import type { LinkTarget } from '@pioneer/frontier';
import type { ContentId, ContentText, Selector } from '@pioneer/rules/sdk';

/**
 * How rich text finds what its inline nodes point at. The page that shows the text knows its content, so it
 * provides these; without them a reference shows its own label and links nowhere.
 */
export interface RichTextLinks {
  /** The entry's name, for a reference with no label of its own. */
  readonly name: (id: ContentId) => ContentText | undefined;
  /** Where a reference opens the entry, when the page can show it. */
  readonly target: (id: ContentId) => LinkTarget | undefined;
  /** A statistic's name, for a check ("Athletics" for `skill:athletics`). */
  readonly statisticName: (selector: Selector) => ContentText | undefined;
}

const NO_LINKS: RichTextLinks = {
  name: (): undefined => undefined,
  target: (): undefined => undefined,
  statisticName: (): undefined => undefined,
};

export const RICH_TEXT_LINKS = new InjectionToken<RichTextLinks>('RICH_TEXT_LINKS', {
  factory: (): RichTextLinks => NO_LINKS,
});

/** Gives the rich text below a page its links and names. */
export function provideRichTextLinks(links: RichTextLinks): Provider {
  return { provide: RICH_TEXT_LINKS, useValue: links };
}
