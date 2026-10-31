import { activeCustomEffects, OverrideRole } from '@pioneer/character/domain';
import type { Character, CustomEffect, CustomEffectLine } from '@pioneer/character/domain';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

/** One line of a custom effect as the list words it: the statistic and what the line does to it. */
interface CustomEffectLineRow {
  readonly statistic: string;
  /** "+1 status". */
  readonly effect: string;
}

/** One switch of an effect: which way, who, and when. */
interface CustomEffectToggleRow {
  readonly enabled: boolean;
  /** Who switched it; undefined when the server could not name them. */
  readonly author: string | undefined;
  readonly at: Temporal.Instant;
}

/** A custom effect in the list: whether it is on, its lines, who added it, and the switches it has had. */
export interface CustomEffectRow {
  readonly effect: CustomEffect;
  readonly lines: readonly CustomEffectLineRow[];
  /** Who added it; undefined when the server could not name them. */
  readonly author: string | undefined;
  readonly at: Temporal.Instant;
  /** The GM of the character's campaign added it, so the player can switch it but not remove it. */
  readonly gm: boolean;
  /** The switches, newest first. */
  readonly history: readonly CustomEffectToggleRow[];
}

/** What a row needs to word an effect; the caller owns the locale and the messages. */
export interface CustomEffectWords {
  readonly line: (line: CustomEffectLine) => CustomEffectLineRow;
  readonly authors: ReadonlyMap<UserId, string>;
}

/** The character's custom effects in force, on or off, in the order they were added. */
export function customEffectRows(character: Character, words: CustomEffectWords): readonly CustomEffectRow[] {
  return activeCustomEffects(character.document).map((effect) => ({
    effect,
    lines: effect.lines.map((line) => words.line(line)),
    author: words.authors.get(effect.by),
    at: Temporal.Instant.from(effect.at),
    gm: effect.byRole === OverrideRole.Gm,
    history: effect.toggles.toReversed().map((toggle) => ({
      enabled: toggle.enabled,
      author: words.authors.get(toggle.by),
      at: Temporal.Instant.from(toggle.at),
    })),
  }));
}
