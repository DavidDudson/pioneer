import type { GrantEntry } from '@pioneer/rules/grants';
import { ContentId, RuleElementKey, Selector } from '@pioneer/rules/sdk';
import type { ChoiceValue } from '@pioneer/rules/sdk';

import { FAVOURED, TRAINS_WEAPON, UNTHEMED } from './generation-theme';
import type { ThemeWeight, WeaponTheme } from './generation-theme';
import type { SlotContent } from './slot-offer';

/** A weapon group or base as content names it: `group:sword`, `base:longsword`. */
const WEAPON_NAME = /(?<![\w-])(?:group|base):[a-z-]+/gu;

/** The weapons an entry's rules and prerequisites name, read once per entry as content never changes. */
const READ = new WeakMap<GrantEntry, ReadonlySet<Selector>>();

function namedBy(entry: GrantEntry, predicate: unknown): ReadonlySet<Selector> {
  const text = JSON.stringify([entry.rules, predicate]);
  const read = READ.get(entry) ?? new Set(Array.from(text.matchAll(WEAPON_NAME), ([name]) => Selector.parse(name)));
  READ.set(entry, read);
  return read;
}

/** Whether `named` has the group or base of the themed weapon. */
function names(named: ReadonlySet<Selector>, { group, base }: WeaponTheme): boolean {
  return (
    (group !== undefined && named.has(Selector.parse(`group:${group}`))) ||
    (base !== undefined && named.has(Selector.parse(`base:${base}`)))
  );
}

/** Whether `entry` raises the rank of the themed weapon's category (`attack:martial`). */
function trains(entry: GrantEntry, { category }: WeaponTheme): boolean {
  return entry.rules.some((rule) => rule.key === RuleElementKey.Proficiency && rule.selector === `attack:${category}`);
}

/**
 * How much a class, ancestry or feat favours `weapon`: `FAVOURED` when its rules or prerequisites name the weapon's
 * group or base, `TRAINS_WEAPON` when it trains its category, and the least when it does neither.
 */
export function weaponAffinity(content: SlotContent, pick: ChoiceValue, weapon: WeaponTheme): ThemeWeight {
  const id = ContentId.safeParse(pick);
  const entry = id.success ? content.lookup.entry(id.data) : undefined;
  if (entry === undefined) {
    return UNTHEMED;
  }
  if (names(namedBy(entry, content.feats.feat(entry.id)?.predicate), weapon)) {
    return FAVOURED;
  }
  return trains(entry, weapon) ? TRAINS_WEAPON : UNTHEMED;
}
