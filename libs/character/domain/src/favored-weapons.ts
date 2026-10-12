import type { GrantResolution } from '@pioneer/rules/grants';
import { BaseWeapon } from '@pioneer/rules/sdk';

/** Where a deity says each favoured weapon: `deity:primary:favored-weapon:scimitar` (ADR-0046). */
const FAVORED_PREFIX = 'deity:primary:favored-weapon:';

/** The base weapons the character's deity favours, read from what its deity says of it; none without a deity. */
export function favoredWeapons({ rollOptions }: GrantResolution): ReadonlySet<BaseWeapon> {
  return new Set(
    rollOptions.flatMap((option) =>
      option.startsWith(FAVORED_PREFIX) ? [BaseWeapon.parse(option.slice(FAVORED_PREFIX.length))] : [],
    ),
  );
}
