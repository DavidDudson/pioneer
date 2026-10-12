import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { RulesMessage } from './messages';
import { Trait } from './trait';
import { uniqueItems } from './unique-items';

/** What a spell can target. "1 creature or object" is two targets, one of each. */
export const TargetKind = {
  Creature: 'creature',
  Object: 'object',
  Ally: 'ally',
  Enemy: 'enemy',
  Corpse: 'corpse',
  Weapon: 'weapon',
  Item: 'item',
  SpellEffect: 'spell-effect',
  /** The caster's animal companion, familiar or eidolon ("1 willing creature that is your companion"). */
  Companion: 'companion',
  AnimalCompanion: 'animal-companion',
  Familiar: 'familiar',
  Eidolon: 'eidolon',
} as const;
export type TargetKind = ValueOf<typeof TargetKind>;

/** Words that narrow a target: "1 willing creature", "1 unattended magic item", "1 dead creature". */
export const TargetQualifier = {
  Willing: 'willing',
  Living: 'living',
  Dead: 'dead',
  Dying: 'dying',
  Sleeping: 'sleeping',
  Falling: 'falling',
  Flying: 'flying',
  Corporeal: 'corporeal',
  Unattended: 'unattended',
  Magical: 'magical',
} as const;
export type TargetQualifier = ValueOf<typeof TargetQualifier>;

/** A count that is no number: "any number of creatures", or every one there is ("all creatures in range"). */
export const TargetCountWord = { Any: 'any', All: 'all' } as const;
export type TargetCountWord = ValueOf<typeof TargetCountWord>;

/** Where `all` targets are: in the spell's area ("enemies in the area") or within its range. */
export const TargetWithin = { Area: 'area', Range: 'range' } as const;
export type TargetWithin = ValueOf<typeof TargetWithin>;

/** The caster as a target: as well as the others ("you and up to 4 allies") or instead of them ("you or 1 ally"). */
export const TargetYou = { And: 'and', Or: 'or' } as const;
export type TargetYou = ValueOf<typeof TargetYou>;

/** How many of a kind a spell targets. */
const TargetCount = z.union([Pg.smallint().positive().brand<'TargetCount'>(), z.enum(TargetCountWord)]);

const TARGET_QUALIFIERS = Object.keys(TargetQualifier).length;
const TARGET_TRAITS_MAX = 4;
const TARGETS_MAX = 8;

const TARGET_UP_TO = { ...issueParams(message(RulesMessage.SpellTargetUpTo)), path: ['upTo'] };
const TARGET_WITHIN = { ...issueParams(message(RulesMessage.SpellTargetWithin)), path: ['within'] };

/**
 * "1 creature", "up to 5 creatures", "any number of creatures", "enemies in the area", "1 willing living creature",
 * "1 creature with the undead trait", "the triggering creature".
 */
const SpellTarget = z
  .strictObject({
    count: TargetCount,
    /** Up to `count`, rather than exactly. */
    upTo: z.boolean().optional(),
    /** Where `all` of them are. */
    within: z.enum(TargetWithin).optional(),
    of: z.enum(TargetKind),
    qualifiers: z.array(z.enum(TargetQualifier)).max(TARGET_QUALIFIERS).readonly().check(uniqueItems).optional(),
    /** Traits each target must have. */
    traits: z.array(Trait).max(TARGET_TRAITS_MAX).readonly().check(uniqueItems).optional(),
    /** The one that triggered the spell ("the triggering creature"). */
    triggering: z.boolean().optional(),
  })
  .refine(({ count, upTo }) => upTo === undefined || typeof count === 'number', TARGET_UP_TO)
  .refine(({ count, within }) => (within === undefined) === (count !== TargetCountWord.All), TARGET_WITHIN);

const Targets = z.array(SpellTarget).min(1).max(TARGETS_MAX).readonly();

/**
 * A spell's targets: any one of `any` ("1 willing living creature or 1 undead"), each of `plus` as well ("1 ally and 1
 * enemy"), and the caster with `you`.
 */
export const SpellTargets = z.strictObject({
  any: Targets,
  plus: Targets.optional(),
  you: z.enum(TargetYou).optional(),
});
