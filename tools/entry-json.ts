/** A content entry's JSON as a pack file holds it, before the schema has read it. */
export interface EntryJson {
  readonly id: string;
  readonly pack: string;
  readonly slug: string;
  readonly name: string;
  readonly kind?: string;
  readonly level?: number;
  readonly rarity: string;
  readonly traits: readonly string[];
  readonly sources: readonly object[];
  readonly description: readonly object[];
  readonly rules: readonly object[];
  readonly data?: object;
}
