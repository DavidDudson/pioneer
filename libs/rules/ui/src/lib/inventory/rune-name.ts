import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { FundamentalRune } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

/** The fundamental runes besides potency, which an item's name gives by grade ("Greater Striking"). */
export type GradedRune = Exclude<FundamentalRune, typeof FundamentalRune.Potency>;

/** A fundamental rune besides potency on an item, at its grade. */
export interface GradedRuneLine {
  readonly rune: GradedRune;
  readonly grade: number;
}

/** The runes an item's name reads, as the rules write them: "+1 Striking Flaming". */
export interface LineRunes {
  readonly potency: number | undefined;
  /** Striking, resilient or reinforcing, at their grades, in that order. */
  readonly fundamental: readonly GradedRuneLine[];
  /** The property runes' names, in the order they were etched. */
  readonly property: readonly string[];
}

/** Message keys for runes, spelled out so the key check sees them. */
export const RuneMessage = {
  Potency: 'rules.runes.potency',
  PotencyName: 'rules.runes.potencyName',
  EmptySlot: 'rules.runes.emptySlot',
  NotApplied: 'rules.runes.notApplied',
  NoEffect: 'rules.runes.noEffect',
  Described: 'rules.runes.described',
  RunedName: 'rules.inventory.runedName',
} as const;

/** Each graded rune's name by grade: "Striking" to "Mythic Striking", "Minor Reinforcing" to "Supreme Reinforcing". */
export const GRADED_RUNE_MESSAGES: Readonly<Record<GradedRune, string>> = {
  [FundamentalRune.Striking]: 'rules.runes.striking',
  [FundamentalRune.Resilient]: 'rules.runes.resilient',
  [FundamentalRune.Reinforcing]: 'rules.runes.reinforcing',
};

/** Writes a name with its runes before it, as the rules write it. */
export type RunedNamer = (name: string, runes: LineRunes | undefined) => string;

/**
 * Names an item with its runes before its name: "+1 Striking Flaming Longsword". Re-read when the messages load or
 * the language changes. Call in an injection context.
 */
export function injectRunedName(): Signal<RunedNamer> {
  const i18n = inject(TranslocoService);
  const loaded = i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  const messages = toSignal(merge(i18n.langChanges$, loaded));
  return computed((): RunedNamer => {
    messages();
    return (name, runes) => {
      if (runes === undefined) {
        return name;
      }
      const words = [
        ...(runes.potency === undefined ? [] : [i18n.translate(RuneMessage.Potency, { grade: runes.potency })]),
        ...runes.fundamental.map(({ rune, grade }) => i18n.translate(GRADED_RUNE_MESSAGES[rune], { grade })),
        ...runes.property,
      ];
      return words.length === 0 ? name : i18n.translate(RuneMessage.RunedName, { runes: words.join(' '), name });
    };
  });
}
