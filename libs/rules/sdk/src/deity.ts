import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Attributes } from './attribute';
import { ContentId, Slug } from './content-id';
import { RulesMessage } from './messages';
import { Selector } from './selector';
import { uniqueItems } from './unique-items';

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

/** A cleric domain (`fire`, `healing`). Foundry pf2e keeps the set in config, so it is a brand. */
const DeityDomain = Slug.brand<'DeityDomain'>();

/** A base weapon (`longsword`), for favoured weapons until weapons are content (#232). */
const BaseWeapon = Slug.brand<'BaseWeapon'>();

/** A spell's rank, 1 to 10. */
export const SPELL_RANK_MAX = 10;
const SpellRank = Pg.smallint().min(1).max(SPELL_RANK_MAX).brand<'SpellRank'>();
type SpellRank = z.infer<typeof SpellRank>;

const SANCTIFICATIONS = Object.keys(Sanctification).length;
const FONTS = Object.keys(DivineFont).length;
const DOMAINS_MAX = 16;
const SKILLS_MAX = 4;
const WEAPONS_MAX = 8;
const SKILL_PREFIX = 'skill:';

/** "Can be holy or unholy", "must be holy". */
const DeitySanctification = z.strictObject({
  modal: z.enum(SanctificationModal),
  what: z.array(z.enum(Sanctification)).min(1).max(SANCTIFICATIONS).readonly().check(uniqueItems),
});

const DeityDomains = z.strictObject({
  primary: z.array(DeityDomain).max(DOMAINS_MAX).readonly().check(uniqueItems),
  alternate: z.array(DeityDomain).max(DOMAINS_MAX).readonly().check(uniqueItems),
});

/** A spell the deity grants its clerics at a rank. */
const DeitySpell = z.strictObject({ rank: SpellRank, spell: ContentId });

/** A divine skill: a skill's selector (`skill:medicine`, `skill:lore-boneyard`). */
const DivineSkill = Selector.refine((selector) => selector.startsWith(SKILL_PREFIX), {
  ...issueParams(message(RulesMessage.DeitySkill)),
});

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
    skills: z.array(DivineSkill).max(SKILLS_MAX).readonly().check(uniqueItems),
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
