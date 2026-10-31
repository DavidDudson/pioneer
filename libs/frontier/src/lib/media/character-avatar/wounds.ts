import type { ValueOf } from '@pioneer/shared/kernel';

/** What the avatar says in words, so the state never rests on colour alone. */
export const WoundCue = {
  None: 'none',
  /** At or below half of max HP. */
  Bloodied: 'bloodied',
  /** At 0 HP, or death saves are being rolled. */
  Dying: 'dying',
} as const;
export type WoundCue = ValueOf<typeof WoundCue>;

export interface WoundsInput {
  readonly current: number;
  readonly max: number;
  /** Failed death saves so far, or `undefined` while none are being rolled. */
  readonly failedSaves: number | undefined;
}

export interface Wounds {
  /** Red vignette strength, 0 (none) to 1 (full). It only grows as HP falls. */
  readonly vignette: number;
  /** Black overlay strength, 0 to 1. It only grows with each failed death save. */
  readonly darkness: number;
  readonly cue: WoundCue;
}

/** Failed saves that end the character, so the avatar is fully dark at this many. */
export const DEATH_SAVE_LIMIT = 3;

/** The vignette starts at the bloodied line (half of max) and reaches full at 0 HP. */
const BLOODIED_SHARE = 0.5;

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/**
 * How hurt an avatar looks: a red vignette that deepens from half HP down to 0, and a blackening that deepens with
 * each failed death save. Pure and monotone: less HP never gives a weaker vignette, more failed saves never a lighter
 * darkness. A character with no max HP shows nothing.
 */
export function wounds({ current, max, failedSaves }: WoundsInput): Wounds {
  const darkness = failedSaves === undefined ? 0 : clamp01(failedSaves / DEATH_SAVE_LIMIT);
  if (max <= 0) {
    return { vignette: 0, darkness, cue: failedSaves === undefined ? WoundCue.None : WoundCue.Dying };
  }
  const share = clamp01(current / max);
  const vignette = clamp01((BLOODIED_SHARE - share) / BLOODIED_SHARE);
  let cue: WoundCue = WoundCue.None;
  if (share <= BLOODIED_SHARE) {
    cue = WoundCue.Bloodied;
  }
  if (share === 0 || failedSaves !== undefined) {
    cue = WoundCue.Dying;
  }
  return { vignette, darkness, cue };
}
