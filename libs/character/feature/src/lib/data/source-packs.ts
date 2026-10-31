import { computed, inject } from '@angular/core';
import type { Provider, Signal } from '@angular/core';
import { CONTENT_SCOPE } from '@pioneer/rules/data-access';
import type { ContentScope } from '@pioneer/rules/data-access';
import { LEGACY_CONTENT_VARIANT } from '@pioneer/rules/sdk';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { SOURCE_PACKS } from '@pioneer/rules/ui';
import type { SourcePack } from '@pioneer/rules/ui';

import { CharacterPackStore } from './character-pack-store';
import { CharacterRuleLimitSettingStore } from './character-rule-limit-setting-store';
import { CharacterRuleLimitStore } from './character-rule-limit-store';
import { CharacterVariantStore } from './character-variant-store';
import { homebrewOf } from './content-registry-query';

/** The packs the open character uses by id, so a homebrew entry's source line names its pack and publisher. */
function sourcePacksOf(): Signal<ReadonlyMap<ContentPackId, SourcePack>> {
  const store = inject(CharacterPackStore);
  return computed(
    (): ReadonlyMap<ContentPackId, SourcePack> =>
      new Map(
        (store.packs.data()?.enabled ?? []).map((pack): [ContentPackId, SourcePack] => [
          pack.packId,
          { title: pack.title, publisher: pack.publisher },
        ]),
      ),
  );
}

/** Names the character's homebrew packs in every source line below. */
const SOURCE_PACKS_PROVIDER: Provider = { provide: SOURCE_PACKS, useFactory: sourcePacksOf };

/**
 * The open character's effective packs and whether legacy content is on, which the content browser, entries and search
 * beside the sheet list. Like the
 * sheet's registry it waits for the pack list, so nothing is built over the official packs first.
 */
function contentScopeOf(): Signal<ContentScope> {
  const store = inject(CharacterPackStore);
  const variants = inject(CharacterVariantStore);
  return computed((): ContentScope => ({
    homebrew: homebrewOf(store.packs.data()),
    legacy: (variants.rules.data()?.enabled ?? []).some((rule) => rule.variantId === LEGACY_CONTENT_VARIANT),
    ready: !store.packs.isPending() && !variants.rules.isPending(),
  }));
}

const CONTENT_SCOPE_PROVIDER: Provider = { provide: CONTENT_SCOPE, useFactory: contentScopeOf };

/** The open character's packs, variant rules and table limits, and the source-line names drawn from the packs. */
export const CHARACTER_CONTENT_PROVIDERS: readonly Provider[] = [
  CharacterPackStore,
  CharacterRuleLimitStore,
  CharacterRuleLimitSettingStore,
  CharacterVariantStore,
  SOURCE_PACKS_PROVIDER,
  CONTENT_SCOPE_PROVIDER,
];
