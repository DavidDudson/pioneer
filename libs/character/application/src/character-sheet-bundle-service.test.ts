import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterName, OverrideRole, PackAuthority } from '@pioneer/character/domain';
import type {
  CharacterId,
  CharacterPacks,
  CharacterRuleLimitSettings,
  CharacterVariantRules,
  FeatDisplayChoice,
  SheetModeChoice,
  UnenabledContent,
} from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { CharacterSheetBundleService } from './character-sheet-bundle-service';
import { InMemoryCharacterCampaignRoles } from './in-memory-character-campaign-roles';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const gm = UserId.parse(newId());

describe('CharacterSheetBundleService', () => {
  let bundle: CharacterSheetBundleService;
  let id: CharacterId;
  /** The owner-only parts the test doubles were asked for, which a GM's bundle must not ask for. */
  let ownerOnlyRead: string[];

  beforeEach(async () => {
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    const clock = fixedClock('2026-10-07T10:00:00Z');
    const repository = new InMemoryCharacterRepository();
    const roles = new InMemoryCharacterCampaignRoles();
    const characters = new CharacterService(repository, content, clock).withCampaignRoles(roles);
    const created = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
    ({ id } = created);
    roles.assign(id, gm, OverrideRole.Gm);
    ownerOnlyRead = [];
    bundle = new CharacterSheetBundleService({
      characters,
      play: new PlayService(repository, content, clock),
      sheetModes: {
        get: async (): Promise<SheetModeChoice> => {
          ownerOnlyRead.push('sheetMode');
          return {};
        },
      },
      featDisplay: {
        get: async (): Promise<FeatDisplayChoice> => {
          ownerOnlyRead.push('featDisplay');
          return { showGrantOnly: [] };
        },
      },
      packs: {
        packs: async (): Promise<CharacterPacks> => {
          ownerOnlyRead.push('packs');
          return { decidedBy: PackAuthority.Character, manageable: true, enabled: [], candidates: [], unsupported: [] };
        },
      },
      variants: {
        variantRules: async (): Promise<CharacterVariantRules> => {
          ownerOnlyRead.push('variantRules');
          return { decidedBy: PackAuthority.Character, manageable: true, enabled: [], available: [] };
        },
      },
      ruleLimits: {
        ruleLimitSettings: async (): Promise<CharacterRuleLimitSettings> => {
          ownerOnlyRead.push('ruleLimitSettings');
          return { decidedBy: PackAuthority.Character, manageable: true, limits: [] };
        },
      },
      unenabled: {
        unenabled: async (): Promise<UnenabledContent> => {
          ownerOnlyRead.push('unenabled');
          return { variantRules: [], packs: [], items: [] };
        },
      },
    });
  });

  test('the owner gets the sheet and every part', async () => {
    const opened = await bundle.bundle(amiri, id);
    expect(opened.sheet.character.id).toBe(id);
    expect(opened.play).toBeDefined();
    expect(opened.sheetMode).toBeDefined();
    expect(opened.featDisplay).toBeDefined();
    expect(opened.packs).toBeDefined();
    expect(opened.variantRules).toBeDefined();
    expect(opened.ruleLimitSettings).toBeDefined();
    expect(opened.unenabled).toBeDefined();
  });

  test("a campaign's GM gets the sheet without the owner-only parts, which are never read", async () => {
    const opened = await bundle.bundle(gm, id);
    expect(opened.sheet.character.id).toBe(id);
    expect(opened.ruleLimits).toBeDefined();
    expect(opened.play).toBeUndefined();
    expect(opened.sheetMode).toBeUndefined();
    expect(opened.featDisplay).toBeUndefined();
    expect(opened.packs).toBeUndefined();
    expect(opened.variantRules).toBeUndefined();
    expect(opened.ruleLimitSettings).toBeUndefined();
    expect(opened.unenabled).toBeUndefined();
    expect(ownerOnlyRead).toEqual([]);
  });

  test('someone who may not see the character gets a 404', async () => {
    const refused = await rejection(bundle.bundle(ezren, id));
    expect(refused).toBeInstanceOf(NotFoundError);
    expect(ownerOnlyRead).toEqual([]);
  });
});
