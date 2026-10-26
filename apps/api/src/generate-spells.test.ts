import { describe, expect, test } from 'bun:test';

import {
  CharacterLevel,
  characterSlots,
  needsAccess,
  preparedReads,
  preparedSlots,
  signatureSlots,
  SlotStatus,
  SlotSubjectKind,
} from '@pioneer/character/domain';
import type { CharacterSlot, Generated, PreparedSlot, SlotContent, SpellOption } from '@pioneer/character/domain';
import { SlotRank } from '@pioneer/rules/sdk';
import { assert, constantFrom, integer, property } from 'fast-check';

import {
  blankIn,
  CLASS_TIMEOUT_MS,
  contentOf,
  generatorIn,
  LEVELS,
  PLAYER_CORE_CLASSES,
  SEED_MAX,
} from './generate-character-testing';

const PROPERTY_RUNS = 12;
const CASTERS = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'] as const;
const NON_CASTERS = PLAYER_CORE_CLASSES.filter((name) => !(CASTERS as readonly string[]).includes(name));
const CORE_PACKS = ['core-rules', 'player-core'];
/** The levels each caster is generated at; the property test covers the rest. */
const CASTER_LEVELS = [1, 5, 10, 15, 20].map((level) => CharacterLevel.parse(level));
/** A cleric's deity gives it spells outside its tradition, and a deity is no part of Player Core. */
const DEITY_CLASSES = new Set<string>(['Cleric']);
const CORE_CASTERS = CASTERS.filter((name) => !DEITY_CLASSES.has(name));
const FIRST_LEVEL = CharacterLevel.parse(1);
const LAST_LEVEL = CharacterLevel.parse(20);
const SEED = 3;

const content = await contentOf();
const coreContent = await contentOf(CORE_PACKS);
const generated = generatorIn(content);
const coreGenerated = generatorIn(coreContent);

/** Whether `slot` is one of the spell slots a character fills: a hidden one is a pick kept for a slot it no longer has. */
function isSpellSlot(slot: CharacterSlot): boolean {
  return (
    slot.status !== SlotStatus.Hidden &&
    (slot.subject.kind === SlotSubjectKind.Spell || slot.subject.kind === SlotSubjectKind.Signature)
  );
}

/** The spell slots of a generated character that aren't filled. */
function openSpellSlots(result: Generated, from: SlotContent): readonly string[] {
  return characterSlots(result.character.document, from)
    .filter((slot) => isSpellSlot(slot) && slot.status !== SlotStatus.Filled)
    .map((slot) => `${slot.status} ${slot.key}`);
}

/** Whether `spell` fits a slot of `rank`: a cantrip in a cantrip slot, any other spell of that rank or lower. */
function fitsRank(spell: SpellOption, rank: PreparedSlot['rank']): boolean {
  return rank === SlotRank.Cantrip ? spell.cantrip : !spell.cantrip && spell.rank <= rank;
}

/** What the generator and the content must agree on for a prepared or repertoire pick. */
interface PickCheck {
  readonly slot: PreparedSlot;
  readonly spell: SpellOption;
  readonly className: string;
  readonly loaded: ReadonlySet<string>;
  readonly access: ReadonlySet<string>;
}

/** The ways a pick breaks the slot it is in: its pack, kind, tradition, rank and rarity. */
function pickProblems({ slot, spell, className, loaded, access }: PickCheck): readonly string[] {
  const own = slot.pool === undefined && !slot.granted && !slot.deitySpell;
  const checks: readonly (readonly [boolean, string])[] = [
    [!loaded.has(spell.id), 'unloaded'],
    [spell.focus, 'focus spell'],
    [own && !DEITY_CLASSES.has(className) && !spell.traditions.includes(slot.tradition), 'tradition'],
    [!fitsRank(spell, slot.rank), 'rank'],
    [own && needsAccess(spell.rarity) && !access.has(spell.id), 'rarity'],
  ];
  return checks.filter(([broken]) => broken).map(([, problem]) => `${problem} ${slot.key}`);
}

/** What is wrong with the spells a generated character holds, against the content it was generated from. */
function spellProblems(result: Generated, from: SlotContent, className: string): readonly string[] {
  const { document } = result.character;
  const reads = preparedReads(document, from);
  const loaded = new Set<string>(from.spells.spells.map(({ id }) => id));
  const access = new Set<string>(document.build.spellAccess);
  const prepared = preparedSlots(document, reads).flatMap((slot) =>
    slot.pick === undefined
      ? [`no pick ${slot.key}`]
      : pickProblems({ slot, spell: slot.pick, className, loaded, access }),
  );
  const signature = signatureSlots(document, reads)
    .filter((slot) => slot.pick === undefined)
    .map((slot) => `no pick ${slot.key}`);
  return [...openSpellSlots(result, from), ...prepared, ...signature];
}

describe('generated spell picks', () => {
  test.each([...CASTERS])(
    '%s, at levels 1, 5, 10, 15 and 20, holds a spell in every slot',
    (className) => {
      for (const level of CASTER_LEVELS) {
        const result = generated(blankIn(content, className), level, level);
        expect({ level, problems: spellProblems(result, content, className) }).toEqual({ level, problems: [] });
      }
    },
    CLASS_TIMEOUT_MS,
  );

  test(
    'any seed, caster and level 1 to 20 holds a spell in every slot',
    () => {
      assert(
        property(
          integer({ min: 0, max: SEED_MAX }),
          constantFrom(...CASTERS),
          constantFrom(...LEVELS),
          (seed, className, level) =>
            spellProblems(generated(blankIn(content, className), seed, level), content, className).length === 0,
        ),
        { numRuns: PROPERTY_RUNS },
      );
    },
    CLASS_TIMEOUT_MS,
  );

  test.each([...CORE_CASTERS])(
    '%s, with only the Player Core packs enabled, picks spells of those packs',
    (className) => {
      const level = CharacterLevel.parse(10);
      const result = coreGenerated(blankIn(coreContent, className), SEED, level);
      expect(spellProblems(result, coreContent, className)).toEqual([]);
    },
    CLASS_TIMEOUT_MS,
  );

  test.each([...NON_CASTERS])(
    '%s has no spell slot of its own, and any a dedication adds are filled',
    (className) => {
      const first = generated(blankIn(content, className), SEED, FIRST_LEVEL);
      expect(characterSlots(first.character.document, content).filter((slot) => isSpellSlot(slot))).toEqual([]);
      const last = generated(blankIn(content, className), SEED, LAST_LEVEL);
      expect(openSpellSlots(last, content)).toEqual([]);
    },
    CLASS_TIMEOUT_MS,
  );
});
