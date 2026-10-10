import { EXAMPLE_CONTENT_ENTRIES } from './content-entry-examples';

const JSON_INDENT = 2;

/** Every example entry, one per kind, as the list the filters tool opens on. */
export const EXAMPLE_FILTER_ENTRIES = JSON.stringify(Object.values(EXAMPLE_CONTENT_ENTRIES), undefined, JSON_INDENT);

/** The query the filters tool opens on: common and uncommon entries up to level 5, none with the `fire` trait. */
export const EXAMPLE_FILTER_QUERY = 'f.level=..5&f.rarity=common,uncommon&f.traits=!fire';
