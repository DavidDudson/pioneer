import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** How to read a missing roll option in a namespace (ADR-0002). */
export const NamespaceKind = {
  /** The character's own facts. Absent means false: no `feat:shield-block` means no Shield Block. */
  Known: 'known',
  /** Facts about the moment. Absent means unknown: no `terrain:forest` may just mean nobody said. */
  Situational: 'situational',
} as const;
export type NamespaceKind = ValueOf<typeof NamespaceKind>;

export const NamespaceKindSchema = z.enum(NamespaceKind);

/**
 * The leading words of a roll option that a namespace table classifies: usually the first word (`self` in
 * `self:condition:frightened`), sometimes more where one namespace mixes kinds (`self:action`).
 */
export const RollOptionNamespace = z
  .string()
  .regex(/^[a-z\d](?:[a-z\d]|[-:](?=[a-z\d]))*$/u)
  .brand<'RollOptionNamespace'>();
export type RollOptionNamespace = z.infer<typeof RollOptionNamespace>;

/**
 * A pack's roll option namespaces and how each reads when missing. The core rules pack holds the table every
 * character uses; another pack adds its own (a homebrew `sanity`), and the registry merges them.
 */
export const RollOptionNamespaces = z.record(RollOptionNamespace, NamespaceKindSchema).readonly();
export type RollOptionNamespaces = z.infer<typeof RollOptionNamespaces>;
