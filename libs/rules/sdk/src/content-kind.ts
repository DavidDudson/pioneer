import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/**
 * Kinds of rules content a pack can contribute. The SDK owns the schema for
 * each kind; packs only supply data. Add a kind here, then its schema module.
 */
export const ContentKind = {
  Action: 'action',
  Ancestry: 'ancestry',
  Archetype: 'archetype',
  Armor: 'armor',
  Background: 'background',
  Class: 'class',
  ClassFeature: 'class-feature',
  Condition: 'condition',
  Consumable: 'consumable',
  Creature: 'creature',
  DamageType: 'damage-type',
  Deity: 'deity',
  Effect: 'effect',
  Equipment: 'equipment',
  Feat: 'feat',
  Heritage: 'heritage',
  Kit: 'kit',
  Language: 'language',
  Ritual: 'ritual',
  Rune: 'rune',
  Sense: 'sense',
  Shield: 'shield',
  Spell: 'spell',
  SpellcastingTradition: 'spellcasting-tradition',
  Statistic: 'statistic',
  Trait: 'trait',
  Treasure: 'treasure',
  VariantRule: 'variant-rule',
  Weapon: 'weapon',
} as const;
export type ContentKind = ValueOf<typeof ContentKind>;
export const ContentKindSchema = z.enum(ContentKind);
