/**
 * Reads the head of a book's Sources page on Archives of Nethys (ADR-0071): the `<b>Label</b> value` lines under the
 * title, of which Pioneer keeps the product line, the Paizo Store link, the latest errata and the release date. Anything
 * the page does not give, or gives in a shape Pioneer does not recognise, is left out.
 */
import { ErrataLabel, PaizoStoreUrl, ProductLine } from '@pioneer/rules/sdk';

const FIELD = /<b>(?<label>[^<]+)<\/b>\s*(?<value>[^<]*?)\s*(?=<br\s*\/?>|$)/gu;
const STORE_LINK = /<b>Product Page<\/b>\s*<u><a href="(?<href>[^"]+)"/u;
const DATE = /^(?<month>\d{1,2})\/(?<day>\d{1,2})\/(?<year>\d{4})$/u;
const ENTITY = /&(?<body>#x[\da-f]+|#\d+|[a-z]+);/giu;
const ENTITIES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** AoN's name for each product line. */
const PRODUCT_LINES: ReadonlyMap<string, ProductLine> = new Map([
  ['Rulebooks', ProductLine.Rulebooks],
  ['Lost Omens', ProductLine.LostOmens],
  ['Adventure Paths', ProductLine.AdventurePaths],
  ['Adventures', ProductLine.Adventures],
  ['Society', ProductLine.Society],
  ['Comics', ProductLine.Comics],
  ['April Fools', ProductLine.AprilFools],
  ['Blog Posts', ProductLine.BlogPosts],
]);

/** What a book's Sources page says about the book itself. */
export interface BookDetails {
  readonly productLine?: ProductLine;
  readonly storeUrl?: PaizoStoreUrl;
  readonly errata?: ErrataLabel;
  /** The release date as an ISO date (`2023-11-15`), which AoN writes month first. */
  readonly released?: string;
}

function decode(text: string): string {
  return text.replaceAll(ENTITY, (whole: string, body: string) => ENTITIES[body] ?? whole);
}

/** `11/15/2023` as `2023-11-15`; `undefined` for any other shape. */
function isoDate(text: string): string | undefined {
  const { month = '', day = '', year = '' } = DATE.exec(text)?.groups ?? {};
  return year === '' ? undefined : `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function parseBookDetails(html: string): BookDetails {
  const fields = new Map<string, string>();
  for (const { groups } of html.matchAll(FIELD)) {
    fields.set(groups?.['label'] ?? '', decode(groups?.['value'] ?? ''));
  }
  const line = PRODUCT_LINES.get(fields.get('Product Line') ?? '');
  const store = PaizoStoreUrl.safeParse(STORE_LINK.exec(html)?.groups?.['href']);
  const errata = ErrataLabel.safeParse(fields.get('Latest Errata'));
  const released = isoDate(fields.get('Release Date') ?? '');
  return {
    ...(line === undefined ? {} : { productLine: line }),
    ...(store.success ? { storeUrl: store.data } : {}),
    ...(errata.success ? { errata: errata.data } : {}),
    ...(released === undefined ? {} : { released }),
  };
}
