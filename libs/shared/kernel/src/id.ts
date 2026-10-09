import { v5 as uuidV5 } from 'uuid';
import { z } from 'zod';

/**
 * Every id in Pioneer is a UUID: in the database, on the wire, in memory.
 * Specific ids brand this further (`CharacterId = Uuid.brand<'CharacterId'>()`).
 *
 * - `newId()` (UUIDv4): primary keys of database rows (characters, ...).
 * - `derivedId(namespace, name)` (UUIDv5): for ids that must be derivable
 *   from a stable name: content entries (`player-core/human`) and test
 *   fixtures. Same input, same id, on every machine.
 */
export const Uuid = z.uuid().brand<'Uuid'>();
export type Uuid = z.infer<typeof Uuid>;

/** A UUIDv5 namespace; only the namespaces below exist. */
export const UuidNamespace = Uuid.brand<'UuidNamespace'>();
export type UuidNamespace = z.infer<typeof UuidNamespace>;

/** Namespace for content-pack entries: `derivedId(ContentNamespace, "<pack>/<slug>")`. */
export const ContentNamespace: UuidNamespace = UuidNamespace.parse('8a3f1d5e-6b2c-4e7a-9f10-3c5d7e9b1a24');
/** Namespace for deterministic test fixtures built by `/testing` builders. */
export const FixtureNamespace: UuidNamespace = UuidNamespace.parse('2d6c9b84-71e3-4f5a-8c2d-9e0a4b7f6c13');

export function newId(): Uuid {
  return Uuid.parse(crypto.randomUUID());
}

export function derivedId(namespace: UuidNamespace, name: string): Uuid {
  return Uuid.parse(uuidV5(name, namespace));
}

/** A signed-in person: the author of homebrew, the GM who set an override. */
export const UserId = Uuid.brand<'UserId'>();
export type UserId = z.infer<typeof UserId>;

/** Aggregate version for optimistic concurrency; starts at 1, bumps on every save. */
export const Version = z.int32().positive().brand<'Version'>();
export type Version = z.infer<typeof Version>;

export const FIRST_VERSION: Version = Version.parse(1);

export function nextVersion(version: Version): Version {
  return Version.parse(version + 1);
}
