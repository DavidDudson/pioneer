import { describe, expect, test } from 'bun:test';

import { ContentRegistry, Proficiency, StatisticId } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { array, assert, constantFrom, integer, option, property } from 'fast-check';

import { buildRanks } from './class-build';
import { skillSlots } from './skill-training';
import { skillReads, slotContent } from './slot-offer';
import {
  CharacterBuilder,
  PLAYER_CORE_CLASSES,
  playerCoreClasses,
  playerCoreClassId,
  skillFixtureId,
  skillFixtures,
} from './testing';
import type { SkillFixture } from './testing';

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
registry.register(skillFixtures());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const SKILLS: readonly SkillFixture[] = ['acrobatics', 'athletics', 'medicine', 'religion', 'stealth', 'scribing-lore'];
/** A skill, or nothing, for one slot. */
const skillPick = option(constantFrom(...SKILLS), { nil: undefined });
/** More picks than any class has skill slots: a rogue's seven trained skills and nineteen increases. */
const PICKS_MAX = 40;

/** The lowest level each rank may be reached at by a skill increase (Player Core). */
const RANK_FROM: Readonly<Record<Proficiency, number>> = {
  [Proficiency.Untrained]: 1,
  [Proficiency.Trained]: 1,
  [Proficiency.Expert]: 1,
  [Proficiency.Master]: 7,
  [Proficiency.Legendary]: 15,
};

describe('skill ranks', () => {
  test('no skill exceeds the rank its level allows, whatever the picks', () => {
    assert(
      property(
        constantFrom(...PLAYER_CORE_CLASSES),
        integer({ min: 1, max: 20 }),
        array(skillPick, { minLength: PICKS_MAX, maxLength: PICKS_MAX }),
        (name, level, picks) => {
          const builder = new CharacterBuilder()
            .atLevel(level)
            .picking('class', playerCoreClassId(name))
            .picking('boost:1:class:0', 'dex');
          const empty = builder.build().document;
          for (const [index, slot] of skillSlots(empty, skillReads(empty, content)).entries()) {
            const pick = picks[index];
            if (pick !== undefined) {
              builder.picking(slot.key, skillFixtureId(pick));
            }
          }
          const { document } = builder.build();
          for (const slot of skillSlots(document, skillReads(document, content))) {
            if (slot.rank !== undefined) {
              expect(RANK_FROM[slot.rank]).toBeLessThanOrEqual(slot.level);
            }
          }
          const ranks = buildRanks(document, content);
          for (const skill of SKILLS) {
            const selector = registry.statistic(StatisticId.parse(skillFixtureId(skill)))?.definition.selector;
            const rank = selector === undefined ? undefined : ranks.get(selector);
            expect(RANK_FROM[rank ?? Proficiency.Untrained]).toBeLessThanOrEqual(level);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
