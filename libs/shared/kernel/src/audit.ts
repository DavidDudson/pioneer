import type { UserId } from './id';

/**
 * Who made a write and which command it was, recorded on every `audit.log` row the write produces.
 * Each bounded context narrows `Command` to its own closed set of command names.
 */
export interface AuditContext<Command extends string> {
  readonly actor: UserId;
  readonly command: Command;
}
