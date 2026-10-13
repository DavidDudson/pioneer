import { contentPackId, ContentText, PackId } from '@pioneer/rules/sdk';
import { derivedId, FixtureNamespace, fixedClock, UserId } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';

import { HomebrewPack } from '../homebrew-pack';

/** Owner of fixtures unless `ownedBy` says otherwise; same id in every run. */
export const fixtureOwnerId: UserId = UserId.parse(derivedId(FixtureNamespace, 'user:Amiri'));

/**
 * Test builder for homebrew packs. The id derives from the slug, as the real one does.
 *
 * ```ts
 * const pack = new HomebrewPackBuilder().slug('amiri-feats').ownedBy(ezren).build();
 * ```
 */
export class HomebrewPackBuilder {
  #slug: PackId = PackId.parse('amiri-feats');
  #title: ContentText = ContentText.parse('Amiri feats');
  #ownerId: UserId = fixtureOwnerId;
  #at: Temporal.Instant = fixedClock('2026-01-01T00:00:00Z').now();

  public slug(slug: string): this {
    this.#slug = PackId.parse(slug);
    return this;
  }

  public titled(title: string): this {
    this.#title = ContentText.parse(title);
    return this;
  }

  public ownedBy(ownerId: UserId): this {
    this.#ownerId = ownerId;
    return this;
  }

  public updatedAt(instant: Temporal.Instant): this {
    this.#at = instant;
    return this;
  }

  public build(): HomebrewPack {
    return HomebrewPack.create({
      id: contentPackId(this.#slug),
      slug: this.#slug,
      title: this.#title,
      publisher: ContentText.parse('Amiri'),
      ownerId: this.#ownerId,
      now: this.#at,
    });
  }
}
