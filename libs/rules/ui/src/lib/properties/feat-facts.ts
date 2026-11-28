import type { FeatCategory, Rarity } from '@pioneer/rules/sdk';

import type { ActionKind } from '../picker-cells/picker-cell-messages';
import type { PrerequisiteLine } from '../picker-cells/prerequisite-list/prerequisite-list.component';
import type { CommonFacts } from './common-facts';

/** What `FEAT_PROPERTIES` read from a feat: the common facts and the ones only a feat has. */
export interface FeatFacts extends CommonFacts {
  readonly category: FeatCategory;
  readonly action: ActionKind;
  readonly rarity: Rarity;
  readonly prerequisites: ReadonlyArray<PrerequisiteLine>;
  /** Something to know before picking the feat, already translated; undefined when there is nothing. */
  readonly note: string | undefined;
}
