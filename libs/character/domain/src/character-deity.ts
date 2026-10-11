import { BaseWeapon, ContentId, ContentText, DeityData, RichText } from '@pioneer/rules/sdk';
import * as z from 'zod';

import type { CharacterDocument } from './character-document';
import { DEITY_SLOT } from './character-slots';
import { characterGrants } from './class-build';
import type { DeityContent } from './deity-content';
import type { SlotContent } from './slot-offer';

const WEAPONS_MAX = 8;

/** A favoured weapon, by the name of a loaded weapon of its base; without one when no such weapon is loaded. */
const FavoredWeapon = z.strictObject({ weapon: BaseWeapon, name: ContentText.optional() });

/**
 * The character's deity as its sheet shows it (#469): its name, its description, which holds its edicts and
 * anathema, its data (font, sanctification, domains, divine attributes and skills) and its favoured weapons by name.
 */
export const SheetDeity = z.strictObject({
  id: ContentId,
  name: ContentText,
  description: RichText,
  data: DeityData,
  favoredWeapons: z.array(FavoredWeapon).max(WEAPONS_MAX).readonly(),
});
export type SheetDeity = z.output<typeof SheetDeity>;

/** The deity picked in the deity slot, when the slot offers it; undefined with none, or one no loaded pack has. */
export function characterDeity(
  document: CharacterDocument,
  content: SlotContent,
  deities: DeityContent,
): SheetDeity | undefined {
  const pick = characterGrants(document, content).rootSlots.find((slot) => slot.key === DEITY_SLOT)?.pick;
  const deity = pick === undefined ? undefined : deities.deity(pick);
  if (deity === undefined) {
    return undefined;
  }
  const favoredWeapons = deity.data.weapons.map((weapon) => {
    const name = deities.weaponName(weapon);
    return name === undefined ? { weapon } : { weapon, name };
  });
  return { ...deity, favoredWeapons };
}
