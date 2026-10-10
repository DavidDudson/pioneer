import { Attribute, ContentLicense, ContentPack, StatisticKind } from '@pioneer/rules/sdk';

/**
 * The core rules (Player Core, 2023 remaster): the statistics every character has, hand-authored rather than
 * imported, since Foundry hard-codes them. Mechanics are ORC-licensed; see NOTICE.md. Domains follow the
 * vocabulary in rules-engine.md ("Statistics are content"); `all` reaches every statistic without being listed.
 */
export const coreRules = ContentPack.define({
  manifest: { id: 'core-rules', title: 'Core Rules', publisher: 'Paizo Inc.', license: ContentLicense.Orc },
  ancestries: [],
  creatures: [],
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
  ],
});
