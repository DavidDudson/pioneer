import { contentPackId, effectiveLicense, isLegacyLicense } from '@pioneer/rules/sdk';
import type { ContentId, ContentLicense, ContentPack, ContentPackId } from '@pioneer/rules/sdk';

import type { Replacement } from './grant-entry';

/** What a lookup holds entries back by: the packs unsupported for the character, and whether it has legacy content on. */
export interface LookupState {
  readonly unsupported: ReadonlySet<ContentPackId>;
  readonly legacyContent: boolean;
  /** The remaster entries in force that replace each legacy entry, worked out when the first entry is converted. */
  readonly replacements: () => ReadonlyMap<ContentId, readonly Replacement[]>;
}

/** Whether the entry is held back: its pack is unsupported, or it is legacy content and the character has none on. */
export function isHeldBack(
  entry: { readonly license?: ContentLicense | undefined },
  pack: ContentPack,
  state: LookupState,
): boolean {
  const legacy = isLegacyLicense(effectiveLicense(entry, pack.manifest));
  return state.unsupported.has(contentPackId(pack.id)) || (legacy && !state.legacyContent);
}
