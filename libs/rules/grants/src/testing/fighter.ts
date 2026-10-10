import { ContentKind } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';

import type { GrantEntry } from '../grant-entry';
import { entry, feat, grantOf, idOf, slotOf } from './builders';

/*
 * A hand-written Fighter for golden tests and benches: the class with its features by level, a fighter feat slot at
 * 1st and every even level, a skill choice, and the feats those slots offer. Names follow Player Core; the rules are
 * simplified to what grant resolution reads. Tables are keyed by level, written as text.
 */

const LEVEL_MAX = 20;
const GREATER_SPECIALIZATION_LEVEL = 15;

/** Levels with a fighter feat slot: 1st and every even level. */
const CLASS_FEAT_LEVELS: readonly number[] = [1, ...Array.from({ length: LEVEL_MAX / 2 }, (_v, at) => (at + 1) * 2)];

/** The class features each level brings. */
const FEATURES: Readonly<Record<string, readonly string[]>> = {
  '1': ['reactive-strike'],
  '3': ['bravery'],
  '5': ['fighter-weapon-mastery'],
  '7': ['battlefield-surveyor', 'weapon-specialization'],
  '9': ['combat-flexibility', 'juggernaut'],
  '11': ['armor-expertise', 'fighter-expertise'],
  '13': ['weapon-legend'],
  '15': ['improved-flexibility', 'tempered-reflexes'],
  '17': ['armor-mastery'],
  '19': ['versatile-legend'],
};

/** Each feature with the level it arrives at, in level order. */
const FEATURE_LEVELS: readonly (readonly [string, number])[] = Object.entries(FEATURES).flatMap(([level, slugs]) =>
  slugs.map((slug): readonly [string, number] => [slug, Number(level)]),
);

/** `GrantItem` of `slug` from `level` on. */
const atLevel = (slug: string, level: number): object => ({
  ...grantOf(slug),
  predicate: [{ gte: ['self:level', level] }],
});

/** A class feat slot at `level`: a fighter feat of the character's level or lower, granted once picked. */
function classFeatSlot(level: number): readonly object[] {
  const flag = `class-feat-${level}`;
  return [
    {
      key: 'ChoiceSet',
      flag,
      prompt: 'Fighter feat',
      predicate: [{ gte: ['self:level', level] }],
      choices: { kind: 'feat', filter: ['item:trait:fighter', { lte: ['item:level', 'self:level'] }] },
    },
    { key: 'GrantItem', item: { choice: flag } },
  ];
}

/** Rule index of the skill choice on the class: after Shield Block and the features. */
const SKILL_RULE = 1 + FEATURE_LEVELS.length;
/** Rule index of the first class feat slot; each slot is a `ChoiceSet` then its `GrantItem`. */
const FIRST_FEAT_RULE = SKILL_RULE + 1;
const RULES_PER_SLOT = 2;

const fighterClass: GrantEntry = {
  ...entry('fighter', [
    grantOf('shield-block'),
    ...FEATURE_LEVELS.map(([slug, level]) => atLevel(slug, level)),
    {
      key: 'ChoiceSet',
      flag: 'skill',
      prompt: 'Trained skill',
      rollOption: 'fighter-skill',
      choices: [
        { value: 'acrobatics', label: 'Acrobatics' },
        { value: 'athletics', label: 'Athletics' },
      ],
    },
    ...CLASS_FEAT_LEVELS.flatMap((level) => classFeatSlot(level)),
  ]),
  kind: ContentKind.Class,
};

/** Weapon Specialization grows into its greater form at 15th. */
const weaponSpecialization = entry('weapon-specialization', [
  atLevel('greater-weapon-specialization', GREATER_SPECIALIZATION_LEVEL),
]);

/** Fighter feats by level: one or more for every slot. */
const FIGHTER_FEATS: Readonly<Record<string, readonly string[]>> = {
  '1': ['double-slice', 'sudden-charge', 'reactive-shield'],
  '2': ['aggressive-block', 'intimidating-strike', 'lunge'],
  '4': ['powerful-shove'],
  '6': ['shatter-defenses', 'shield-warden'],
  '8': ['dueling-riposte', 'sudden-leap'],
  '10': ['twin-riposte'],
  '12': ['brutal-finish', 'dueling-dance'],
  '14': ['improved-reactive-strike', 'two-weapon-flurry'],
  '16': ['shield-paragon'],
  '18': ['savage-critical'],
  '20': ['boundless-reprisals', 'weapon-supremacy'],
};

/** Grants on fighter feats that read other feats: Sudden Leap needs Sudden Charge, Shield Warden the Shield Block feat. */
const FEAT_GRANTS: Readonly<Record<string, object>> = {
  'sudden-leap': { ...grantOf('leaping-charge'), predicate: ['feat:sudden-charge'] },
  'shield-warden': { ...grantOf('warden-stance'), predicate: ['feat:shield-block'] },
};

function fighterFeat(slug: string, level: string): GrantEntry {
  const grant = FEAT_GRANTS[slug];
  const made = feat(slug, ['trait:fighter', `level:${level}`]);
  return grant === undefined ? made : { ...made, rules: entry(slug, [grant]).rules };
}

/** Every entry the Fighter can reach, and a rogue feat its slots never offer. */
export const FIGHTER_CONTENT: readonly GrantEntry[] = [
  fighterClass,
  feat('shield-block', ['trait:general', 'level:1']),
  ...FEATURE_LEVELS.map(([slug]) => (slug === 'weapon-specialization' ? weaponSpecialization : entry(slug))),
  entry('greater-weapon-specialization'),
  ...Object.entries(FIGHTER_FEATS).flatMap(([level, slugs]) => slugs.map((slug) => fighterFeat(slug, level))),
  { ...entry('leaping-charge'), kind: ContentKind.Feat },
  entry('warden-stance'),
  feat('nimble-dodge', ['trait:rogue', 'level:1']),
];

/** The skill choice's slot. */
export const SKILL_SLOT: SlotKey = slotOf('fighter', SKILL_RULE);

/** The class feat slot at `level`. */
export function classFeatSlotAt(level: number): SlotKey {
  return slotOf('fighter', FIRST_FEAT_RULE + CLASS_FEAT_LEVELS.indexOf(level) * RULES_PER_SLOT);
}

/** The feat picked for each class feat slot, by level. */
const PICKED_FEATS: Readonly<Record<string, string>> = {
  '1': 'sudden-charge',
  '2': 'aggressive-block',
  '4': 'powerful-shove',
  '6': 'shield-warden',
  '8': 'sudden-leap',
  '10': 'twin-riposte',
  '12': 'brutal-finish',
  '14': 'improved-reactive-strike',
  '16': 'shield-paragon',
  '18': 'savage-critical',
  '20': 'boundless-reprisals',
};

/** A pick for every class feat slot up to 20th, each a feat of the slot's level or lower, and Athletics. */
export const LEVEL_20_PICKS: readonly (readonly [SlotKey, string])[] = [
  [SKILL_SLOT, 'athletics'],
  ...Object.entries(PICKED_FEATS).map(([level, slug]): readonly [SlotKey, string] => [
    classFeatSlotAt(Number(level)),
    idOf(slug),
  ]),
];
