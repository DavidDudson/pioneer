import { RuleInPlay, StatisticInputsJson } from '@pioneer/rules/engine';
import type { StatisticInputs } from '@pioneer/rules/engine';
import { PredicateFacts } from '@pioneer/rules/predicate';
import {
  contentId,
  ContentId,
  ContentRegistry,
  ItemState,
  OriginHopKind,
  PackId,
  RollOption,
  Slug,
} from '@pioneer/rules/sdk';

import { coreRules } from './core-rules';

/*
 * The golden Fighter: a human Fighter with the farmhand background, built by Player Core's rules, in scale mail with
 * a steel shield and a longsword. Its gear reaches the statistics as rule elements on made-up entries, as inventory
 * will put them in play, and its Dexterity cap as an input, until grant resolution and inventory supply both
 * (Epic 3.4). The builders take the level and ranks, so the level 20 bench can reuse them.
 */

/** The pack the gear's entries are on; nothing registers it. */
const GEAR_PACK = PackId.parse('golden-fighter');

export const SCALE_MAIL = ContentId.parse(contentId(GEAR_PACK, Slug.parse('scale-mail')));
export const STEEL_SHIELD = ContentId.parse(contentId(GEAR_PACK, Slug.parse('steel-shield')));
export const LONGSWORD = ContentId.parse(contentId(GEAR_PACK, Slug.parse('longsword')));

/** A piece of gear in the inventory: its entry, its inventory item, and whether it is worn or held. */
interface Carried {
  readonly entry: ContentId;
  readonly item: string;
  readonly state: ItemState;
}

const ARMOR: Carried = { entry: SCALE_MAIL, item: '00000000-0000-4000-8000-00000000a001', state: ItemState.Worn };
const SHIELD: Carried = { entry: STEEL_SHIELD, item: '00000000-0000-4000-8000-00000000a002', state: ItemState.Held };
const WEAPON: Carried = { entry: LONGSWORD, item: '00000000-0000-4000-8000-00000000a003', state: ItemState.Held };

/**
 * Wearing armor whose Strength value the character meets: Player Core's armor check penalty goes away and the Speed
 * penalty drops by 5 feet. Inventory will set it; the golden Fighter's Strength +4 meets scale mail's +2.
 */
export const STRENGTH_MET = 'armor:strength-requirement-met';
/** A raised shield, situational until play state tracks Raise a Shield. */
const SHIELD_RAISED = 'self:action:raise-a-shield';

/** Why the character has a piece of gear, as JSON: an inventory hop to its entry. */
function originOf({ entry, item, state }: Carried): object {
  return {
    hops: [{ kind: OriginHopKind.Inventory, item, state }],
    entry,
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
  };
}

/** Rule `rule` of the gear `on`, in play. */
function onGear(element: object, on: Carried, rule: number): RuleInPlay {
  return RuleInPlay.parse({ element, origin: originOf(on), rule });
}

/** The Strength- and Dexterity-based skills an armor check penalty applies to. */
const CHECK_PENALTY_SKILLS = ['skill:acrobatics', 'skill:athletics', 'skill:stealth', 'skill:thievery'];
const UNLESS_STRENGTH_MET = [{ not: STRENGTH_MET }];

/** Scale mail (Player Core): +3 item bonus to AC, Dexterity cap +2, check penalty -2, Speed penalty -5 feet. */
export const scaleMail: readonly RuleInPlay[] = [
  onGear({ key: 'FlatModifier', type: 'item', value: 3, selectors: ['ac'] }, ARMOR, 0),
  onGear(
    {
      key: 'FlatModifier',
      type: 'untyped',
      value: -2,
      selectors: CHECK_PENALTY_SKILLS,
      slug: 'armor-check-penalty',
      predicate: UNLESS_STRENGTH_MET,
    },
    ARMOR,
    1,
  ),
  onGear(
    {
      key: 'FlatModifier',
      type: 'untyped',
      value: -5,
      selectors: ['all-speeds'],
      slug: 'armor-speed-penalty',
      predicate: UNLESS_STRENGTH_MET,
    },
    ARMOR,
    2,
  ),
];

/** Scale mail's Dexterity cap, an input until the engine collects `DexterityCap` rule elements. */
const SCALE_MAIL_DEXTERITY_CAP = 2;

/** A steel shield (Player Core): +2 circumstance bonus to AC while raised. */
export const steelShield: readonly RuleInPlay[] = [
  onGear(
    { key: 'FlatModifier', type: 'circumstance', value: 2, selectors: ['ac'], predicate: [SHIELD_RAISED] },
    SHIELD,
    0,
  ),
];

/** The gear's rule elements in play. */
export const gear: readonly RuleInPlay[] = [...scaleMail, ...steelShield];

/** The ranks a Fighter's class gives at 1st level, with the golden build's skills. */
export const LEVEL_1_RANKS: Readonly<Record<string, string>> = {
  perception: 'expert',
  'save:fortitude': 'expert',
  'save:reflex': 'expert',
  'save:will': 'trained',
  'class-dc': 'trained',
  ac: 'trained',
  'attack:unarmed': 'expert',
  'attack:simple': 'expert',
  'attack:martial': 'expert',
  'attack:advanced': 'trained',
  // Acrobatics from the class's choice, Athletics from farmhand, three more for 3 plus Intelligence.
  'skill:acrobatics': 'trained',
  'skill:athletics': 'trained',
  'skill:intimidation': 'trained',
  'skill:medicine': 'trained',
  'skill:survival': 'trained',
};

/**
 * Attributes from a legal Player Core build: human boosts Strength and Dexterity, farmhand Strength and
 * Constitution, the class Strength, and the four free boosts Strength, Dexterity, Constitution and Wisdom.
 */
export const LEVEL_1_ATTRIBUTES: Readonly<Record<string, number>> = { str: 4, dex: 2, con: 2, int: 0, wis: 1, cha: 0 };

/** The golden Fighter's level, attributes and ranks; each one left out is the 1st level build's. */
export interface FighterBuild {
  readonly level?: number;
  readonly attributes?: Readonly<Record<string, number>>;
  readonly ranks?: Readonly<Record<string, string>>;
}

/** The golden Fighter's statistic inputs: human (8 Hit Points, 25 feet), Fighter (10 Hit Points, Strength). */
export function goldenFighter({
  level = 1,
  attributes = LEVEL_1_ATTRIBUTES,
  ranks = LEVEL_1_RANKS,
}: FighterBuild = {}): StatisticInputs {
  return StatisticInputsJson.parse({
    level,
    attributes,
    ranks,
    dexterityCap: SCALE_MAIL_DEXTERITY_CAP,
    ancestry: { hitPoints: 8, speed: 25 },
    class: { hitPoints: 10, keyAttribute: 'str' },
    weapons: [{ slug: 'longsword', category: 'martial', traits: ['versatile-p'], origin: originOf(WEAPON) }],
  });
}

/** The roll options a derivation for the golden Fighter has; by default, that it meets its armor's Strength. */
export function fighterFacts(options: readonly string[] = [STRENGTH_MET]): PredicateFacts {
  const registry = new ContentRegistry();
  registry.register(coreRules);
  return new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    registry.rollOptionNamespaces(),
  );
}
