import * as z from 'zod';

import { CharacterId, CharacterName } from './character-fields';
import { AttachedCampaignName } from './character-packs';

/** Another character in the campaign a character is attached to: who may give it a buff. */
export const CampaignAlly = z.object({ characterId: CharacterId, name: CharacterName });
export type CampaignAlly = z.output<typeof CampaignAlly>;

/** JSON shape of the allies a character can name as the giver of an effect. */
export const CharacterAllies = z.object({
  /** The campaign they are in; none when the character is in no campaign, and then there are no allies. */
  campaign: AttachedCampaignName.optional(),
  /** The rest of the party, by name. */
  allies: z.array(CampaignAlly).readonly(),
});
export type CharacterAllies = z.output<typeof CharacterAllies>;
