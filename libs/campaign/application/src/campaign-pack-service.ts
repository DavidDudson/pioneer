import { CampaignPackId } from '@pioneer/campaign/domain';
import type {
  Campaign,
  CampaignId,
  CampaignPack,
  CampaignPacks,
  EnabledPack,
  EnabledPackId,
  EnablePackBody,
  PackCandidate,
  PackTitle,
} from '@pioneer/campaign/domain';
import { ConflictError, ForbiddenError, message, newId, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { CampaignPackRepository } from './campaign-pack-repository';
import { mayManagePacks, mayViewCampaign } from './campaign-policy';
import type { CampaignRepository } from './campaign-repository';
import type { CatalogPack, PackCatalog } from './pack-catalog';
import { PackMessage } from './pack-message';

/** The ports `CampaignPackService` works through. */
export interface CampaignPackPorts {
  readonly campaigns: CampaignRepository;
  readonly packs: CampaignPackRepository;
  readonly catalog: PackCatalog;
}

/** For each enabled pack, the titles of the enabled packs that extend it, alphabetically. */
type RequiredBy = ReadonlyMap<EnabledPackId, readonly PackTitle[]>;

function byTitle(left: CatalogPack, right: CatalogPack): number {
  return left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
}

/** A pack the campaign uses. Only the GM disables one, and not while an enabled pack extends it. */
function enabledEntry(pack: CatalogPack, requiredBy: readonly PackTitle[], manageable: boolean): EnabledPack {
  return {
    packId: pack.id,
    title: pack.title,
    publisher: pack.publisher,
    official: pack.official,
    requiredBy,
    removable: manageable && !pack.official && requiredBy.length === 0,
  };
}

function candidateEntry(pack: CatalogPack): PackCandidate {
  return {
    packId: pack.id,
    title: pack.title,
    publisher: pack.publisher,
    official: pack.official,
    private: pack.private,
  };
}

/**
 * The packs a campaign uses: the official packs, which are always on, and the homebrew ones its GM enables. Every
 * member reads the list; only the GM changes it. Enabling a pack enables the packs it extends, so what a pack
 * references resolves for the whole table. Framework-free, like `CampaignService`.
 */
export class CampaignPackService {
  readonly #campaigns: CampaignRepository;
  readonly #packs: CampaignPackRepository;
  readonly #catalog: PackCatalog;
  readonly #clock: Clock;

  public constructor({ campaigns, packs, catalog }: CampaignPackPorts, clock: Clock) {
    this.#campaigns = campaigns;
    this.#packs = packs;
    this.#catalog = catalog;
    this.#clock = clock;
  }

  /** The homebrew packs among `order`, in that order. */
  static #homebrewOf(
    order: readonly EnabledPackId[],
    known: ReadonlyMap<EnabledPackId, CatalogPack>,
  ): readonly CatalogPack[] {
    return order.flatMap((id): CatalogPack[] => {
      const pack = known.get(id);
      return pack === undefined || pack.official ? [] : [pack];
    });
  }

  /** A pack in the closure of `root` that is private, or that the GM may not read: a 409. */
  static #refuseIfUnusable(pack: CatalogPack, root: CatalogPack, mayRead: ReadonlySet<EnabledPackId>): void {
    CampaignPackService.#refuseIfPrivate(pack);
    if (!mayRead.has(pack.id)) {
      throw new ConflictError(
        `Pack ${root.id} extends ${pack.id}, which the GM may not read`,
        message(PackMessage.DependencyUnreadable, { pack: root.title, dependency: pack.title }),
      );
    }
  }

  static #refuseIfPrivate(pack: CatalogPack): void {
    if (pack.private) {
      throw new ConflictError(`Pack ${pack.id} is private`, message(PackMessage.Private, { pack: pack.title }));
    }
  }

  /** The campaign's packs, and for its GM the ones they could add. Not a member: 404. */
  public async packs(actor: UserId, id: CampaignId): Promise<CampaignPacks> {
    const campaign = await this.#viewed(actor, id);
    return this.#view(actor, campaign);
  }

  /**
   * The GM enables a pack, and the packs it extends. A pack they may not read is a 404, as is a missing one. A private
   * pack, or one extending a pack the GM may not read, is a 409. Enabling a pack twice is no change.
   */
  public async enable(actor: UserId, id: CampaignId, { packId }: EnablePackBody): Promise<CampaignPacks> {
    const campaign = await this.#managed(actor, id);
    const planned = await this.#plan(actor, packId);
    const enabled = await this.#packs.listForCampaign(id);
    const fresh = planned.filter((pack) => !enabled.some((row) => row.packId === pack.id));
    if (fresh.length > 0) {
      const rows = this.#rowsFor(actor, fresh);
      // Checked again inside the repository's transaction, so a pack going private cannot slip between.
      await this.#packs.enable(actor, { campaignId: id, packs: rows }, async () =>
        this.#refuseChanged(actor, packId, planned),
      );
    }
    return this.#view(actor, campaign);
  }

  /**
   * The GM stops the campaign using a pack. An official pack is always on, and a pack an enabled pack extends stays
   * on: each is a 409. One the campaign does not use is no change.
   */
  public async disable(actor: UserId, id: CampaignId, packId: EnabledPackId): Promise<CampaignPacks> {
    const campaign = await this.#managed(actor, id);
    const known = await this.#catalog.byIds([packId]);
    if (known.get(packId)?.official === true) {
      throw new ConflictError(`Pack ${packId} is official and always on`, message(PackMessage.AlwaysOn));
    }
    const enabled = await this.#packs.listForCampaign(id);
    if (enabled.some((row) => row.packId === packId)) {
      await this.#refuseIfRequired(enabled, packId);
      await this.#packs.disable(actor, id, packId);
    }
    return this.#view(actor, campaign);
  }

  #rowsFor(actor: UserId, fresh: readonly CatalogPack[]): readonly CampaignPack[] {
    const enabledAt = this.#clock.now();
    return fresh.map((pack): CampaignPack => ({
      id: CampaignPackId.parse(newId()),
      packId: pack.id,
      enabledBy: actor,
      enabledAt,
    }));
  }

  /**
   * The homebrew packs enabling `packId` adds, the pack last and each after the packs it extends. Official packs are
   * always on, so are left out.
   */
  async #plan(actor: UserId, packId: EnabledPackId): Promise<readonly CatalogPack[]> {
    const [readable, order] = await Promise.all([this.#catalog.readableBy(actor), this.#catalog.closure(packId)]);
    const mayRead = new Set(readable.map((pack) => pack.id));
    const known = await this.#catalog.byIds(order);
    const root = known.get(packId);
    if (root === undefined || !mayRead.has(packId)) {
      throw new NotFoundError('Pack', packId);
    }
    CampaignPackService.#refuseIfPrivate(root);
    const homebrew = CampaignPackService.#homebrewOf(order, known);
    for (const pack of homebrew) {
      CampaignPackService.#refuseIfUnusable(pack, root, mayRead);
    }
    return homebrew;
  }

  /** The checks an enablement holds under lock: the packs are still readable, shared, and the ones planned. */
  async #refuseChanged(actor: UserId, packId: EnabledPackId, planned: readonly CatalogPack[]): Promise<void> {
    const now = await this.#plan(actor, packId);
    const locked = new Set(planned.map((pack) => pack.id));
    if (now.some((pack) => !locked.has(pack.id))) {
      throw new ConflictError(`Pack ${packId} changed while it was being enabled`, message(PackMessage.Changed));
    }
  }

  /** Whether an enabled pack still extends this one, which keeps it on: a 409 naming them. */
  async #refuseIfRequired(enabled: readonly CampaignPack[], packId: EnabledPackId): Promise<void> {
    const requiredBy = await this.#extending(enabled);
    const requirers = requiredBy.get(packId) ?? [];
    if (requirers.length > 0) {
      throw new ConflictError(
        `Pack ${packId} is extended by ${requirers.join(', ')}`,
        message(PackMessage.RequiredBy, { packs: requirers.join(', ') }),
      );
    }
  }

  /** One of the actor's campaigns. One they are not in is a 404, the same as a missing one (ADR-0007). */
  async #viewed(actor: UserId, id: CampaignId): Promise<Campaign> {
    const campaign = await this.#campaigns.findById(id);
    if (campaign === undefined || !mayViewCampaign(actor, campaign)) {
      throw new NotFoundError('Campaign', id);
    }
    return campaign;
  }

  /** A campaign the actor runs. One they only play in is a 403. */
  async #managed(actor: UserId, id: CampaignId): Promise<Campaign> {
    const campaign = await this.#viewed(actor, id);
    if (!mayManagePacks(actor, campaign)) {
      throw new ForbiddenError(`Only the GM changes the packs of campaign ${id}`);
    }
    return campaign;
  }

  /** For each enabled pack, the enabled packs that extend it. */
  async #extending(enabled: readonly CampaignPack[]): Promise<RequiredBy> {
    const closures = await Promise.all(
      enabled.map(async (row) => ({ root: row.packId, closure: await this.#catalog.closure(row.packId) })),
    );
    const known = await this.#catalog.byIds(enabled.map((row) => row.packId));
    const extenders = new Map<EnabledPackId, PackTitle[]>();
    for (const { root, closure } of closures) {
      const title = known.get(root)?.title;
      for (const dependency of closure) {
        if (dependency !== root && title !== undefined) {
          extenders.set(dependency, [...(extenders.get(dependency) ?? []), title]);
        }
      }
    }
    return new Map(
      [...extenders].map(([dependency, titles]): [EnabledPackId, readonly PackTitle[]] => [
        dependency,
        titles.toSorted((left, right) => left.localeCompare(right)),
      ]),
    );
  }

  /** The campaign's packs and, for its GM, the packs they could add. */
  async #view(actor: UserId, campaign: Campaign): Promise<CampaignPacks> {
    const manageable = mayManagePacks(actor, campaign);
    const [rows, official] = await Promise.all([this.#packs.listForCampaign(campaign.id), this.#catalog.official()]);
    const [known, requiredBy] = await Promise.all([
      this.#catalog.byIds(rows.map((row) => row.packId)),
      this.#extending(rows),
    ]);
    // A pack deleted since is gone with its row (the foreign key cascades), so a gap is a change since the read.
    const homebrew = rows.flatMap((row): CatalogPack[] => {
      const pack = known.get(row.packId);
      return pack === undefined ? [] : [pack];
    });
    const enabled = [...official, ...homebrew.toSorted(byTitle)].map((pack) =>
      enabledEntry(pack, requiredBy.get(pack.id) ?? [], manageable),
    );
    return { manageable, enabled, candidates: manageable ? await this.#candidates(actor, rows) : [] };
  }

  /** The packs the GM may read that the campaign does not use yet. */
  async #candidates(actor: UserId, rows: readonly CampaignPack[]): Promise<readonly PackCandidate[]> {
    const readable = await this.#catalog.readableBy(actor);
    const used = new Set(rows.map((row) => row.packId));
    return readable.filter((pack) => !pack.official && !used.has(pack.id)).map((pack) => candidateEntry(pack));
  }
}
