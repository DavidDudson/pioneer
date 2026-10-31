import { describe, expect, test } from 'bun:test';

import { ChoiceValue, ContentId, ContentKind, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { repeatedTrainings } from './skill-repeats';
import { slotContent } from './slot-offer';
import { CharacterBuilder, playerCoreClasses, playerCoreClassId, skillFixtureId, skillFixtures } from './testing';
import type { PlayerCoreClass } from './testing';

const ALL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const backgrounds = new ContentPackBuilder()
  .withId('repeat-backgrounds')
  .withBackground('acolyte', [ALL], [{ key: 'Proficiency', selector: 'skill:religion', rank: 'trained' }])
  .withBackground('gladiator', [ALL], [{ key: 'Proficiency', selector: 'skill:athletics', rank: 'trained' }])
  .withBackground('scribe', [ALL], [{ key: 'Proficiency', selector: 'skill:lore:scribing', rank: 'trained' }])
  .build();
const ids = new ContentPackBuilder().withId('repeat-backgrounds');
const acolyte = ChoiceValue.parse(ids.idOf(ContentKind.Background, 'acolyte'));
const gladiator = ChoiceValue.parse(ids.idOf(ContentKind.Background, 'gladiator'));
const scribe = ChoiceValue.parse(ids.idOf(ContentKind.Background, 'scribe'));

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
registry.register(skillFixtures());
registry.register(backgrounds);
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const BACKGROUND = SlotKey.parse('background');

function as(name: PlayerCoreClass): CharacterBuilder {
  return new CharacterBuilder().named(name).picking('class', playerCoreClassId(name)).picking('boost:1:class:0', 'dex');
}

function repeatedBy(
  builder: CharacterBuilder,
  values: readonly ChoiceValue[],
): ReadonlyMap<ChoiceValue, ChoiceValue[]> {
  const { document } = builder.build();
  const repeats = repeatedTrainings(document, content, { slot: BACKGROUND, values });
  return new Map([...repeats].map(([value, skills]) => [value, skills.map((skill) => skill.id)]));
}

describe('the options that would train a skill again', () => {
  test('mark a background the class trains a skill of already, and no other', () => {
    const repeats = repeatedBy(as('cleric'), [acolyte, gladiator, scribe]);

    expect([...repeats.keys()]).toEqual([acolyte]);
    expect(repeats.get(acolyte)).toEqual([skillFixtureId('religion')]);
  });

  test('mark a background that trains a skill an earlier trained skill pick took', () => {
    const cleric = as('cleric').picking('skill-training:1:0', skillFixtureId('athletics'));

    expect([...repeatedBy(cleric, [acolyte, gladiator, scribe]).keys()]).toEqual([acolyte, gladiator]);
  });

  test('read the slot empty, so the background it holds does not count against its own option', () => {
    const cleric = as('cleric').picking('background', ContentId.parse(gladiator));

    expect([...repeatedBy(cleric, [acolyte, gladiator]).keys()]).toEqual([acolyte]);
  });

  test('mark the current pick when another entry trains the same skill', () => {
    const cleric = as('cleric').picking('background', ContentId.parse(acolyte));

    expect([...repeatedBy(cleric, [acolyte]).keys()]).toEqual([acolyte]);
  });
});
