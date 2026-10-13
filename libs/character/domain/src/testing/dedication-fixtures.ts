import { ContentId, ContentKind, SlotKey } from '@pioneer/rules/sdk';
import type { ContentPack } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

const builder = new ContentPackBuilder().withId('dedications');

/** The fixture feats, by name: each archetype's dedication and its other feats. */
export type DedicationFixture =
  | 'medic-dedication'
  | 'medic-basic'
  | 'medic-advanced'
  | 'sentinel-dedication'
  | 'sentinel-basic'
  | 'scout-dedication'
  | 'scout-basic'
  | 'power-attack';

/** The id of the fixture feat `name`. */
export function dedicationFixtureId(name: DedicationFixture): ContentId {
  return ContentId.parse(builder.idOf(ContentKind.Feat, name));
}

/** The fixture class, whose six archetype feat slots (1st to 6th level) the fixtures fill. */
export const DEDICATION_CLASS = ContentId.parse(builder.idOf(ContentKind.Class, 'free-archetype'));

const SLOT_COUNT = 6;
const SLOT_LEVELS: readonly number[] = Array.from({ length: SLOT_COUNT }, (_unused, index) => index + 1);

/** An archetype feat slot at `level`, as the importer writes one (`kind-fields.ts`). */
function archetypeSlot(level: number): object[] {
  const flag = `archetype-feat-${level}`;
  const predicate = level === 1 ? {} : { predicate: [{ gte: ['self:level', level] }] };
  return [
    {
      key: 'ChoiceSet',
      flag,
      prompt: 'Archetype feat',
      choices: { kind: 'feat', filter: ['item:trait:archetype', { lte: ['item:level', 'self:level'] }] },
      ...predicate,
    },
    { key: 'GrantItem', item: { choice: flag }, ...predicate },
  ];
}

/** The archetype feat slot that opens at `level`: keyed by the class and the rule index of its `ChoiceSet`. */
export function dedicationSlot(level: number): SlotKey {
  return SlotKey.parse(`${DEDICATION_CLASS}:${(level - 1) * 2}`);
}

const ARCHETYPE = ['archetype'];
const archetypeId = (name: string): string => builder.idOf(ContentKind.Archetype, name);
const featData = (archetype: string): object => ({ category: 'class', archetype: archetypeId(archetype) });

/**
 * A class with archetype feat slots from 1st to 6th level and three archetypes: Medic and Sentinel with Player Core's
 * lock of two other feats, and Scout, a homebrew one with a lock of one. Power
 * Attack belongs to no archetype.
 */
export const DEDICATION_FIXTURES: ContentPack = builder
  .withClass('free-archetype', ['str'], { rules: SLOT_LEVELS.flatMap((level) => archetypeSlot(level)) })
  .withFeat('medic-dedication', { traits: [...ARCHETYPE, 'dedication'], data: featData('medic') })
  .withFeat('medic-basic', { traits: ARCHETYPE, data: featData('medic') })
  .withFeat('medic-advanced', { traits: ARCHETYPE, data: featData('medic') })
  .withFeat('sentinel-dedication', { traits: [...ARCHETYPE, 'dedication'], data: featData('sentinel') })
  .withFeat('sentinel-basic', { traits: ARCHETYPE, data: featData('sentinel') })
  .withFeat('scout-dedication', { traits: [...ARCHETYPE, 'dedication'], data: featData('scout') })
  .withFeat('scout-basic', { traits: ARCHETYPE, data: featData('scout') })
  .withFeat('power-attack', { traits: ARCHETYPE })
  .withItem(ContentKind.Archetype, 'medic', { dedication: builder.idOf(ContentKind.Feat, 'medic-dedication') })
  .withItem(ContentKind.Archetype, 'sentinel', { dedication: builder.idOf(ContentKind.Feat, 'sentinel-dedication') })
  .withItem(ContentKind.Archetype, 'scout', {
    dedication: builder.idOf(ContentKind.Feat, 'scout-dedication'),
    dedicationLock: 1,
  })
  .build();

/** The id of the fixture archetype `name`: `medic`, `sentinel` or `scout`. */
export function dedicationArchetypeId(name: 'medic' | 'scout' | 'sentinel'): ContentId {
  return ContentId.parse(archetypeId(name));
}
