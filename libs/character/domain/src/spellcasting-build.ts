import { spellcastingInPlay } from '@pioneer/rules/engine';
import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import type { GrantResolution } from '@pioneer/rules/grants';

import { grantedRules } from './class-build';

/**
 * The character's spellcasting entries: one per slug among the `SpellcastingEntry` elements its effective set holds
 * (a class's spellcasting feature, a witch's patron, a multiclass dedication), in slug order. Each derives a spell
 * attack and a spell DC (ADR-0030, ADR-0037).
 */
export function characterSpellcasting(resolution: GrantResolution): readonly SpellcastingInPlay[] {
  return spellcastingInPlay({ rules: grantedRules(resolution), facts: resolution.facts });
}
