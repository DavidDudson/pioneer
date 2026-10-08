/**
 * Test-only random sources. Import from `@pioneer/rules/dice/testing` in tests; never from
 * production code (kept out of the main barrel).
 */
export { RandomSeed, scriptedRandom, seededRandom } from './seeded-random';
