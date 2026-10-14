import { computed, inject } from '@angular/core';
import type { Provider, Signal } from '@angular/core';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { SOURCE_PACKS } from '@pioneer/rules/ui';
import type { SourcePack } from '@pioneer/rules/ui';

import { CharacterPackStore } from './character-pack-store';

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

/** Provide beside `CharacterPackStore`: every source line below names the character's homebrew packs. */
export const SOURCE_PACKS_PROVIDER: Provider = { provide: SOURCE_PACKS, useFactory: sourcePacksOf };
