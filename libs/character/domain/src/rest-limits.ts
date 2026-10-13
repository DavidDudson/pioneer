import type { StatisticInputs } from '@pioneer/rules/engine';
import { Attribute, ContentId, contentId, EntrySlug, HitPoints, PackId } from '@pioneer/rules/sdk';

import type { RecoveryConditions } from './rest-types';

const PLAYER_CORE = PackId.parse('player-core');
const HEALING_MIN = 1;

/** The conditions Rest eases, as the ids Player Core gives them. */
export const RECOVERY_CONDITIONS: RecoveryConditions = {
  fatigued: ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('condition:fatigued'))),
  drained: ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('condition:drained'))),
};

/** What Rest heals: the Constitution modifier, at least 1, times level (Player Core, Resting). */
export function restHealing({ attributes, level }: Pick<StatisticInputs, 'attributes' | 'level'>): HitPoints {
  return HitPoints.parse(Math.max(attributes.get(Attribute.Constitution), HEALING_MIN) * level);
}
