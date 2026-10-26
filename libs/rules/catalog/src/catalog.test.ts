import { describe, expect, test } from 'bun:test';

import {
  AncestryId,
  contentId,
  ContentRegistry,
  CreatureId,
  EntrySlug,
  HitPoints,
  Level,
  packContentsFromFiles,
  PackId,
  Selector,
} from '@pioneer/rules/sdk';

import { checkedLoader, contentCatalog } from './index';
import { SourceCheckError } from './source-check';

const coreRules = PackId.parse('core-rules');
const playerCore = PackId.parse('player-core');
const playerCore2 = PackId.parse('player-core-2');
const monsterCore = PackId.parse('monster-core');
const monsterCore2 = PackId.parse('monster-core-2');
const npcCore = PackId.parse('npc-core');
const divineMysteries = PackId.parse('divine-mysteries');
const treasureVault = PackId.parse('treasure-vault');
const howlOfTheWild = PackId.parse('howl-of-the-wild');
const warOfImmortals = PackId.parse('war-of-immortals');
const mwangiExpanse = PackId.parse('mwangi-expanse');
const impossibleMagic = PackId.parse('impossible-magic');
const gunsAndGears = PackId.parse('guns-and-gears');
const battlecry = PackId.parse('battlecry');
const chelaxInfernalInheritance = PackId.parse('cheliax-infernal-inheritance');
const rivalAcademies = PackId.parse('rival-academies');
const shiningKingdoms = PackId.parse('shining-kingdoms');
const draconicCodex = PackId.parse('draconic-codex');
const hellbreakers = PackId.parse('hellbreakers');
const gatewalkers = PackId.parse('gatewalkers');
const mythSpeakers = PackId.parse('myth-speakers');
const revengeOfTheRunelords = PackId.parse('revenge-of-the-runelords');
const secretsOfTheUnlitStar = PackId.parse('secrets-of-the-unlit-star');
const troublesInGrayce = PackId.parse('troubles-in-grayce');
const hellsDestiny = PackId.parse('hells-destiny');
const bastionOfBlasphemies = PackId.parse('bastion-of-blasphemies');
const theDeadGodsHand = PackId.parse('the-dead-gods-hand');
const hellfireDispatches = PackId.parse('hellfire-dispatches');
const highSeas = PackId.parse('high-seas');
const seasonOfGhosts = PackId.parse('season-of-ghosts');
const rageOfElements = PackId.parse('rage-of-elements');
const secretsOfMagic = PackId.parse('secrets-of-magic');
const tianXiaCharacterGuide = PackId.parse('tian-xia-character-guide');
const darkArchiveRemastered = PackId.parse('dark-archive-remastered');
const characterGuide = PackId.parse('character-guide');
const impossibleLands = PackId.parse('impossible-lands');
const gmCore = PackId.parse('gm-core');
const humanId = AncestryId.parse(contentId(playerCore, EntrySlug.parse('ancestry:human')));
const zombieId = CreatureId.parse(contentId(monsterCore, EntrySlug.parse('creature:zombie-shambler')));

describe('content catalog', () => {
  test('every pack loads and validates', async () => {
    const registry = new ContentRegistry();
    await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
    expect(registry.packs.map((pack) => pack.id).toSorted()).toStrictEqual([
      bastionOfBlasphemies,
      battlecry,
      characterGuide,
      chelaxInfernalInheritance,
      coreRules,
      darkArchiveRemastered,
      divineMysteries,
      draconicCodex,
      gatewalkers,
      gmCore,
      gunsAndGears,
      hellbreakers,
      hellfireDispatches,
      hellsDestiny,
      highSeas,
      howlOfTheWild,
      impossibleLands,
      impossibleMagic,
      monsterCore,
      monsterCore2,
      mwangiExpanse,
      mythSpeakers,
      npcCore,
      playerCore,
      playerCore2,
      rageOfElements,
      revengeOfTheRunelords,
      rivalAcademies,
      seasonOfGhosts,
      secretsOfMagic,
      secretsOfTheUnlitStar,
      shiningKingdoms,
      theDeadGodsHand,
      tianXiaCharacterGuide,
      treasureVault,
      troublesInGrayce,
      warOfImmortals,
    ]);
    const human = registry.ancestry(humanId);
    expect(human?.definition.hitPoints).toBe(HitPoints.parse(8));
    const zombie = registry.creature(zombieId);
    expect(zombie?.definition.level).toBe(Level.parse(-1));
    const [armorClass] = registry.statisticsFor(Selector.parse('ac'));
    expect(armorClass?.pack.id).toBe(coreRules);
  });

  test('a pack that cites an unregistered book fails to load', async () => {
    const homebrew = PackId.parse('homebrew');
    const slug = EntrySlug.parse('language:iruxi');
    const language = {
      id: contentId(homebrew, slug),
      pack: homebrew,
      kind: 'language',
      slug,
      name: 'Iruxi',
      rarity: 'common',
      traits: [],
      sources: [{ kind: 'book', book: 'core-rulebook', page: 1 }],
      description: [],
      rules: [],
      data: {},
    };
    const packFile = { id: homebrew, title: 'Homebrew', publisher: 'Someone', license: 'homebrew' };
    const loader = checkedLoader('homebrew', async () => packContentsFromFiles(packFile, [[language]]));
    const failure: unknown = await loader.load().then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(SourceCheckError);
  });
});
