/**
 * Reads a book's Sources page on Archives of Nethys (ADR-0071): one `<h2 class="title">Spells [537]</h2>` heading per
 * entry type, then a link per entry. Only the name and the entry's URL are kept; the page's prose and ordering are
 * not. Links that are not one entry (the `AonUrl` shape) are returned apart so the run can report them.
 */
import { AonUrl } from '@pioneer/rules/sdk';

const ORIGIN = 'https://2e.aonprd.com/';
const SECTION = /<h2 class="title">(?<heading>[^<[]+?)\s*\[\d+\]<\/h2>(?<body>[\s\S]*?)(?=<h2 class="title">|$)/gu;
const LINK = /<a href="(?<href>[A-Za-z]+\.aspx\?[^"]*)">(?<name>[^<]+)<\/a>/gu;
const ENTITY = /&(?<body>#x[\da-f]+|#\d+|[a-z]+);/giu;
const ENTITIES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** One entry in a book's listing. */
export interface ListedEntry {
  readonly type: string;
  readonly name: string;
  readonly url: AonUrl;
}

/** What a Sources page held: the entries with a usable URL, and the links that were not one entry. */
export interface SourcesListing {
  readonly entries: readonly ListedEntry[];
  readonly skipped: readonly string[];
}

/** The character a numeric or named entity stands for; an unknown name stays as written. */
function entity(whole: string, body: string): string {
  if (body.startsWith('#x')) {
    return String.fromCodePoint(Number(`0${body.slice(1)}`));
  }
  if (body.startsWith('#')) {
    const code = Math.trunc(Number(body.slice(1)));
    return String.fromCodePoint(code);
  }
  return ENTITIES[body] ?? whole;
}

function decode(text: string): string {
  return text.replaceAll(ENTITY, entity);
}

export function parseSources(html: string): SourcesListing {
  const entries: ListedEntry[] = [];
  const skipped: string[] = [];
  for (const { groups: section } of html.matchAll(SECTION)) {
    for (const { groups: link } of (section?.['body'] ?? '').matchAll(LINK)) {
      const href = link?.['href'] ?? '';
      const name = link?.['name'] ?? '';
      const heading = section?.['heading'] ?? '';
      const url = AonUrl.safeParse(`${ORIGIN}${decode(href)}`);
      if (url.success) {
        entries.push({ type: decode(heading), name: decode(name), url: url.data });
      } else {
        skipped.push(`${ORIGIN}${decode(href)}`);
      }
    }
  }
  return { entries, skipped };
}
