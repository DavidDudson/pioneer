import { ProficiencyBonusTable } from '../proficiency';

/**
 * Player Core's proficiency bonuses, for tests below the content packs: untrained adds nothing, otherwise the rank's
 * bonus plus level. The core rules pack holds the real table.
 */
export const PLAYER_CORE_PROFICIENCY_BONUS: ProficiencyBonusTable = ProficiencyBonusTable.parse({
  untrained: '0',
  trained: '2 + @level',
  expert: '4 + @level',
  master: '6 + @level',
  legendary: '8 + @level',
});
