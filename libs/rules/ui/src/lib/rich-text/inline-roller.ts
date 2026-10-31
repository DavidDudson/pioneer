import { InjectionToken } from '@angular/core';
import type { CheckNode, DamageNode, Selector } from '@pioneer/rules/sdk';

/** A check in text to roll, with the words the text shows for it ("DC 20 Reflex"), which name the roll. */
export interface InlineCheckRoll {
  readonly node: CheckNode;
  readonly label: string;
}

/** Damage or healing in text to roll, with the words the text shows for it ("2d6 fire"). */
export interface InlineDamageRoll {
  readonly node: DamageNode;
  readonly label: string;
}

/**
 * What clicking a check or damage in text does. The page that shows the text knows who rolls it (a character's sheet,
 * or nobody), so it provides this; without it checks and damage stay plain text.
 */
export interface InlineRoller {
  /** Whether the reader has a value for the statistic a check rolls; a check without one is shown as text. */
  readonly hasStatistic: (selector: Selector) => boolean;
  readonly check: (roll: InlineCheckRoll) => void;
  /** Damage may load what it resolves with on its first roll, so it can finish later. */
  readonly damage: (roll: InlineDamageRoll) => void | Promise<void>;
}

export const INLINE_ROLLER = new InjectionToken<InlineRoller>('INLINE_ROLLER');
