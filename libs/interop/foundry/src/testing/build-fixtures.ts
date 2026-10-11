import type { JournalDocument } from '../foundry-release';
import type { DocumentFixture } from './import-fixtures';
import { FOUNDRY_NULL } from './kind-fixtures';

/** Fixture build documents (ancestry to kit) and the archetypes journal, shaped as `pf2e-8.6.0` has them. */

const CLASS_FEATURES = { name: 'classfeatures', directory: 'class-features' };
const ANCESTRY_FEATURES = { name: 'ancestryfeatures', directory: 'ancestry-features' };

const ALL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const DWARF: DocumentFixture = {
  id: 'BYj5ZvlXZdpaEgA1',
  name: 'Dwarf',
  type: 'ancestry',
  system: {
    additionalLanguages: { count: 0, custom: '', value: ['petran'] },
    boosts: { '0': { value: ['con'] }, '1': { value: ['wis'] }, '2': { value: ALL } },
    flaws: { '0': { value: ['cha'] } },
    hands: 2,
    hp: 10,
    items: { k1a2b: { level: 1, name: 'Clan Dagger', uuid: 'Compendium.pf2e.ancestryfeatures.Item.Clan Dagger' } },
    languages: { custom: '', value: ['common', 'dwarven'] },
    reach: 5,
    size: 'med',
    speed: 20,
    vision: 'darkvision',
    traits: { rarity: 'common', value: ['dwarf', 'humanoid'] },
  },
};

export const CLAN_DAGGER: DocumentFixture = {
  id: 'cLaNdAgGeR000001',
  name: 'Clan Dagger',
  type: 'feat',
  pack: ANCESTRY_FEATURES,
  system: { category: 'ancestryfeature', actionType: { value: 'passive' }, actions: { value: FOUNDRY_NULL } },
};

const ANCIENT_BLOODED_DWARF: DocumentFixture = {
  id: 'hEr1tAgE00000001',
  name: 'Ancient-Blooded Dwarf',
  type: 'heritage',
  system: { ancestry: { name: 'Dwarf', slug: 'dwarf', uuid: 'Compendium.pf2e.ancestries.Item.BYj5ZvlXZdpaEgA1' } },
};

export const ANCESTRY_OUTSIDE: DocumentFixture = {
  id: 'hEr1tAgE00000002',
  name: 'Seer Elf',
  type: 'heritage',
  system: { ancestry: { name: 'Elf', slug: 'elf', uuid: 'Compendium.pf2e.ancestries.Item.PgKmsA2aKdbLU6O0' } },
};

const CHANGELING: DocumentFixture = {
  id: 'hEr1tAgE00000003',
  name: 'Changeling',
  type: 'heritage',
  system: { ancestry: FOUNDRY_NULL },
};

const STUDENT_OF_THE_CANON: DocumentFixture = {
  id: 'fEaT000000000001',
  name: 'Student of the Canon',
  type: 'feat',
  system: {
    category: 'skill',
    actionType: { value: 'passive' },
    actions: { value: FOUNDRY_NULL },
    level: { value: 1 },
  },
};

export const ACOLYTE: DocumentFixture = {
  id: 'bAcKgRoUnD000001',
  name: 'Acolyte',
  type: 'background',
  system: {
    boosts: { '0': { value: ['int', 'wis'] }, '1': { value: ALL } },
    items: {
      '1v9gz': { level: 1, name: 'Student of the Canon', uuid: 'Compendium.pf2e.feats-srd.Item.Student of the Canon' },
    },
    trainedSkills: { lore: ['Scribing Lore'], value: ['religion'] },
  },
};

const REACTIVE_STRIKE: DocumentFixture = {
  id: 'cLaSsFeAtUrE0001',
  name: 'Reactive Strike',
  type: 'feat',
  pack: CLASS_FEATURES,
  system: {
    category: 'classfeature',
    actionType: { value: 'reaction' },
    actions: { value: FOUNDRY_NULL },
    level: { value: 1 },
    description: { value: '<p><strong>Trigger</strong> A creature within your reach uses a manipulate action.</p>' },
  },
};

const BRAVERY: DocumentFixture = {
  id: 'cLaSsFeAtUrE0002',
  name: 'Bravery',
  type: 'feat',
  pack: CLASS_FEATURES,
  system: {
    category: 'classfeature',
    actionType: { value: 'passive' },
    actions: { value: FOUNDRY_NULL },
    level: { value: 3 },
  },
};

export const FIGHTER: DocumentFixture = {
  id: 'cLaSs00000000001',
  name: 'Fighter',
  type: 'class',
  system: {
    attacks: { advanced: 1, martial: 2, other: { name: '', rank: 0 }, simple: 2, unarmed: 2 },
    classFeatLevels: { value: [1, 2] },
    defenses: { heavy: 1, light: 1, medium: 1, unarmored: 1 },
    hp: 10,
    items: {
      b1: { level: 3, name: 'Bravery', uuid: 'Compendium.pf2e.classfeatures.Item.Bravery' },
      r1: { level: 1, name: 'Reactive Strike', uuid: 'Compendium.pf2e.classfeatures.Item.cLaSsFeAtUrE0001' },
    },
    keyAbility: { value: ['dex', 'str'] },
    perception: 2,
    savingThrows: { fortitude: 2, reflex: 2, will: 1 },
    spellcasting: 0,
    trainedSkills: { additional: 3, value: [] },
    traits: { rarity: 'common', value: [] },
  },
};

export const SUDDEN_CHARGE: DocumentFixture = {
  id: 'fEaT000000000002',
  name: 'Sudden Charge',
  type: 'feat',
  system: {
    category: 'class',
    actionType: { value: 'action' },
    actions: { value: 2 },
    level: { value: 1 },
    prerequisites: { value: [] },
    traits: { rarity: 'common', value: ['fighter', 'flourish', 'open'] },
  },
};

const ADDITIONAL_LORE: DocumentFixture = {
  id: 'fEaT000000000003',
  name: 'Additional Lore',
  type: 'feat',
  system: {
    category: 'skill',
    actionType: { value: 'passive' },
    actions: { value: FOUNDRY_NULL },
    level: { value: 1 },
    maxTakable: FOUNDRY_NULL,
    prerequisites: { value: [{ value: 'trained in Lore' }] },
    traits: { rarity: 'common', value: ['general', 'skill'] },
  },
};

export const FIGHTER_DEDICATION: DocumentFixture = {
  id: 'fEaT000000000004',
  name: 'Fighter Dedication',
  type: 'feat',
  system: {
    category: 'class',
    actionType: { value: 'passive' },
    actions: { value: FOUNDRY_NULL },
    level: { value: 2 },
    prerequisites: { value: [{ value: 'Strength +2' }, { value: 'Dexterity +2' }] },
    traits: { rarity: 'common', value: ['archetype', 'dedication', 'multiclass'] },
  },
};

export const BASIC_MANEUVER: DocumentFixture = {
  id: 'fEaT000000000005',
  name: 'Basic Maneuver',
  type: 'feat',
  system: {
    category: 'class',
    actionType: { value: 'passive' },
    actions: { value: FOUNDRY_NULL },
    level: { value: 4 },
    prerequisites: { value: [{ value: 'Fighter Dedication' }] },
    traits: { rarity: 'common', value: ['archetype'] },
  },
};

const MINDLINK: DocumentFixture = { id: 'sPeLl00000000001', name: 'Mindlink', type: 'spell' };

export const PHARASMA: DocumentFixture = {
  id: 'dEiTy00000000001',
  name: 'Pharasma',
  type: 'deity',
  system: {
    attribute: ['con', 'wis'],
    category: 'deity',
    domains: { alternate: ['soul'], primary: ['death', 'fate'] },
    font: ['heal'],
    sanctification: FOUNDRY_NULL,
    skill: ['medicine'],
    spells: { '1': 'Compendium.pf2e.spells-srd.Item.Mindlink' },
    weapons: ['dagger'],
  },
};

const ROPE: DocumentFixture = { id: 'eQuIp00000000001', name: 'Rope', type: 'equipment' };
const BACKPACK: DocumentFixture = { id: 'eQuIp00000000002', name: 'Backpack', type: 'backpack' };

const ADVENTURERS_PACK: DocumentFixture = {
  id: 'kIt0000000000001',
  name: "Adventurer's Pack",
  type: 'kit',
  system: {
    items: {
      mca3x: {
        isContainer: true,
        name: 'Backpack',
        quantity: 1,
        uuid: 'Compendium.pf2e.equipment-srd.Item.Backpack',
        items: {
          '02xhi': {
            isContainer: false,
            items: {},
            name: 'Rope',
            quantity: 1,
            uuid: 'Compendium.pf2e.equipment-srd.Item.Rope',
          },
        },
      },
    },
    price: { value: { cp: 0, gp: 0, pp: 0, sp: 15 } },
  },
};

/** The archetypes journal: the Fighter page, introduction then embedded feats, as Foundry writes it. */
export const ARCHETYPES_JOURNAL: JournalDocument = {
  pack: { name: 'journals', directory: 'journals' },
  path: 'packs/pf2e/journals/archetypes.json',
  journal: {
    _id: 'vx5FGEG34AxI2dow',
    name: 'Archetypes',
    pages: [
      {
        _id: 'pAgEfIgHtEr00001',
        name: 'Fighter',
        type: 'text',
        text: {
          content:
            '<p>You have spent time learning the art of warfare.</p>' +
            '<p>@Embed[Compendium.pf2e.feats-srd.Item.fEaT000000000004 inline]</p>' +
            '<h2>@UUID[Compendium.pf2e.feats-srd.Item.Basic Maneuver]</h2>',
        },
      },
      {
        _id: 'pAgEaCrObAt00001',
        name: 'Acrobat',
        type: 'text',
        text: { content: '<p>Grace.</p><h2>@UUID[Compendium.pf2e.feats-srd.Item.Acrobat Dedication]</h2>' },
      },
    ],
  },
};

/** Every build document, so each kind's references resolve. */
export const BUILD: readonly DocumentFixture[] = [
  DWARF,
  ANCIENT_BLOODED_DWARF,
  CHANGELING,
  ACOLYTE,
  STUDENT_OF_THE_CANON,
  FIGHTER,
  REACTIVE_STRIKE,
  BRAVERY,
  SUDDEN_CHARGE,
  ADDITIONAL_LORE,
  FIGHTER_DEDICATION,
  BASIC_MANEUVER,
  PHARASMA,
  MINDLINK,
  ADVENTURERS_PACK,
  BACKPACK,
  ROPE,
];
