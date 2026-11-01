import * as z from 'zod';

import { CharacterPacks } from './character-packs';
import { CharacterRuleLimitSettings } from './character-rule-limit-settings';
import { CharacterSheet } from './character-sheet';
import { CharacterVariantRules } from './character-variant-rules';
import { FeatDisplayChoice } from './feat-display';
import { CharacterPlay } from './play-state';
import { RuleLimitsSchema } from './rule-limits';
import { SheetModeChoice } from './sheet-mode';
import { UnenabledContent } from './unenabled-content';

/**
 * Everything a sheet always needs on opening, in one answer instead of one request each. A campaign's GM may read the
 * sheet and its rule limits; every other part is the owner's alone (play state, the viewer's tab and feat display,
 * packs, variant rules, rule limit settings, what the campaign has not enabled), so it is left out for the GM, who gets
 * a 404 for each of them today. Allies and item approvals are not here: they are fetched when their tab opens.
 */
export const CharacterSheetBundle = z.object({
  sheet: CharacterSheet,
  ruleLimits: RuleLimitsSchema,
  play: CharacterPlay.optional(),
  sheetMode: SheetModeChoice.optional(),
  featDisplay: FeatDisplayChoice.optional(),
  packs: CharacterPacks.optional(),
  variantRules: CharacterVariantRules.optional(),
  ruleLimitSettings: CharacterRuleLimitSettings.optional(),
  unenabled: UnenabledContent.optional(),
});
export type CharacterSheetBundle = z.output<typeof CharacterSheetBundle>;
