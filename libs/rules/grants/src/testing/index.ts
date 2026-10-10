/**
 * Test-only builders. Import from `@pioneer/rules/grants/testing` in tests; never from production code (kept out
 * of the main barrel).
 */
export { entry, feat, grantOf, idOf, inputsOf, lookupOf, picked, picksOf, slotOf, toggleOf } from './builders';
export type { TestInputs } from './builders';
