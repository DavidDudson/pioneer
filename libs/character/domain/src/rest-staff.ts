import { CountDelta, heldCount, spentAfter } from './counted-resources';
import { ResourceCount } from './resource-count';
import { RestChangeKind } from './rest-types';
import type { RestChange, RestLimits, RestOutcome, RestPlay } from './rest-types';
import type { StaffChoice, StaffSlot } from './staff-charges';
import { staffSlotKey } from './staff-limits';

const NONE = ResourceCount.parse(0);

const SPENT_ONE = CountDelta.parse(1);

/** Whether `slot` is one a prepared caster may expend and still holds, once the day's slots are back. */
function expendable(play: RestPlay, limits: RestLimits, slot: StaffSlot): boolean {
  const key = staffSlotKey(slot);
  const held = heldCount({ spent: play.resources.slots, maxima: limits.counted.slots, key });
  return limits.staff.expendable.has(key) && held > NONE;
}

/**
 * The staff prepared for the day: the character's highest spell rank in charges, plus the rank of the slot expended,
 * which counts as used. The charges of any staff prepared before are lost, and a staff the character does not have, or
 * a character without spellcasting, leaves none prepared.
 */
export function withStaffPrepared<Play extends RestPlay>(
  outcome: RestOutcome<Play>,
  limits: RestLimits,
  { staff, slot }: StaffChoice,
): RestOutcome<Play> {
  const { play } = outcome;
  const { highestRank, staves } = limits.staff;
  const cleared: Play = { ...play, resources: { ...play.resources, staff: {} } };
  if (staff === undefined || highestRank === undefined || !staves.has(staff)) {
    return Object.keys(play.resources.staff).length === 0 ? outcome : { play: cleared, changes: outcome.changes };
  }
  const expended = slot !== undefined && expendable(play, limits, slot) ? slot : undefined;
  const charges = ResourceCount.parse(highestRank + (expended?.rank ?? 0));
  const slots =
    expended === undefined
      ? play.resources.slots
      : spentAfter(
          { spent: play.resources.slots, maxima: limits.counted.slots, key: staffSlotKey(expended) },
          SPENT_ONE,
        );
  const next: Play = {
    ...play,
    resources: { ...play.resources, slots, staff: { [staff]: { max: charges, spent: NONE } } },
  };
  const change: RestChange = { kind: RestChangeKind.StaffCharges, item: staff, charges };
  const prepared: RestOutcome<Play> = { play: next, changes: [...outcome.changes, change] };
  return expended === undefined
    ? prepared
    : {
        ...prepared,
        changes: [...prepared.changes, { kind: RestChangeKind.SlotExpended, key: staffSlotKey(expended) }],
      };
}
