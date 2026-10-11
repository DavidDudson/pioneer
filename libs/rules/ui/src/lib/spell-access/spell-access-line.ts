/** A spell the build lists access to: its id, and its name when a loaded pack has it. */
export interface SpellAccessLine {
  readonly spell: string;
  /** Undefined when no loaded pack has the spell. */
  readonly name: string | undefined;
}
