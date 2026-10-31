import { contentPackFromContents, PackId } from '@pioneer/rules/sdk';
import type { ContentPack, ContentPackLoader, PackContents, PackContentsLoader } from '@pioneer/rules/sdk';

import { bookRegistry } from './book-registry';
import { coreRulesPack } from './core-rules-packs';
import {
  darkArchiveRemasteredPack,
  divineMysteriesPack,
  gmCorePack,
  howlOfTheWildPack,
  monsterCore2Pack,
  monsterCorePack,
  mwangiExpansePack,
  npcCorePack,
  playerCore2Pack,
  playerCorePack,
  rageOfElementsPack,
  secretsOfMagicPack,
  tianXiaCharacterGuidePack,
  treasureVaultPack,
  warOfImmortalsPack,
} from './json-packs';
import {
  clawsOfTheTyrantPack,
  clockworkMysteryPack,
  curtainCallPack,
  foolishHousekeepingPack,
  preyForDeathPack,
  shadesOfBloodPack,
  sporeWarPack,
  theDeadGodsHandPack,
  tianXiaWorldGuidePack,
  triumphOfTheTuskPack,
  wardensOfWildwoodPack,
} from './more-orc-packs';
import {
  advancedPlayersGuidePack,
  characterGuidePack,
  coreRulebookPack,
  impossibleLandsPack,
  theShowMustGoOnPack,
} from './ogl-packs';
import {
  bastionOfBlasphemiesPack,
  battlecryPack,
  chelaxInfernalInheritancePack,
  draconicCodexPack,
  gatewalkersPack,
  gunsAndGearsPack,
  hellbreakersPack,
  hellfireDispatchesPack,
  hellsDestinyPack,
  highSeasPack,
  impossibleMagicPack,
  mythSpeakersPack,
  revengeOfTheRunelordsPack,
  rivalAcademiesPack,
  seasonOfGhostsPack,
  secretsOfTheUnlitStarPack,
  shiningKingdomsPack,
  troublesInGraycePack,
} from './orc-packs';
import { checkPackSources } from './source-check';

export { BookRegistry, bookRegistry } from './book-registry';
export { proposeAonMappings } from './aon-matcher';
export type { AonListing, AonMatchable, AonProposals } from './aon-matcher';
export { proposeCreatureActions } from './creature-actions';
export { proposeGrantedActions } from './granted-actions';
export type { ActionGranter, GrantedAction, GrantedActionProposals } from './granted-actions';
export { classifyRemasterCandidate, normaliseName } from './remaster-audit';
export type { RemasterCandidate, RemasterClass } from './remaster-audit';
export type { CreatureActionProposals } from './creature-actions';
export { checkEnrichment } from './enrichment-check';
export type { EnrichmentCheck, EnrichmentTarget } from './enrichment-check';
export { checkPackSources, packEntries, SourceCheckError, sourceIssues } from './source-check';
export { FOUNDRY_IMPORTS, foundryReleaseUrl } from './foundry-imports';
export type { FoundryImport } from './foundry-imports';
export type { MissourcedEntry, SourcedEntry } from './source-check';
export { sourceCoverage } from './source-coverage';
export type { BookCoverage } from './source-coverage';
export { prerequisiteCoverage } from './prerequisite-coverage';
export type { PrerequisiteCoverage } from './prerequisite-coverage';
export { triggerCoverage } from './trigger-coverage';
export type { TriggerCoverage } from './trigger-coverage';
export { entryAction, matchTrigger, triggerMatches } from './trigger-matcher';
export { staffCoverage } from './staff-coverage';
export type { StaffCoverage } from './staff-coverage';
export { isStaffEntry, matchStaffSpells, spellIndex, staffMatches, STAFF_TRAIT } from './staff-matcher';
export type { SpellIndex, StaffMatch } from './staff-matcher';
export { prerequisiteMatches } from './prerequisite-matcher';
export type { PrerequisiteMatch } from './prerequisite-matcher';
export type { RefNames, TriggerMatch } from './trigger-matcher';

/**
 * A loader whose pack must also pass the registry source checks, so a wrongly sourced entry fails to load. The pack
 * files never change while the process runs, so it reads and checks them once: Player Core alone takes seconds.
 */
export function checkedLoader(id: string, load: () => Promise<PackContents>): PackContentsLoader {
  let checked: Promise<PackContents> | undefined = undefined;
  const loadChecked = async (): Promise<PackContents> => {
    const contents = await load();
    checkPackSources(contentPackFromContents(contents), bookRegistry);
    return contents;
  };
  return {
    id: PackId.parse(id),
    load: async () => {
      checked ??= loadChecked();
      return checked;
    },
  };
}

/**
 * Every official pack's files under `content/packs` (ADR-0003), as lazy loaders. The content seed upserts them into
 * Postgres; a new pack is one directory there plus one line here.
 */
export const officialPacks: readonly PackContentsLoader[] = [
  checkedLoader('core-rules', coreRulesPack),
  checkedLoader('player-core', playerCorePack),
  checkedLoader('player-core-2', playerCore2Pack),
  checkedLoader('monster-core', monsterCorePack),
  checkedLoader('monster-core-2', monsterCore2Pack),
  checkedLoader('npc-core', npcCorePack),
  checkedLoader('divine-mysteries', divineMysteriesPack),
  checkedLoader('treasure-vault', treasureVaultPack),
  checkedLoader('howl-of-the-wild', howlOfTheWildPack),
  checkedLoader('war-of-immortals', warOfImmortalsPack),
  checkedLoader('mwangi-expanse', mwangiExpansePack),
  checkedLoader('secrets-of-magic', secretsOfMagicPack),
  checkedLoader('rage-of-elements', rageOfElementsPack),
  checkedLoader('impossible-lands', impossibleLandsPack),
  checkedLoader('character-guide', characterGuidePack),
  checkedLoader('core-rulebook', coreRulebookPack),
  checkedLoader('advanced-players-guide', advancedPlayersGuidePack),
  checkedLoader('the-show-must-go-on', theShowMustGoOnPack),
  checkedLoader('dark-archive-remastered', darkArchiveRemasteredPack),
  checkedLoader('tian-xia-character-guide', tianXiaCharacterGuidePack),
  checkedLoader('impossible-magic', impossibleMagicPack),
  checkedLoader('guns-and-gears', gunsAndGearsPack),
  checkedLoader('battlecry', battlecryPack),
  checkedLoader('cheliax-infernal-inheritance', chelaxInfernalInheritancePack),
  checkedLoader('rival-academies', rivalAcademiesPack),
  checkedLoader('shining-kingdoms', shiningKingdomsPack),
  checkedLoader('draconic-codex', draconicCodexPack),
  checkedLoader('hellfire-dispatches', hellfireDispatchesPack),
  checkedLoader('high-seas', highSeasPack),
  checkedLoader('season-of-ghosts', seasonOfGhostsPack),
  checkedLoader('hellbreakers', hellbreakersPack),
  checkedLoader('gatewalkers', gatewalkersPack),
  checkedLoader('myth-speakers', mythSpeakersPack),
  checkedLoader('revenge-of-the-runelords', revengeOfTheRunelordsPack),
  checkedLoader('secrets-of-the-unlit-star', secretsOfTheUnlitStarPack),
  checkedLoader('troubles-in-grayce', troublesInGraycePack),
  checkedLoader('hells-destiny', hellsDestinyPack),
  checkedLoader('bastion-of-blasphemies', bastionOfBlasphemiesPack),
  checkedLoader('the-dead-gods-hand', theDeadGodsHandPack),
  checkedLoader('wardens-of-wildwood', wardensOfWildwoodPack),
  checkedLoader('curtain-call', curtainCallPack),
  checkedLoader('triumph-of-the-tusk', triumphOfTheTuskPack),
  checkedLoader('spore-war', sporeWarPack),
  checkedLoader('shades-of-blood', shadesOfBloodPack),
  checkedLoader('prey-for-death', preyForDeathPack),
  checkedLoader('claws-of-the-tyrant', clawsOfTheTyrantPack),
  checkedLoader('clockwork-mystery', clockworkMysteryPack),
  checkedLoader('tian-xia-world-guide', tianXiaWorldGuidePack),
  checkedLoader('foolish-housekeeping', foolishHousekeepingPack),
  checkedLoader('gm-core', gmCorePack),
];

/** `load`'s pack as a `ContentPack`, built once: a pack's definitions never change while the process runs. */
function packLoader({ id, load }: PackContentsLoader): ContentPackLoader {
  let pack: Promise<ContentPack> | undefined = undefined;
  const build = async (): Promise<ContentPack> => contentPackFromContents(await load());
  return {
    id,
    load: async () => {
      pack ??= build();
      return pack;
    },
  };
}

/**
 * Every installable content pack, as lazy loaders over the official packs' JSON. Packs are only fetched (browser) or
 * read (server) when `ContentRegistry.load` is called.
 */
export const contentCatalog: readonly ContentPackLoader[] = officialPacks.map((loader) => packLoader(loader));
