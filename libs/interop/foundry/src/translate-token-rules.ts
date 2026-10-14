import type { ContentId } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

/**
 * Foundry rule elements the import drops on purpose rather than lists as untranslatable: they only change a Foundry
 * token (its light, the icon of an effect on it, a mark), which Pioneer has no token for. They are reported apart
 * from the real gaps and are not in the backlog. `TokenLight`'s bright and dim radii stay in the item's description
 * and in the pinned release, for the light levels of [#685 feat(content): light levels and terrain contexts].
 */

export const DroppedReason = {
  /** The element changes how a Foundry token looks, which Pioneer has no token to carry. */
  TokenOnly: 'token-only',
} as const;
export type DroppedReason = ValueOf<typeof DroppedReason>;

/** A rule element dropped on purpose, and why. */
export interface DroppedRule {
  readonly entry: ContentId;
  readonly key: string;
  readonly reason: DroppedReason;
}

const DROPPED_KEYS: ReadonlyMap<string, DroppedReason> = new Map([
  ['TokenLight', DroppedReason.TokenOnly],
  ['TokenEffectIcon', DroppedReason.TokenOnly],
  ['TokenMark', DroppedReason.TokenOnly],
]);

function keyOf(raw: unknown): string {
  if (typeof raw !== 'object' || raw === null || !('key' in raw)) {
    return '';
  }
  return typeof raw.key === 'string' ? raw.key : '';
}

/** Rule elements split into those Pioneer reads and those dropped on purpose. */
interface Partitioned {
  readonly kept: readonly unknown[];
  readonly dropped: readonly DroppedRule[];
}

/** The rules of `raws` Pioneer reads, and those dropped on purpose. */
export function withoutDropped(entry: ContentId, raws: readonly unknown[]): Partitioned {
  const reasons = raws.map((raw) => DROPPED_KEYS.get(keyOf(raw)));
  return {
    kept: raws.filter((_raw, index) => reasons[index] === undefined),
    dropped: raws.flatMap((raw, index) => {
      const reason = reasons[index];
      return reason === undefined ? [] : [{ entry, key: keyOf(raw), reason }];
    }),
  };
}
