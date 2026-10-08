import type { Uuid } from '@pioneer/shared/kernel';

import { contentId, contentKey } from './content-id';
import type { ContentKey, Slug } from './content-id';
import type { ContentPack } from './content-pack';

/** One piece of content plus the pack it came from. */
export class ContentEntry<TId extends Uuid, TDefinition extends { readonly slug: Slug }> {
  /** Stored identity: UUIDv5 of `key`. */
  public readonly id: TId;
  /** Readable `<pack>/<slug>`, for logs and debugging only. */
  public readonly key: ContentKey;
  public readonly pack: ContentPack;
  public readonly definition: TDefinition;

  public constructor(
    pack: ContentPack,
    definition: TDefinition,
    idSchema: { readonly parse: (value: unknown) => TId },
  ) {
    this.id = idSchema.parse(contentId(pack.id, definition.slug));
    this.key = contentKey(pack.id, definition.slug);
    this.pack = pack;
    this.definition = definition;
  }
}
