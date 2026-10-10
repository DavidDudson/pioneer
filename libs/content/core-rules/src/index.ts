import {
  Attribute,
  ContentLicense,
  ContentPack,
  RuleElementKey,
  SourceKind,
  StatisticDefinition,
  StatisticKind,
} from '@pioneer/rules/sdk';

/** The domain of statistics keyed to each attribute. */
const ATTRIBUTE_DOMAIN: Readonly<Record<Attribute, string>> = {
  [Attribute.Strength]: 'str-based',
  [Attribute.Dexterity]: 'dex-based',
  [Attribute.Constitution]: 'con-based',
  [Attribute.Intelligence]: 'int-based',
  [Attribute.Wisdom]: 'wis-based',
  [Attribute.Charisma]: 'cha-based',
};

/**
 * A skill check: `skill:<slug>`, its key attribute plus its proficiency. Armor check penalties are rule elements on
 * armor, not part of the base.
 */
function skill(slug: string, name: string, attribute: Attribute): StatisticDefinition {
  return StatisticDefinition.parse({
    slug,
    name,
    selector: `skill:${slug}`,
    domains: ['check', 'skill-check', ATTRIBUTE_DOMAIN[attribute]],
    base: `@attr.${attribute} + @prof.skill.${slug}`,
    kind: StatisticKind.Check,
    keyAttribute: attribute,
  });
}

/**
 * The core rules (Player Core, 2023 remaster): the statistics every character has, hand-authored rather than
 * imported, since Foundry hard-codes them. Mechanics are ORC-licensed; see NOTICE.md. Domains follow the
 * vocabulary in rules-engine.md ("Statistics are content"); `all` reaches every statistic without being listed. The proficiency bonus table is
 * here too, so a variant rule can replace it (ADR-0026).
 */
export const coreRules = ContentPack.define({
  manifest: { id: 'core-rules', title: 'Core Rules', publisher: 'Paizo Inc.', license: ContentLicense.Orc },
  ancestries: [],
  creatures: [],
  // Player Core: untrained adds nothing; trained and up add the rank's bonus plus level.
  proficiencyBonus: {
    untrained: '0',
    trained: '2 + @level',
    expert: '4 + @level',
    master: '6 + @level',
    legendary: '8 + @level',
  },
  variantRules: [
    {
      slug: 'proficiency-without-level',
      name: 'Proficiency Without Level',
      sources: [{ kind: SourceKind.Book, book: 'gm-core', page: 85 }],
      // GM Core: level leaves the bonus, and untrained becomes a -2 penalty.
      rules: [
        {
          key: RuleElementKey.ProficiencyBonus,
          table: { untrained: '-2', trained: '2', expert: '4', master: '6', legendary: '8' },
        },
      ],
    },
  ],
  statistics: [
    {
      slug: 'armor-class',
      name: 'Armor Class',
      selector: 'ac',
      domains: ['dex-based'],
      base: '10 + @attr.dex.capped + @prof.ac',
      kind: StatisticKind.Dc,
      keyAttribute: Attribute.Dexterity,
    },
    {
      slug: 'fortitude',
      name: 'Fortitude',
      selector: 'save:fortitude',
      domains: ['check', 'saving-throw', 'con-based'],
      base: '@attr.con + @prof.save.fortitude',
      kind: StatisticKind.Check,
      keyAttribute: Attribute.Constitution,
    },
    {
      slug: 'reflex',
      name: 'Reflex',
      selector: 'save:reflex',
      domains: ['check', 'saving-throw', 'dex-based'],
      base: '@attr.dex + @prof.save.reflex',
      kind: StatisticKind.Check,
      keyAttribute: Attribute.Dexterity,
    },
    {
      slug: 'will',
      name: 'Will',
      selector: 'save:will',
      domains: ['check', 'saving-throw', 'wis-based'],
      base: '@attr.wis + @prof.save.will',
      kind: StatisticKind.Check,
      keyAttribute: Attribute.Wisdom,
    },
    {
      slug: 'perception',
      name: 'Perception',
      selector: 'perception',
      domains: ['check', 'wis-based'],
      base: '@attr.wis + @prof.perception',
      kind: StatisticKind.Check,
      keyAttribute: Attribute.Wisdom,
    },
    skill('acrobatics', 'Acrobatics', Attribute.Dexterity),
    skill('arcana', 'Arcana', Attribute.Intelligence),
    skill('athletics', 'Athletics', Attribute.Strength),
    skill('crafting', 'Crafting', Attribute.Intelligence),
    skill('deception', 'Deception', Attribute.Charisma),
    skill('diplomacy', 'Diplomacy', Attribute.Charisma),
    skill('intimidation', 'Intimidation', Attribute.Charisma),
    skill('medicine', 'Medicine', Attribute.Wisdom),
    skill('nature', 'Nature', Attribute.Wisdom),
    skill('occultism', 'Occultism', Attribute.Intelligence),
    skill('performance', 'Performance', Attribute.Charisma),
    skill('religion', 'Religion', Attribute.Wisdom),
    skill('society', 'Society', Attribute.Intelligence),
    skill('stealth', 'Stealth', Attribute.Dexterity),
    skill('survival', 'Survival', Attribute.Wisdom),
    skill('thievery', 'Thievery', Attribute.Dexterity),
  ],
});
