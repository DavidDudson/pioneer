import type {
  AdditionalFeat,
  ContentId,
  ContentKind,
  ContentLevel,
  ContentText,
  DeitySpell,
  Level,
  OriginHop,
  Rarity,
  RichText,
  RollOption,
  RuleElement,
  Slug,
  SourceRef,
  Trait,
  UNLIMITED,
  Uses,
} from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

/** What a player weighs when picking an entry from a list: the facts of its envelope. */
export interface EntryFacts {
  /** Absent for an entry without a level. */
  readonly level?: ContentLevel | Level;
  readonly rarity: Rarity;
  readonly traits: readonly Trait[];
  readonly description: RichText;
  /** From a pre-remaster book: its licence, or its pack's, is the Open Game License. Absent for any other entry. */
  readonly legacy?: true;
}

/**
 * What grant resolution reads of a content entry: its kind, slug, name, rule elements, sources and own roll options.
 * Any kind of entry (class, feat, feature, action, condition) has these, so grants follow one shape until the
 * per-kind content schemas land (Epic 2.1).
 */
export interface GrantEntry {
  readonly id: ContentId;
  readonly kind: ContentKind;
  /**
   * Its name within its kind, the entry slug less its kind (`shield-block` of `feat:shield-block`), which the roll
   * option its kind sets names it by: `feat:shield-block`.
   */
  readonly slug: Slug;
  readonly name: ContentText;
  readonly rules: readonly RuleElement[];
  /** At least one, as every origin names its entry's sources. */
  readonly sources: readonly [SourceRef, ...SourceRef[]];
  /**
   * What the entry says of itself (`trait:fighter`, `level:1`), without the `item:` a `ChoiceSet` query reads them
   * under. Its kind's schema derives them once it lands.
   */
  readonly rollOptions: readonly RollOption[];
  /** What the entry says of itself for a list to show; absent for an entry that is not read from an envelope. */
  readonly facts?: EntryFacts;
  /**
   * The entry it belongs to, which a root slot `within` another reads: a heritage's ancestry. Absent for an entry that
   * belongs to none, such as a versatile heritage, which any ancestry can take.
   */
  readonly belongsTo?: ContentId;
  /**
   * Whether a condition carries a value (_frightened 2_), as its data says; absent for any other kind. A grant of a
   * valued condition gives it the grant's value, else 1.
   */
  readonly valued?: boolean;
  /**
   * The conditions this one replaces while it lasts (_blinded_ overrides _dazzled_), as its data says; absent for any
   * other kind. An overridden condition is suppressed while this one is on the character.
   */
  readonly overrides?: readonly ContentId[];
  /**
   * What the entry says of the character it is on, beyond the option its kind sets, as Foundry pf2e sets them from a
   * deity's data: `deity:primary:font:heal`, `deity:primary:sanctification:can:holy`,
   * `deity:primary:favored-weapon:dagger`. Absent for any other kind.
   */
  readonly characterOptions?: readonly RollOption[];
  /**
   * What an archetype says of its feats, as its data does: the feat that opens it, and the feats of other sources it
   * lists as its own. Absent for any other kind.
   */
  readonly archetype?: { readonly dedication: ContentId; readonly additionalFeats: readonly AdditionalFeat[] };
  /** The traits an ancestry gives the character it is on (`human`, `humanoid`); absent for any other kind. */
  readonly actorTraits?: readonly Trait[];
  /**
   * How many times a character can take a feat, or `unlimited`, as its data says; absent for any other kind, and for
   * a feat taken once. A feat picked in more than one feat slot is on the character once per take, up to this many.
   */
  readonly maxTakable?: Uses | typeof UNLIMITED;
  /** A deity's spells for its clerics, at the rank each is granted at, which a `DeitySpells` element reads. */
  readonly deitySpells?: readonly DeitySpell[];
}

/** The installed content grant resolution reads. */
export interface ContentLookup {
  /** The entry with `id`; undefined when no installed pack has it. */
  readonly entry: (id: ContentId) => GrantEntry | undefined;
  /** Every entry of `kind`, in any order, for a `ChoiceSet` query to filter. */
  readonly ofKind: (kind: ContentKind) => readonly GrantEntry[];
}

/**
 * Something the character has directly: an ancestry, class or feat the player picked, a condition or an effect.
 * `hop` is how it got there, and starts the origin of everything it grants.
 */
export interface GrantRoot {
  readonly entry: ContentId;
  readonly hop: OriginHop;
}

/** A grant that failed, and the hops down to the element that made it (or the root, for a root that failed). */
export interface GrantError {
  readonly error: MessageDescriptor;
  readonly hops: readonly OriginHop[];
}
