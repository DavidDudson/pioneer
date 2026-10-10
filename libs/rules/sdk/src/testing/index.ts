/**
 * Test-only builders and fakes. Import from `@pioneer/rules/sdk/testing` in
 * tests; never from production code (kept out of the main barrel).
 */
export { ContentPackBuilder } from './content-pack-builder';
export { installRulesFakes } from './fakes';
export {
  actorFormulaText,
  actorReferencePath,
  itemReferencePath,
  keyPathText,
  knownReferencePath,
  predicateJson,
  predicateStatementJson,
  rollOptionText,
  unknownReferencePath,
  validFormulaText,
} from './arbitraries';
export { ruleElementJson } from './rule-element-arbitraries';
export { richTextJson } from './rich-text-arbitraries';
export { contentEntryJson } from './content-entry-arbitraries';
export { slugText } from './json-arbitraries';
export { PLAYER_CORE_PROFICIENCY_BONUS } from './proficiency-bonus';
