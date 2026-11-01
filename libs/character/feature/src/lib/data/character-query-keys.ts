import type { CharacterId } from '@pioneer/character/domain';

/** TanStack Query keys for the character feature. */
export const characterKeys = {
  all: ['characters'] as const,
  list: () => [...characterKeys.all, 'list'] as const,
  detail: (id: CharacterId | undefined) => [...characterKeys.all, 'detail', id] as const,
  sheetMode: (id: CharacterId | undefined) => [...characterKeys.all, 'sheet-mode', id] as const,
  play: (id: CharacterId | undefined) => [...characterKeys.all, 'play', id] as const,
  featDisplay: (id: CharacterId | undefined) => [...characterKeys.all, 'feat-display', id] as const,
  packs: (id: CharacterId | undefined) => [...characterKeys.all, 'packs', id] as const,
  variantRules: (id: CharacterId | undefined) => [...characterKeys.all, 'variant-rules', id] as const,
  ruleLimits: (id: CharacterId | undefined) => [...characterKeys.all, 'rule-limits', id] as const,
  ruleLimitSettings: (id: CharacterId | undefined) => [...characterKeys.all, 'rule-limit-settings', id] as const,
  unenabled: (id: CharacterId | undefined) => [...characterKeys.all, 'unenabled-content', id] as const,
};
