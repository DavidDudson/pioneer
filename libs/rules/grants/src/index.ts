export type { ContentLookup, GrantEntry, GrantRoot } from './grant-entry';
export { GrantsMessage } from './messages';
export {
  type ConditionalGrant,
  type GrantedItem,
  type GrantError,
  type GrantInputs,
  type GrantResolution,
  resolveGrants,
} from './resolve-grants';
export { default as grantsMessages } from './i18n/en.json';
