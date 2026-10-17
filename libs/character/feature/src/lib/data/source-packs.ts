import { computed, inject } from '@angular/core';
import type { Provider, Signal } from '@angular/core';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { SOURCE_PACKS } from '@pioneer/rules/ui';
import type { SourcePack } from '@pioneer/rules/ui';

import { CharacterPackStore } from './character-pack-store';
import { CharacterRuleLimitSettingStore } from './character-rule-limit-setting-store';
import { CharacterRuleLimitStore } from './character-rule-limit-store';
import { CharacterVariantStore } from './character-variant-store';

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

/** The open character's packs, variant rules and table limits, and the source-line names drawn from the packs. */
export const CHARACTER_CONTENT_PROVIDERS: readonly Provider[] = [
  CharacterPackStore,
  CharacterRuleLimitStore,
  CharacterRuleLimitSettingStore,
  CharacterVariantStore,
  SOURCE_PACKS_PROVIDER,
];
