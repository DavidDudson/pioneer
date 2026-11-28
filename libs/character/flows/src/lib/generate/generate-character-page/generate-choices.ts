import type { GenerateLock } from '@pioneer/character/domain';
import { ChoiceValue } from '@pioneer/rules/sdk';
import type { SlotKey, WeaponCategory, WeaponGroup } from '@pioneer/rules/sdk';

/** The key of `messages` that `picked` names, or undefined for no choice. */
export function keyOf<TKey extends WeaponCategory | WeaponGroup>(
  messages: Readonly<Record<TKey, string>>,
  picked: string | undefined,
): TKey | undefined {
  return Object.keys(messages).find((value): value is TKey => value === picked);
}

/** A lock that keeps `picked` in `slot`; none when nothing is chosen, so the generator draws it. */
export function lockOf(slot: SlotKey, picked: string): readonly GenerateLock[] {
  return picked === '' ? [] : [{ slot, selection: ChoiceValue.parse(picked) }];
}
