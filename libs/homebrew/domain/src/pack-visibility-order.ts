import { PackVisibility } from '@pioneer/rules/sdk';

/** From the fewest people who can read a pack to the most. */
const NARROWEST_FIRST: readonly PackVisibility[] = [
  PackVisibility.Private,
  PackVisibility.Campaign,
  PackVisibility.Public,
];

/** Whether more people can read a pack set to `visibility` than one set to `than`. */
export function isWiderThan(visibility: PackVisibility, than: PackVisibility): boolean {
  return NARROWEST_FIRST.indexOf(visibility) > NARROWEST_FIRST.indexOf(than);
}
