import { Pg } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AttributeBoost } from './attribute';
import { Slug } from './content-id';
import { uniqueItems } from './unique-items';
import { HitPoints } from './units';

/** How many skills a class trains beyond its fixed ones; the Intelligence modifier adds to it. */
export const SkillCount = Pg.smallint().nonnegative().brand<'SkillCount'>();
export type SkillCount = z.infer<typeof SkillCount>;

/**
 * What a class does at the table, for choosing one by play style: the five archetypes of the character generator.
 * Named `role` in data to keep `archetype` for the Pathfinder kind (a dedication's archetype).
 */
export const ClassRole = {
  Spellcaster: 'spellcaster',
  Melee: 'melee',
  Ranged: 'ranged',
  Tank: 'tank',
  Healer: 'healer',
} as const;
export type ClassRole = ValueOf<typeof ClassRole>;
export const ClassRoleSchema = z.enum(ClassRole);
const CLASS_ROLE_COUNT = Object.keys(ClassRole).length;

const CLASS_LEVEL_MIN = 1;
const CLASS_LEVEL_MAX = 20;

/** A level of a class's progression, 1st to 20th; branded `Level`, as a narrower range of one. */
const ClassLevel = Pg.smallint().min(CLASS_LEVEL_MIN).max(CLASS_LEVEL_MAX).brand<'Level'>();

/**
 * A class's `data` on the `ContentEntry` envelope. Its progression is in `rules`, keyed by level with predicates
 * (`{ "gte": ["self:level", 5] }`): `Proficiency` elements for its starting and later ranks, a `GrantItem` per
 * class feature, and a `ChoiceSet` querying feats for each feat slot. The one schedule kept here is its skill
 * increases, whose slots the builder opens itself (character-model.md, "Skills").
 */
export const ClassData = z.strictObject({
  /** The attributes its key attribute may be (Foundry pf2e's `keyAbility`). */
  keyAttribute: AttributeBoost,
  /** Hit points gained each level, before Constitution. */
  hitPoints: HitPoints,
  /** Skills trained by the player's choice, beyond the fixed ones in `rules`. */
  additionalSkills: SkillCount,
  /**
   * The levels it gains a skill increase at (Foundry pf2e's `skillIncreaseLevels`), a rogue every level from 2nd.
   * Absent, Player Core's: 3rd and every second level after.
   */
  skillIncreaseLevels: z.array(ClassLevel).max(CLASS_LEVEL_MAX).readonly().check(uniqueItems).optional(),
  /**
   * The tag its subclass options carry (`cleric-doctrine`, `wizard-arcane-school`): the `ChoiceSet` among its class
   * features that queries that tag is its subclass (doctrine, school, order). Absent for a class without one (fighter).
   */
  subclass: Slug.optional(),
  /**
   * The roles it plays, for the generator and pickers that filter classes by play style. Official classes all have at
   * least one (a coverage test); absent for a homebrew class that sets none, which no role filter offers.
   */
  roles: z.array(ClassRoleSchema).max(CLASS_ROLE_COUNT).readonly().check(uniqueItems).optional(),
});
export type ClassData = z.infer<typeof ClassData>;
