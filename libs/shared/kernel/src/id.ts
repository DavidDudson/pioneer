import { v5 as uuidV5 } from 'uuid';
import { z } from 'zod';

/**
 * Every id in Pioneer is a UUID: in the database, on the wire, in memory.
 *
 * - `newId()` (UUIDv4): primary keys of database rows (characters, ...).
 * - `derivedId(namespace, name)` (UUIDv5): for ids that must be derivable
 *   from a stable name: content entries (`player-core/human`) and test
 *   fixtures. Same input, same id, on every machine.
 */
export const UuidSchema = z.uuid();

/** Namespace for content-pack entries: `derivedId(ContentNamespace, "<pack>/<slug>")`. */
export const ContentNamespace = '8a3f1d5e-6b2c-4e7a-9f10-3c5d7e9b1a24';
/** Namespace for deterministic test fixtures built by `/testing` builders. */
export const FixtureNamespace = '2d6c9b84-71e3-4f5a-8c2d-9e0a4b7f6c13';

export function newId(): string {
  return crypto.randomUUID();
}

export function derivedId(namespace: string, name: string): string {
  return uuidV5(name, namespace);
}

/** Aggregate version for optimistic concurrency; starts at 1, bumps on every save. */
export const VersionSchema = z.int32().positive();
export type Version = z.infer<typeof VersionSchema>;
