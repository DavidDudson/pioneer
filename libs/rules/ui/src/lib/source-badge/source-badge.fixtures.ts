import { Book, ContentLicense, ProductLine, SourceRef } from '@pioneer/rules/sdk';

/** A registry book as the stories and specs need it; `remaster` picks the licence and edition. */
export function bookOf(id: string, productLine: ProductLine, remaster: boolean): Book {
  return Book.parse({
    id,
    publisher: 'paizo',
    license: remaster ? ContentLicense.Orc : ContentLicense.Ogl,
    remaster,
    released: remaster ? '2023-11-15' : '2019-08-01',
    aonSourceUrl: 'https://2e.aonprd.com/Sources.aspx?ID=216',
    productLine,
    storeUrl: 'https://store.paizo.com/pathfinder-player-core/',
    errata: 'Spring 2026, 1st Printing - 2/6/2026',
    foundryVersion: '8.6.0',
  });
}

export const PLAYER_CORE_SOURCE = SourceRef.parse({
  kind: 'book',
  book: 'player-core',
  page: 46,
  aon: 'https://2e.aonprd.com/Ancestries.aspx?ID=64',
});
export const PLAYER_CORE = bookOf('player-core', ProductLine.Rulebooks, true);

export const WEB_SOURCE = SourceRef.parse({ kind: 'web', url: 'https://paizo.com/errata', title: 'Remaster errata' });
