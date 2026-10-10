import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Attributes } from './attribute';
import { ContentId, Slug } from './content-id';
import { RulesMessage } from './messages';
import { Selector } from './selector';
import { uniqueList } from './unique-list';

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
export const DeityDomain = Slug.brand<'DeityDomain'>();
export type DeityDomain = z.infer<typeof DeityDomain>;

/** A base weapon (`longsword`), for favoured weapons until weapons are content (#232). */
export const BaseWeapon = Slug.brand<'BaseWeapon'>();
export type BaseWeapon = z.infer<typeof BaseWeapon>;

/** A spell's rank, 1 to 10. */
export const SPELL_RANK_MAX = 10;
export const SpellRank = Pg.smallint().min(1).max(SPELL_RANK_MAX).brand<'SpellRank'>();
export type SpellRank = z.infer<typeof SpellRank>;

const SANCTIFICATIONS = Object.keys(Sanctification).length;
const FONTS = Object.keys(DivineFont).length;
const DOMAINS_MAX = 16;
const SKILLS_MAX = 4;
const WEAPONS_MAX = 8;

/** "Can be holy or unholy", "must be holy". */
export const DeitySanctification = z.strictObject({
  modal: z.enum(SanctificationModal),
  what: uniqueList(z.enum(Sanctification), { min: 1, max: SANCTIFICATIONS }),
});
export type DeitySanctification = z.infer<typeof DeitySanctification>;

export const DeityDomains = z.strictObject({
  primary: uniqueList(DeityDomain, { max: DOMAINS_MAX }),
  alternate: uniqueList(DeityDomain, { max: DOMAINS_MAX }),
});
export type DeityDomains = z.infer<typeof DeityDomains>;

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
 * description. A philosophy has no font, domains or spells.
 */
export const DeityData = z.strictObject({
  category: DeityCategorySchema,
  sanctification: DeitySanctification.optional(),
  domains: DeityDomains,
  font: uniqueList(z.enum(DivineFont), { max: FONTS }),
  /** Its divine attributes. */
  attributes: Attributes,
  /** Its divine skills, by statistic selector (`skill:athletics`). */
  skills: uniqueList(Selector, { max: SKILLS_MAX }),
  /** Its favoured weapons. */
  weapons: uniqueList(BaseWeapon, { max: WEAPONS_MAX }),
  spells: DeitySpells,
});
export type DeityData = z.infer<typeof DeityData>;
