import { ContentId, ContentKind, SlotKey } from '@pioneer/rules/sdk';
import type { ContentPack } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

const builder = new ContentPackBuilder().withId('feat-slots');

/** The fixture feats, by name. */
export type FeatSlotFixture =
  | 'assurance'
  | 'brawn'
  | 'brutish-shove'
  | 'keen-eye'
  | 'knockdown'
  | 'lunge'
  | 'power-attack'
  | 'reactive-shield'
  | 'sudden-charge';

/** The id of the fixture feat `name`. */
export function featSlotFixtureId(name: FeatSlotFixture): ContentId {
  return ContentId.parse(builder.idOf(ContentKind.Feat, name));
}

/** The fixture fighter, whose feat slots the fixtures fill. */
export const FEAT_SLOT_FIGHTER = ContentId.parse(builder.idOf(ContentKind.Class, 'fighter'));

/** A class feat slot at `level`, as the importer writes one (`kind-fields.ts`). */
function classFeatSlot(level: number): object[] {
  const flag = `class-feat-${level}`;
  const predicate = level === 1 ? {} : { predicate: [{ gte: ['self:level', level] }] };
  return [
    {
      key: 'ChoiceSet',
      flag,
      prompt: 'Fighter feat',
      choices: { kind: 'feat', filter: ['item:trait:fighter', { lte: ['item:level', 'self:level'] }] },
      ...predicate,
    },
    { key: 'GrantItem', item: { choice: flag }, ...predicate },
  ];
}

const FIGHTER = ['fighter'];
/** The levels of the fixture fighter's later feat slots: its 4th-level class feat, and the feature it gains at 8th. */
const FOURTH = 4;
const EIGHTH = 8;
/** Features the fighter gains at 8th level: one with a feat slot of its own, one that grants Power Attack. */
const AT_8 = { predicate: [{ gte: ['self:level', EIGHTH] }] };
const rules = [
  { key: 'Proficiency', selector: 'skill:athletics', rank: 'trained' },
  { key: 'Proficiency', selector: 'perception', rank: 'expert' },
  ...classFeatSlot(1),
  ...classFeatSlot(2),
  ...classFeatSlot(FOURTH),
  { key: 'GrantItem', item: builder.idOf(ContentKind.ClassFeature, 'bonus-feat'), ...AT_8 },
  { key: 'GrantItem', item: builder.idOf(ContentKind.ClassFeature, 'veteran'), ...AT_8 },
];

/**
 * The fighter's feat slots: a class feat slot at 1st, 2nd and 4th level, each keyed by the class and the rule index of
 * its `ChoiceSet`, and the slot of the feature it gains at 8th level, whose `ChoiceSet` has no prompt.
 */
export const FEAT_SLOT_KEYS = {
  level1: SlotKey.parse(`${FEAT_SLOT_FIGHTER}:2`),
  level2: SlotKey.parse(`${FEAT_SLOT_FIGHTER}:4`),
  level4: SlotKey.parse(`${FEAT_SLOT_FIGHTER}:6`),
  bonus: SlotKey.parse(`${builder.idOf(ContentKind.ClassFeature, 'bonus-feat')}:0`),
} as const;

const prerequisites = (text: string): object[] => [{ type: 'paragraph', content: [{ type: 'text', text }] }];

/**
 * A fighter trained in Athletics and expert in Perception, with feat slots at 1st, 2nd and 4th level and, from 8th, a
 * feature's slot and Power Attack granted. Its feats: none, met, not met and unknown prerequisites at 1st level
 * (Power Attack, Brawn, Sudden Charge, Reactive Shield, Keen Eye), a feat prerequisite at 2nd (Brutish Shove), feats
 * at 2nd and 4th, and a skill feat no fighter slot offers (Assurance).
 */
export const FEAT_SLOT_FIXTURES: ContentPack = builder
  .withClass('fighter', ['str'], { rules })
  .withFeat('power-attack', { traits: FIGHTER })
  .withFeat('sudden-charge', {
    traits: FIGHTER,
    data: {
      prerequisites: prerequisites('expert in Athletics'),
      prerequisitePredicate: [{ gte: ['skill:athletics:rank', 2] }],
    },
  })
  .withFeat('reactive-shield', { traits: FIGHTER, data: { prerequisites: prerequisites('an animal companion') } })
  .withFeat('keen-eye', { traits: FIGHTER, data: { prerequisitePredicate: [{ gte: ['perception:rank', 2] }] } })
  .withFeat('brawn', { traits: FIGHTER, data: { prerequisitePredicate: [{ gte: ['attribute:str:mod', 2] }] } })
  .withFeat('brutish-shove', { level: 2, traits: FIGHTER, data: { prerequisitePredicate: ['feat:power-attack'] } })
  .withFeat('lunge', { level: 2, traits: FIGHTER })
  .withFeat('knockdown', { level: 4, traits: FIGHTER })
  .withFeat('assurance')
  .withClassFeature('bonus-feat', {
    rules: [
      {
        key: 'ChoiceSet',
        flag: 'bonus-feat',
        choices: { kind: 'feat', filter: ['item:trait:fighter', { lte: ['item:level', 'self:level'] }] },
      },
      { key: 'GrantItem', item: { choice: 'bonus-feat' } },
    ],
  })
  .withClassFeature('veteran', { rules: [{ key: 'GrantItem', item: builder.idOf(ContentKind.Feat, 'power-attack') }] })
  .build();
