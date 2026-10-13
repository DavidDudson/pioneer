import type { EmbeddedPack, ExistingPacks, HomebrewPackPlan } from '@pioneer/interop/pioneer';
import type { ContentId, PackId } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Port to the homebrew a Pioneer character file carries (ADR-0059). Homebrew is its own context, so the Pioneer file
 * service reaches it only through here; the adapter lives in the composition root and `InMemoryEmbeddedHomebrew` is
 * for tests.
 */
export abstract class EmbeddedHomebrew {
  /**
   * The homebrew packs `actor` may read that hold any of `ids`, each with just the entries among them. Ids no readable
   * homebrew pack has are left out, so the export fails on them as it does on any content nobody can name.
   */
  public abstract holding(actor: UserId, ids: readonly ContentId[]): Promise<readonly EmbeddedPack[]>;

  /**
   * Which of `packs` exist on this server, official ones too. Entries and ownership are `actor`'s view: a pack they
   * may not read has no entries to compare, so a file can't be used to probe it.
   */
  public abstract existing(actor: UserId, packs: readonly PackId[]): Promise<ExistingPacks>;

  /**
   * Writes `plans` as `actor`: makes each new pack, private to them, and adds the entries to create. Never changes an
   * entry a pack already has; a pack that is not theirs by now is left alone.
   */
  public abstract apply(actor: UserId, plans: readonly HomebrewPackPlan[]): Promise<void>;
}
