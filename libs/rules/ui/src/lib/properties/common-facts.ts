import type { LinkTarget } from '@pioneer/frontier';
import type { ContentId, SourceRef } from '@pioneer/rules/sdk';

import type { Chip } from '../picker-cells/chip-list/chip-list.component';

/** What every entry a table lists has: the facts `COMMON_PROPERTIES` read, so a row of any kind can be listed by them. */
export interface CommonFacts {
  /** The entry's content id, which its name previews unless `entry` says otherwise. */
  readonly id: string;
  readonly name: string;
  /** Undefined for an entry without a level, which sorts first. */
  readonly level: number | undefined;
  readonly traits: ReadonlyArray<Chip>;
  readonly sources: ReadonlyArray<SourceRef>;
  /** The entry the name previews, when it is not `id`. */
  readonly entry?: ContentId | undefined;
  /** Where the name links to, when the entry has a page. */
  readonly to?: LinkTarget | undefined;
}
