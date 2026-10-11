import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { CarryState, HANDS_MAX, handsNeeded, isWearable, ONE_HAND } from '@pioneer/character/domain';
import type { Carry, ItemEntry } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import type { ValueOf } from '@pioneer/shared/kernel';
import { filter, merge } from 'rxjs';

/** How an item can be carried, as the sheet offers it: held in one hand and in two are apart. */
export const CarryChoice = {
  Worn: 'worn',
  OneHand: 'held-one',
  TwoHands: 'held-two',
  Stowed: 'stowed',
  Dropped: 'dropped',
} as const;
export type CarryChoice = ValueOf<typeof CarryChoice>;

const CARRY_OF: Readonly<Record<CarryChoice, Carry>> = {
  [CarryChoice.Worn]: { state: CarryState.Worn },
  [CarryChoice.OneHand]: { state: CarryState.Held, hands: ONE_HAND },
  [CarryChoice.TwoHands]: { state: CarryState.Held, hands: HANDS_MAX },
  [CarryChoice.Stowed]: { state: CarryState.Stowed },
  [CarryChoice.Dropped]: { state: CarryState.Dropped },
};

const LABELS: Readonly<Record<CarryChoice, string>> = {
  [CarryChoice.Worn]: 'character.sheet.inventory.carry.worn',
  [CarryChoice.OneHand]: 'character.sheet.inventory.carry.oneHand',
  [CarryChoice.TwoHands]: 'character.sheet.inventory.carry.twoHands',
  [CarryChoice.Stowed]: 'character.sheet.inventory.carry.stowed',
  [CarryChoice.Dropped]: 'character.sheet.inventory.carry.dropped',
};

/** The carry a choice stands for. */
export function carryOf(choice: CarryChoice): Carry {
  return CARRY_OF[choice];
}

/** The choice that stands for `carry`. */
export function choiceOf(carry: Carry): CarryChoice {
  if (carry.state === CarryState.Held) {
    return carry.hands === ONE_HAND ? CarryChoice.OneHand : CarryChoice.TwoHands;
  }
  return carry.state;
}

/**
 * The ways `entry` can be carried, in sheet order: worn only if it is armour or worn, in one hand only if one hand
 * holds it; in two hands, stowed and dropped always. Content that is gone can't be worn.
 */
export function carryChoices(entry: ItemEntry | undefined): readonly CarryChoice[] {
  const wearable = entry !== undefined && isWearable(entry);
  const oneHand = handsNeeded(entry) === ONE_HAND;
  return Object.values(CarryChoice).filter(
    (choice) => (choice !== CarryChoice.Worn || wearable) && (choice !== CarryChoice.OneHand || oneHand),
  );
}

/**
 * The ways the item of `entry` can be carried, labelled. Re-read when the messages load or the language changes, as
 * the place options are. Call in an injection context.
 */
export function injectCarryOptions(entry: Signal<ItemEntry | undefined>): Signal<readonly SelectOption<string>[]> {
  const i18n = inject(TranslocoService);
  const loaded = i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  const messages = toSignal(merge(i18n.langChanges$, loaded));
  return computed(() => {
    messages();
    return carryChoices(entry()).map((choice) => ({ value: choice, label: i18n.translate(LABELS[choice]) }));
  });
}
