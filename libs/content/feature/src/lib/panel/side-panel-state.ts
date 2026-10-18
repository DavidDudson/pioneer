import type { ContentEntryRef } from '@pioneer/content/ui';

import { BROWSE_KINDS } from '../browser/browse-kinds';

/** The query parameters the sheet's side panel keeps in the address, beside the drawer's own `drawer`. */
export const PanelParam = {
  /** The words searched for. */
  Query: 'sq',
  /** The entry being read, as `kind:name`. */
  Entry: 'se',
} as const;

const SEPARATOR = ':';

/** The entry `se` names, or `undefined` for a missing, malformed or unknown one. */
export function entryFromParam(text: string | undefined): ContentEntryRef | undefined {
  if (text === undefined) {
    return undefined;
  }
  const at = text.indexOf(SEPARATOR);
  const kind = BROWSE_KINDS.find((each) => each === text.slice(0, at));
  const name = text.slice(at + SEPARATOR.length);
  return at === -1 || kind === undefined || name === '' ? undefined : { kind, name };
}

/** The `se` value naming `entry`. */
export function entryToParam(entry: ContentEntryRef): string {
  return `${entry.kind}${SEPARATOR}${entry.name}`;
}

/** The drawer's own query parameter and the value it holds while open (`fr-drawer`). */
export const DRAWER_PARAM = 'drawer';
export const DRAWER_OPEN = 'open';
