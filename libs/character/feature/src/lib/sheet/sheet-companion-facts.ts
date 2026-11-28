import type { CompanionStatistic, CompanionStatistics } from '@pioneer/rules/engine';
import { Attribute, CompanionMovement, CompanionSkill, DamageType, Size } from '@pioneer/rules/sdk';

/** Names a message key, with what it interpolates. */
export type Translate = (key: string, params?: Readonly<Record<string, string | number>>) => string;

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
export const CompanionFactMessage = {
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

function entries<Key extends string>(
  keys: Readonly<Partial<Record<Key, string>>>,
  values: Readonly<Partial<Record<Key, number>>>,
  translate: Translate,
  show: (value: number) => string,
): string {
  return Object.entries<string | undefined>(keys)
    .flatMap(([key, name]): readonly string[] => {
      const value = values[key as Key];

      return name === undefined || value === undefined ? [] : [`${translate(name)} ${show(value)}`];
    })
    .join(', ');
}

function totals(statistics: CompanionStatistics): Readonly<Record<Attribute, number>> {
  const { attributes } = statistics;

  return {
    [Attribute.Strength]: attributes.str.total,
    [Attribute.Dexterity]: attributes.dex.total,
    [Attribute.Constitution]: attributes.con.total,
    [Attribute.Intelligence]: attributes.int.total,
    [Attribute.Wisdom]: attributes.wis.total,
    [Attribute.Charisma]: attributes.cha.total,
  };
}

function totalOf(statistic: CompanionStatistic | undefined): number | undefined {
  return statistic?.total;
}

/** The lines a card shows for a companion: its size and Hit Points, defences, movement, attributes, skills and strikes. */
export function companionFacts(
  species: string,
  statistics: CompanionStatistics,
  translate: Translate,
): readonly CompanionFact[] {
  const skills = Object.fromEntries(
    Object.entries(statistics.skills).map(([skill, statistic]) => [skill, totalOf(statistic)]),
  );
  const movement = entries(MOVEMENT_KEYS, statistics.movement, translate, String);

  const lines: readonly CompanionFact[] = [
    { key: CompanionFactMessage.Species, text: translate(CompanionFactMessage.Species, { species }) },
    {
      key: CompanionFactMessage.Size,
      text: translate(CompanionFactMessage.Size, { size: translate(SIZE_KEYS[statistics.size]) }),
    },
    {
      key: CompanionFactMessage.HitPoints,
      text: translate(CompanionFactMessage.HitPoints, { value: statistics.hitPoints.total }),
    },
    {
      key: CompanionFactMessage.ArmorClass,
      text: translate(CompanionFactMessage.ArmorClass, { value: statistics.armorClass.total }),
    },
    { key: CompanionFactMessage.Speed, text: translate(CompanionFactMessage.Speed, { value: statistics.speed }) },
    {
      key: CompanionFactMessage.Movement,
      text: movement === '' ? '' : translate(CompanionFactMessage.Movement, { list: movement }),
    },
    {
      key: CompanionFactMessage.Attributes,
      text: translate(CompanionFactMessage.Attributes, {
        list: entries(ATTRIBUTE_KEYS, totals(statistics), translate, signed),
      }),
    },
    {
      key: CompanionFactMessage.Saves,
      text: translate(CompanionFactMessage.Saves, {
        fortitude: signed(statistics.fortitude.total),
        reflex: signed(statistics.reflex.total),
        will: signed(statistics.will.total),
        perception: signed(statistics.perception.total),
      }),
    },
    {
      key: CompanionFactMessage.Skills,
      text: translate(CompanionFactMessage.Skills, { list: entries(SKILL_KEYS, skills, translate, signed) }),
    },
    {
      key: CompanionFactMessage.Senses,
      text:
        statistics.senses.length === 0
          ? ''
          : translate(CompanionFactMessage.Senses, { list: statistics.senses.join(', ') }),
    },
    ...statistics.special.map((line): CompanionFact => ({
      key: `${CompanionFactMessage.Special}:${line}`,
      text: translate(CompanionFactMessage.Special, { line }),
    })),
    ...statistics.strikes.map((strike): CompanionFact => ({
      key: `${CompanionFactMessage.Strike}:${strike.slug}`,
      text: translate(CompanionFactMessage.Strike, {
        attack: signed(strike.attack.total),
        dice: strike.dice,
        die: strike.die ?? '',
        bonus: signed(strike.damage.total),
        type: translate(DAMAGE_KEYS[strike.damageType] ?? DAMAGE_KEYS[DamageType.Bludgeoning] ?? ''),
      }),
    })),
  ];

  return lines.filter(({ text }) => text !== '');
}
