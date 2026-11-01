import { CharacterContract } from '@pioneer/character/domain';
import type { CharacterId, CharacterSheet, CharacterSheetBundle } from '@pioneer/character/domain';
import type { ApiClient } from '@pioneer/shared/web';
import type { QueryClient } from '@tanstack/angular-query-experimental';

import { characterKeys } from './character-query-keys';

/**
 * Seeds the stores that read a character's other resources with what the sheet bundle carried, so opening the sheet is
 * one request instead of one per store. The bundle leaves out what a campaign GM may not read: those stores keep
 * their own fetch, and fail as they did before. Allies and item approvals are not in it; they read when their tab opens.
 */
function seedFromSheetBundle(client: QueryClient, id: CharacterId, bundle: CharacterSheetBundle): void {
  client.setQueryData(characterKeys.ruleLimits(id), bundle.ruleLimits);
  seed(client, characterKeys.play(id), bundle.play);
  seed(client, characterKeys.sheetMode(id), bundle.sheetMode);
  seed(client, characterKeys.featDisplay(id), bundle.featDisplay);
  seed(client, characterKeys.packs(id), bundle.packs);
  seed(client, characterKeys.variantRules(id), bundle.variantRules);
  seed(client, characterKeys.ruleLimitSettings(id), bundle.ruleLimitSettings);
  seed(client, characterKeys.unenabled(id), bundle.unenabled);
}

function seed(client: QueryClient, key: readonly unknown[], value: object | undefined): void {
  if (value !== undefined) {
    client.setQueryData(key, value);
  }
}

/**
 * Reads a character's sheet. The first read is the sheet bundle, which also seeds the other stores' queries; a re-read
 * after an edit is the sheet alone, as the other queries are theirs to refresh.
 */
export async function readSheet(api: ApiClient, client: QueryClient, id: CharacterId): Promise<CharacterSheet> {
  if (client.getQueryData(characterKeys.detail(id)) !== undefined) {
    return api.call(CharacterContract.get, { params: { id }, body: undefined });
  }
  const bundle = await api.call(CharacterContract.sheetBundle, { params: { id }, body: undefined });
  seedFromSheetBundle(client, id, bundle);
  return bundle.sheet;
}
