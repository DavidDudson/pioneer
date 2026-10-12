import { issueParams, message } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Attributes } from './attribute';
import { ContentId } from './content-id';
import { RulesMessage } from './messages';
import { SkillSelector } from './selector';
import { SPELL_RANK_MAX, SpellRank } from './spell-rank';
import { uniqueItems } from './unique-items';
import { BaseWeapon } from './weapon';

/** What a deity entry is, as Foundry pf2e sorts them. */
export const DeityCategory = {
  Deity: 'deity',
  Pantheon: 'pantheon',
  Covenant: 'covenant',
  Philosophy: 'philosophy',
} as const;
export type DeityCategory = ValueOf<typeof DeityCategory>;
const DeityCategorySchema = z.enum(DeityCategory);

/** Whether followers may or must be sanctified. */
export const SanctificationModal = { Can: 'can', Must: 'must' } as const;
export type SanctificationModal = ValueOf<typeof SanctificationModal>;

export const Sanctification = { Holy: 'holy', Unholy: 'unholy' } as const;
export type Sanctification = ValueOf<typeof Sanctification>;

/** The divine font a cleric of the deity gets. */
export const DivineFont = { Harm: 'harm', Heal: 'heal' } as const;
export type DivineFont = ValueOf<typeof DivineFont>;

/**
 * A cleric domain, as Foundry pf2e's config keys them (`CONFIG.PF2E.deityDomains`), apocryphal variants included.
 * The remaster renamed three without changing the key: `delirium` is Disorientation, `void` Nothingness and
 * `wyrmkin` Dragon.
 */
export const DeityDomain = {
  Abomination: 'abomination',
  Air: 'air',
  AirApocryphal: 'air-apocryphal',
  Ambition: 'ambition',
  AmbitionApocryphal: 'ambition-apocryphal',
  Change: 'change',
  Cities: 'cities',
  Cold: 'cold',
  Confidence: 'confidence',
  ConfidenceApocryphal: 'confidence-apocryphal',
  Creation: 'creation',
  Darkness: 'darkness',
  DarknessApocryphal: 'darkness-apocryphal',
  Death: 'death',
  DeathApocryphal: 'death-apocryphal',
  Decay: 'decay',
  Delirium: 'delirium',
  Destruction: 'destruction',
  Dreams: 'dreams',
  Dust: 'dust',
  Duty: 'duty',
  Earth: 'earth',
  Family: 'family',
  Fate: 'fate',
  FateApocryphal: 'fate-apocryphal',
  Fire: 'fire',
  FireApocryphal: 'fire-apocryphal',
  Freedom: 'freedom',
  Glyph: 'glyph',
  Healing: 'healing',
  Indulgence: 'indulgence',
  IndulgenceApocryphal: 'indulgence-apocryphal',
  Introspection: 'introspection',
  Knowledge: 'knowledge',
  KnowledgeApocryphal: 'knowledge-apocryphal',
  Lightning: 'lightning',
  Luck: 'luck',
  Magic: 'magic',
  Metal: 'metal',
  Might: 'might',
  MightApocryphal: 'might-apocryphal',
  Moon: 'moon',
  Naga: 'naga',
  Nature: 'nature',
  Nightmares: 'nightmares',
  Pain: 'pain',
  Passion: 'passion',
  Perfection: 'perfection',
  Plague: 'plague',
  Protection: 'protection',
  Repose: 'repose',
  Secrecy: 'secrecy',
  SecrecyApocryphal: 'secrecy-apocryphal',
  Sorrow: 'sorrow',
  Soul: 'soul',
  Star: 'star',
  Sun: 'sun',
  Swarm: 'swarm',
  Time: 'time',
  Toil: 'toil',
  Travel: 'travel',
  TravelApocryphal: 'travel-apocryphal',
  Trickery: 'trickery',
  Truth: 'truth',
  Tyranny: 'tyranny',
  Undeath: 'undeath',
  Vigil: 'vigil',
  Void: 'void',
  Water: 'water',
  WaterApocryphal: 'water-apocryphal',
  Wealth: 'wealth',
  Wood: 'wood',
  Wyrmkin: 'wyrmkin',
  Zeal: 'zeal',
} as const;
export type DeityDomain = ValueOf<typeof DeityDomain>;
const DeityDomainSchema = z.enum(DeityDomain);

const SANCTIFICATIONS = Object.keys(Sanctification).length;
const FONTS = Object.keys(DivineFont).length;
const DOMAINS_MAX = 16;
const SKILLS_MAX = 4;
const WEAPONS_MAX = 8;

/** "Can be holy or unholy", "must be holy". */
const DeitySanctification = z.strictObject({
  modal: z.enum(SanctificationModal),
  what: z.array(z.enum(Sanctification)).min(1).max(SANCTIFICATIONS).readonly().check(uniqueItems),
});

const DeityDomains = z.strictObject({
  primary: z.array(DeityDomainSchema).max(DOMAINS_MAX).readonly().check(uniqueItems),
  alternate: z.array(DeityDomainSchema).max(DOMAINS_MAX).readonly().check(uniqueItems),
});

/** A spell the deity grants its clerics at a rank. */
export const DeitySpell = z.strictObject({ rank: SpellRank, spell: ContentId });
export type DeitySpell = z.infer<typeof DeitySpell>;

/** A deity's spells, at most one per rank (Foundry pf2e keys them by rank). */
const DeitySpells = z
  .array(DeitySpell)
  .max(SPELL_RANK_MAX)
  .readonly()
  .check((context) => {
    const seen = new Set<SpellRank>();
    for (const [index, { rank }] of context.value.entries()) {
      if (seen.has(rank)) {
        context.issues.push({
          code: 'custom',
          input: context.value,
          path: [index, 'rank'],
          ...issueParams(message(RulesMessage.DeitySpellRank, { rank })),
        });
      }
      seen.add(rank);
    }
  });

/**
 * A deity's `data` on the `ContentEntry` envelope: what the builder offers a follower. Edicts and anathema are its
 * description. A philosophy has no font, domains or spells, as in Foundry pf2e.
 */
export const DeityData = z
  .strictObject({
    category: DeityCategorySchema,
    sanctification: DeitySanctification.optional(),
    domains: DeityDomains,
    font: z.array(z.enum(DivineFont)).max(FONTS).readonly().check(uniqueItems),
    /** Its divine attributes. */
    attributes: Attributes,
    /** Its divine skills, by statistic selector (`skill:athletics`). */
    skills: z.array(SkillSelector).max(SKILLS_MAX).readonly().check(uniqueItems),
    /** Its favoured weapons. */
    weapons: z.array(BaseWeapon).max(WEAPONS_MAX).readonly().check(uniqueItems),
    spells: DeitySpells,
  })
  .check((context) => {
    const { category, domains, font, spells } = context.value;
    if (category !== DeityCategory.Philosophy) {
      return;
    }
    const granted: readonly (readonly PropertyKey[])[] = [
      ...(domains.primary.length > 0 ? [['domains', 'primary']] : []),
      ...(domains.alternate.length > 0 ? [['domains', 'alternate']] : []),
      ...(font.length > 0 ? [['font']] : []),
      ...(spells.length > 0 ? [['spells']] : []),
    ];
    for (const path of granted) {
      context.issues.push({
        code: 'custom',
        input: context.value,
        path: [...path],
        ...issueParams(message(RulesMessage.DeityPhilosophy)),
      });
    }
  });
export type DeityData = z.infer<typeof DeityData>;
