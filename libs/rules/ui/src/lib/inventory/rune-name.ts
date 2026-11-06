import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { DamageType, FundamentalRune } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { DAMAGE_TYPE_MESSAGES } from '../rich-text/rich-text-messages';

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
  Chosen: 'rules.runes.chosen',
  RunedName: 'rules.inventory.runedName',
} as const;

/** Each graded rune's name by grade: "Striking" to "Mythic Striking", "Minor Reinforcing" to "Supreme Reinforcing". */
export const GRADED_RUNE_MESSAGES: Readonly<Record<GradedRune, string>> = {
  [FundamentalRune.Striking]: 'rules.runes.striking',
  [FundamentalRune.Resilient]: 'rules.runes.resilient',
  [FundamentalRune.Reinforcing]: 'rules.runes.reinforcing',
};

/** The damage type a rune's choice names, when it is one. */
function damageTypeOf(choice: string): DamageType | undefined {
  return Object.values(DamageType).find((type) => type === choice);
}

/** The creature types a bane rune is made for, by the choice stored on the rune. */
const CREATURE_TYPE_MESSAGES: Readonly<Record<string, string>> = {
  aberration: 'rules.runes.creatureType.aberration',
  animal: 'rules.runes.creatureType.animal',
  beast: 'rules.runes.creatureType.beast',
  celestial: 'rules.runes.creatureType.celestial',
  construct: 'rules.runes.creatureType.construct',
  dragon: 'rules.runes.creatureType.dragon',
  elemental: 'rules.runes.creatureType.elemental',
  fey: 'rules.runes.creatureType.fey',
  fiend: 'rules.runes.creatureType.fiend',
  'fungus-plant': 'rules.runes.creatureType.fungusPlant',
  giant: 'rules.runes.creatureType.giant',
  monitor: 'rules.runes.creatureType.monitor',
  ooze: 'rules.runes.creatureType.ooze',
};

/** What a rune's crafter chose, in words: a damage type's or creature type's name, else the choice as it was written. */
export function runeChoiceLabel(i18n: TranslocoService, choice: string): string {
  const type = damageTypeOf(choice);
  if (type !== undefined) {
    return i18n.translate(DAMAGE_TYPE_MESSAGES[type]);
  }
  const creature = CREATURE_TYPE_MESSAGES[choice];
  return creature === undefined ? choice : i18n.translate(creature);
}

/** A rune's name with the choice its crafter made after it: "Energy Resistant (fire)"; the name alone with none. */
export function chosenRuneName(i18n: TranslocoService, name: string, choice: string | undefined): string {
  return choice === undefined
    ? name
    : i18n.translate(RuneMessage.Chosen, { name, choice: runeChoiceLabel(i18n, choice) });
}

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
