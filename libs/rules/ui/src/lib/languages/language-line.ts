/**
 * A language the character knows as the sheet lists it: its name, and where it came from, the ancestry or feature by
 * name (`from`), or a pick, which names the slot it fills so it can be removed.
 */
export interface LanguageLine {
  /** Unique among the lines: the language's content id. */
  readonly key: string;
  readonly name: string;
  /** The ancestry or feature that gave it; absent for a pick. */
  readonly from?: string;
  /** The slot a pick fills; absent for a granted language. */
  readonly slot?: string;
}
