import type { CompanionStatistics } from '@pioneer/rules/engine';
import { Attribute, CompanionMovement, CompanionSkill, DamageType, Size } from '@pioneer/rules/sdk';

/** Names a message key, with what it interpolates. */
type FactParams = Readonly<Record<string, string | number>>;

export type Translate = (key: string, params?: FactParams) => string;

/** The size names, spelled out so the key check sees each. */
const SIZE_KEYS: Readonly<Record<Size, string>> = {
  [Size.Tiny]: 'rules.facet.size.tiny',
  [Size.Small]: 'rules.facet.size.small',
  [Size.Medium]: 'rules.facet.size.medium',
  [Size.Large]: 'rules.facet.size.large',
  [Size.Huge]: 'rules.facet.size.huge',
  [Size.Gargantuan]: 'rules.facet.size.gargantuan',
};

const ATTRIBUTE_KEYS: Readonly<Record<Attribute, string>> = {
  [Attribute.Strength]: 'rules.attributes.short.str',
  [Attribute.Dexterity]: 'rules.attributes.short.dex',
  [Attribute.Constitution]: 'rules.attributes.short.con',
  [Attribute.Intelligence]: 'rules.attributes.short.int',
  [Attribute.Wisdom]: 'rules.attributes.short.wis',
  [Attribute.Charisma]: 'rules.attributes.short.cha',
};

const SKILL_KEYS: Readonly<Record<CompanionSkill, string>> = {
  [CompanionSkill.Acrobatics]: 'rules.facet.skill.acrobatics',
  [CompanionSkill.Arcana]: 'rules.facet.skill.arcana',
  [CompanionSkill.Athletics]: 'rules.facet.skill.athletics',
  [CompanionSkill.Crafting]: 'rules.facet.skill.crafting',
  [CompanionSkill.Deception]: 'rules.facet.skill.deception',
  [CompanionSkill.Diplomacy]: 'rules.facet.skill.diplomacy',
  [CompanionSkill.Intimidation]: 'rules.facet.skill.intimidation',
  [CompanionSkill.Medicine]: 'rules.facet.skill.medicine',
  [CompanionSkill.Nature]: 'rules.facet.skill.nature',
  [CompanionSkill.Occultism]: 'rules.facet.skill.occultism',
  [CompanionSkill.Performance]: 'rules.facet.skill.performance',
  [CompanionSkill.Religion]: 'rules.facet.skill.religion',
  [CompanionSkill.Society]: 'rules.facet.skill.society',
  [CompanionSkill.Stealth]: 'rules.facet.skill.stealth',
  [CompanionSkill.Survival]: 'rules.facet.skill.survival',
  [CompanionSkill.Thievery]: 'rules.facet.skill.thievery',
};

const MOVEMENT_KEYS: Readonly<Record<CompanionMovement, string>> = {
  [CompanionMovement.Burrow]: 'rules.speeds.burrow',
  [CompanionMovement.Climb]: 'rules.speeds.climb',
  [CompanionMovement.Fly]: 'rules.speeds.fly',
  [CompanionMovement.Swim]: 'rules.speeds.swim',
};

/** The damage types a companion's strikes deal; the three physical ones, which no animal's natural weapon leaves. */
const DAMAGE_KEYS: Readonly<Partial<Record<DamageType, string>>> = {
  [DamageType.Bludgeoning]: 'rules.richText.damageType.bludgeoning',
  [DamageType.Piercing]: 'rules.richText.damageType.piercing',
  [DamageType.Slashing]: 'rules.richText.damageType.slashing',
};

/** The message keys of the lines a companion card shows. */
const CompanionFactMessage = {
  Species: 'character.sheet.companions.species',
  Size: 'character.sheet.companions.size',
  HitPoints: 'character.sheet.companions.hitPoints',
  ArmorClass: 'character.sheet.companions.armorClass',
  Speed: 'character.sheet.companions.speed',
  Movement: 'character.sheet.companions.movement',
  Attributes: 'character.sheet.companions.attributes',
  Saves: 'character.sheet.companions.saves',
  Skills: 'character.sheet.companions.skills',
  Senses: 'character.sheet.companions.senses',
  Special: 'character.sheet.companions.special',
  Strike: 'character.sheet.companions.strike',
} as const;

/** One line of a companion card, already in words. */
export interface CompanionFact {
  readonly key: string;
  readonly text: string;
}

function signed(value: number): string {
  return value < 0 ? `${value}` : `+${value}`;
}

/** A name's message key and the number that goes with it, when there is one. */
type Named = readonly [string, number | undefined];

function listed(pairs: readonly Named[], translate: Translate, show: (value: number) => string): string {
  return pairs
    .flatMap(([name, value]): readonly string[] => (value === undefined ? [] : [`${translate(name)} ${show(value)}`]))
    .join(', ');
}

function fact(key: string, translate: Translate, params: FactParams = {}): CompanionFact {
  return { key, text: translate(key, params) };
}

/** The size, Hit Points and defences, and Speed. */
function bodyFacts(species: string, statistics: CompanionStatistics, translate: Translate): readonly CompanionFact[] {
  return [
    fact(CompanionFactMessage.Species, translate, { species }),
    fact(CompanionFactMessage.Size, translate, { size: translate(SIZE_KEYS[statistics.size]) }),
    fact(CompanionFactMessage.HitPoints, translate, { value: statistics.hitPoints.total }),
    fact(CompanionFactMessage.ArmorClass, translate, { value: statistics.armorClass.total }),
    fact(CompanionFactMessage.Speed, translate, { value: statistics.speed }),
    fact(CompanionFactMessage.Saves, translate, {
      fortitude: signed(statistics.fortitude.total),
      reflex: signed(statistics.reflex.total),
      will: signed(statistics.will.total),
      perception: signed(statistics.perception.total),
    }),
  ];
}

/** The lists: other movement, attributes, skills and senses, each left out when empty. */
function listFacts(statistics: CompanionStatistics, translate: Translate): readonly CompanionFact[] {
  const { attributes, movement, skills } = statistics;

  const lists: readonly (readonly [string, string])[] = [
    [
      CompanionFactMessage.Movement,
      listed(
        Object.values(CompanionMovement).map((kind): Named => [MOVEMENT_KEYS[kind], movement[kind]]),
        translate,
        String,
      ),
    ],
    [
      CompanionFactMessage.Attributes,
      listed(
        Object.values(Attribute).map((attribute): Named => [ATTRIBUTE_KEYS[attribute], attributes[attribute].total]),
        translate,
        signed,
      ),
    ],
    [
      CompanionFactMessage.Skills,
      listed(
        Object.values(CompanionSkill).map((skill): Named => [SKILL_KEYS[skill], skills[skill]?.total]),
        translate,
        signed,
      ),
    ],
    [CompanionFactMessage.Senses, statistics.senses.join(', ')],
  ];

  return lists.flatMap(([key, list]): readonly CompanionFact[] =>
    list === '' ? [] : [fact(key, translate, { list })],
  );
}

/** What the species says under Special, and a line per strike. */
function attackFacts(statistics: CompanionStatistics, translate: Translate): readonly CompanionFact[] {
  const special = statistics.special.map((line): CompanionFact => ({
    key: `${CompanionFactMessage.Special}:${line}`,
    text: translate(CompanionFactMessage.Special, { line }),
  }));

  const strikes = statistics.strikes.map((strike): CompanionFact => ({
    key: `${CompanionFactMessage.Strike}:${strike.slug}`,
    text: translate(CompanionFactMessage.Strike, {
      attack: signed(strike.attack.total),
      dice: strike.dice,
      die: strike.die ?? '',
      bonus: signed(strike.damage.total),
      type: translate(DAMAGE_KEYS[strike.damageType] ?? DAMAGE_KEYS[DamageType.Bludgeoning] ?? ''),
    }),
  }));

  return [...special, ...strikes];
}

/** The lines a card shows for a companion: its size and Hit Points, defences, movement, attributes, skills and strikes. */
export function companionFacts(
  species: string,
  statistics: CompanionStatistics,
  translate: Translate,
): readonly CompanionFact[] {
  return [
    ...bodyFacts(species, statistics, translate),
    ...listFacts(statistics, translate),
    ...attackFacts(statistics, translate),
  ];
}
