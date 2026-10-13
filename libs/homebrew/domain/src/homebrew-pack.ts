import { ContentLicense, ContentPackId, ContentText, PackId, PackVisibility } from '@pioneer/rules/sdk';
import { FIRST_VERSION, InstantCodec, UserId, Version } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { EntryCount, NO_ENTRIES } from './homebrew-fields';

/** JSON shape of a homebrew pack on the wire. */
const HomebrewPackWire = z.object({
  id: ContentPackId,
  version: Version,
  /** The pack id entries are keyed under; unique across official and homebrew packs. */
  slug: PackId,
  title: ContentText,
  /** The author's display name when the pack was made. */
  publisher: ContentText,
  ownerId: UserId,
  visibility: z.enum(PackVisibility),
  entryCount: EntryCount,
  updatedAt: InstantCodec,
});

interface HomebrewPackProps {
  readonly id: ContentPackId;
  readonly version: Version;
  readonly slug: PackId;
  readonly title: ContentText;
  readonly publisher: ContentText;
  readonly ownerId: UserId;
  readonly visibility: PackVisibility;
  readonly entryCount: EntryCount;
  readonly updatedAt: Temporal.Instant;
}

/**
 * A homebrew pack as its owner sees it: the `content_packs` row without its `pack.json`, plus how many entries it
 * holds. Immutable, like `Character`.
 *
 * Serialization: `HomebrewPack.codec` decodes wire JSON into a `HomebrewPack` and encodes it back.
 */
export class HomebrewPack {
  public static readonly codec = z.codec(HomebrewPackWire, z.instanceof(HomebrewPack), {
    decode: (wire) => new HomebrewPack(wire),
    encode: (pack) => pack.toProps(),
  });

  /** Every homebrew pack is made under this license, as the manifest records it. */
  public static readonly license = ContentLicense.Homebrew;

  public readonly id: ContentPackId;
  public readonly version: Version;
  public readonly slug: PackId;
  public readonly title: ContentText;
  public readonly publisher: ContentText;
  public readonly ownerId: UserId;
  public readonly visibility: PackVisibility;
  public readonly entryCount: EntryCount;
  public readonly updatedAt: Temporal.Instant;

  public constructor(props: HomebrewPackProps) {
    this.id = props.id;
    this.version = props.version;
    this.slug = props.slug;
    this.title = props.title;
    this.publisher = props.publisher;
    this.ownerId = props.ownerId;
    this.visibility = props.visibility;
    this.entryCount = props.entryCount;
    this.updatedAt = props.updatedAt;
  }

  /** A new, empty pack owned by `ownerId`, private until they say otherwise. */
  public static create(input: {
    readonly id: ContentPackId;
    readonly slug: PackId;
    readonly title: ContentText;
    readonly publisher: ContentText;
    readonly ownerId: UserId;
    readonly now: Temporal.Instant;
  }): HomebrewPack {
    return new HomebrewPack({
      id: input.id,
      version: FIRST_VERSION,
      slug: input.slug,
      title: input.title,
      publisher: input.publisher,
      ownerId: input.ownerId,
      visibility: PackVisibility.Private,
      entryCount: NO_ENTRIES,
      updatedAt: input.now,
    });
  }

  private toProps(): HomebrewPackProps {
    return {
      id: this.id,
      version: this.version,
      slug: this.slug,
      title: this.title,
      publisher: this.publisher,
      ownerId: this.ownerId,
      visibility: this.visibility,
      entryCount: this.entryCount,
      updatedAt: this.updatedAt,
    };
  }
}
