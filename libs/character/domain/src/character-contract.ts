import { AncestryId, ContentPackId, VariantRuleId } from '@pioneer/rules/sdk';
import { Endpoint, HttpMethod, listQuery, NoBody, NoParams, NoQuery } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Character } from './character';
import { CharacterAllies } from './character-allies';
import { SheetDeity } from './character-deity';
import { CharacterId, CharacterName } from './character-fields';
import { CharacterLanguages } from './character-languages';
import { CharacterPacks, EnablePackBody } from './character-packs';
import { PatchCharacterBody } from './character-patch';
import { CharacterSlot } from './character-slot';
import { CharacterVariantRules, EnableVariantRuleBody } from './character-variant-rules';
import { ClearedPick } from './dependent-picks';
import { FeatDisplayChoice, SetFeatDisplayBody } from './feat-display';
import { CharacterPlay, PatchPlayBody } from './play-state';
import { SetSheetModeBody, SheetModeChoice } from './sheet-mode';

const ById = z.object({ id: CharacterId });
const ByPack = z.object({ id: CharacterId, packId: ContentPackId });
const ByVariantRule = z.object({ id: CharacterId, variantId: VariantRuleId });

/** The only orders the character list supports; each is backed by an index. */
export const CharacterSort = { CreatedAt: 'created-at', Name: 'name' } as const;
export type CharacterSort = ValueOf<typeof CharacterSort>;

export const CharacterListQuery = listQuery(CharacterSort, CharacterSort.CreatedAt);
export type CharacterListQuery = z.output<typeof CharacterListQuery>;

export const CreateCharacterBody = z.object({ name: CharacterName, ancestry: AncestryId });
export type CreateCharacterBody = z.infer<typeof CreateCharacterBody>;

/**
 * One character as its sheet reads it: the character, every slot it has with its status (#419), its languages (#470)
 * and its deity (#469), with the description the browser's content has no copy of. They are worked out from the picks
 * and the server's content on each read, never stored, so the character's wire stays inputs only.
 */
export const CharacterSheet = z.object({
  character: Character.codec,
  slots: z.array(CharacterSlot).readonly(),
  languages: CharacterLanguages,
  deity: SheetDeity.optional(),
});
export type CharacterSheet = z.output<typeof CharacterSheet>;

/**
 * A PATCH's answer: the sheet, and the picks the edit cleared because a slot they are within changed (a heritage of
 * the old ancestry). Reported once, here; a later read has no record of them.
 */
export const PatchedCharacterSheet = CharacterSheet.extend({ cleared: z.array(ClearedPick).readonly() });
export type PatchedCharacterSheet = z.output<typeof PatchedCharacterSheet>;

/** The character HTTP API, shared by `character-infrastructure` and `character-feature`. */
export const CharacterContract = {
  list: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters',
    params: NoParams,
    query: CharacterListQuery,
    body: NoBody,
    response: z.array(Character.codec),
  }),
  get: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters/:id',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CharacterSheet,
  }),
  create: new Endpoint({
    method: HttpMethod.Post,
    path: '/characters',
    params: NoParams,
    query: NoQuery,
    body: CreateCharacterBody,
    response: Character.codec,
  }),
  patch: new Endpoint({
    method: HttpMethod.Patch,
    path: '/characters/:id',
    params: ById,
    query: NoQuery,
    body: PatchCharacterBody,
    response: PatchedCharacterSheet,
  }),
  /** Play state, apart from the build: its own revision, so build saves and play edits never conflict (#343). */
  play: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters/:id/play',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CharacterPlay,
  }),
  patchPlay: new Endpoint({
    method: HttpMethod.Patch,
    path: '/characters/:id/play',
    params: ById,
    query: NoQuery,
    body: PatchPlayBody,
    response: CharacterPlay,
  }),
  /** The tab the signed-in user last had open on this character's sheet, if any. */
  sheetMode: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters/:id/sheet-mode',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: SheetModeChoice,
  }),
  /** Remembers the tab the signed-in user switched to. Not a character edit: the version stays the same. */
  setSheetMode: new Endpoint({
    method: HttpMethod.Patch,
    path: '/characters/:id/sheet-mode',
    params: ById,
    query: NoQuery,
    body: SetSheetModeBody,
    response: SheetModeChoice,
  }),
  /** The sections where the signed-in user shows this character's grant-only feats. */
  featDisplay: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters/:id/feat-display',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: FeatDisplayChoice,
  }),
  /** Shows or hides the grant-only feats in one section. Not a character edit: the version stays the same. */
  setFeatDisplay: new Endpoint({
    method: HttpMethod.Patch,
    path: '/characters/:id/feat-display',
    params: ById,
    query: NoQuery,
    body: SetFeatDisplayBody,
    response: FeatDisplayChoice,
  }),
  /** The rest of the party of the campaign this character is in, who may be named as the giver of an effect. Owner only. */
  allies: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters/:id/allies',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CharacterAllies,
  }),
  /** The packs this character uses, and who decides them: its owner, or the campaign it is attached to. */
  packs: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters/:id/packs',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CharacterPacks,
  }),
  /**
   * Owner only: enables a pack they may read, with the packs it extends. A character in a campaign uses the campaign's
   * packs, so that is a 409; so is a pack extending one the owner cannot read. A pack they cannot read is a 404.
   * Enabling it twice is harmless.
   */
  enablePack: new Endpoint({
    method: HttpMethod.Post,
    path: '/characters/:id/packs',
    params: ById,
    query: NoQuery,
    body: EnablePackBody,
    response: CharacterPacks,
  }),
  /**
   * Owner only: stops the character using a homebrew pack. Official packs are always on, a pack an enabled pack
   * extends stays on, and a campaign's packs are not the character's to change: each is a 409. Disabling it twice is
   * harmless.
   */
  disablePack: new Endpoint({
    method: HttpMethod.Delete,
    path: '/characters/:id/packs/:packId',
    params: ByPack,
    query: NoQuery,
    body: NoBody,
    response: CharacterPacks,
  }),
  /** The variant rules in force for this character, and who decides them: its owner, or the campaign it is attached to. */
  variantRules: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters/:id/variant-rules',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CharacterVariantRules,
  }),
  /**
   * Owner only: enables a variant rule of a pack in force. A character in a campaign uses the campaign's variant rules,
   * so that is a 409. A variant rule that is not in a pack in force is a 404. Enabling it twice is harmless.
   */
  enableVariantRule: new Endpoint({
    method: HttpMethod.Post,
    path: '/characters/:id/variant-rules',
    params: ById,
    query: NoQuery,
    body: EnableVariantRuleBody,
    response: CharacterVariantRules,
  }),
  /**
   * Owner only: stops the character using a variant rule. A campaign's variant rules are not the character's to
   * change: that is a 409. Disabling it twice is harmless.
   */
  disableVariantRule: new Endpoint({
    method: HttpMethod.Delete,
    path: '/characters/:id/variant-rules/:variantId',
    params: ByVariantRule,
    query: NoQuery,
    body: NoBody,
    response: CharacterVariantRules,
  }),
} as const;
