import { CharacterPackId, PackAuthority } from '@pioneer/character/domain';
import type {
  Character,
  CharacterId,
  CharacterPack,
  CharacterPacks,
  EnablePackBody,
  PackCandidate,
  PackTitle,
  UnsupportedPack,
} from '@pioneer/character/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { ConflictError, message, newId, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { AttachedCampaign, AttachedCampaignPacks } from './attached-campaign-packs';
import type { CatalogPack, CharacterPackCatalog } from './character-pack-catalog';
import { byTitle, candidateEntry, enabledEntry, unsupportedEntry } from './character-pack-entries';
import { CharacterPackMessage } from './character-pack-message';
import type { CharacterPackRepository } from './character-pack-repository';
import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';
import { EffectivePacks } from './effective-packs';
import type { HeldContentPacks } from './held-content-packs';

/** The ports `CharacterPackService` works through. */
export interface CharacterPackPorts {
  readonly characters: CharacterRepository;
  readonly packs: CharacterPackRepository;
  readonly catalog: CharacterPackCatalog;
  readonly campaigns: AttachedCampaignPacks;
  /** The packs the character holds content from; without it none is reported as unsupported. */
  readonly held?: HeldContentPacks;
}

/** For each enabled pack, the titles of the enabled packs that extend it, alphabetically. */
type RequiredBy = ReadonlyMap<ContentPackId, readonly PackTitle[]>;

/**
 * The packs a character uses: the official packs, which are always on, and the homebrew ones in force. A character
 * outside campaigns has its owner choose them; one attached to a campaign uses the campaign's and ignores its own
 * rows (play-and-campaigns.md), so attaching switches the set and detaching switches it back. Only the owner reads or
 * changes the list. Enabling a pack enables the packs it extends, so what a pack references resolves. Framework-free,
 * like `CampaignPackService`.
 */
export class CharacterPackService extends EffectivePacks {
  readonly #characters: CharacterRepository;
  readonly #packs: CharacterPackRepository;
  readonly #catalog: CharacterPackCatalog;
  readonly #campaigns: AttachedCampaignPacks;
  readonly #held: HeldContentPacks | undefined;
  readonly #clock: Clock;

  public constructor({ characters, packs, catalog, campaigns, held }: CharacterPackPorts, clock: Clock) {
    super();
    this.#characters = characters;
    this.#packs = packs;
    this.#catalog = catalog;
    this.#campaigns = campaigns;
    this.#held = held;
    this.#clock = clock;
  }

  /**
   * The homebrew packs the character uses now, for the content its sheet is worked out over: the attached campaign's,
   * else the owner's own that they may still read. No access check; the caller has one.
   */
  public override async of(character: Character): Promise<readonly ContentPackId[]> {
    return this.#inForce(character, await this.#campaigns.of(character.id));
  }

  /**
   * The homebrew packs the owner has enabled for the character and may still read, whether or not a campaign decides
   * instead: what the character uses of its own. No access check; the caller has one.
   */
  public async own(character: Character): Promise<readonly ContentPackId[]> {
    return this.#inForce(character, undefined);
  }

  /** The homebrew packs among `order`, in that order. */
  static #homebrewOf(
    order: readonly ContentPackId[],
    known: ReadonlyMap<ContentPackId, CatalogPack>,
  ): readonly CatalogPack[] {
    return order.flatMap((id): CatalogPack[] => {
      const pack = known.get(id);
      return pack === undefined || pack.official ? [] : [pack];
    });
  }

  /** The character's packs, and for its owner the ones they could add. Not the owner: 404. */
  public async packs(actor: UserId, id: CharacterId): Promise<CharacterPacks> {
    const character = await this.#owned(actor, id);
    return this.#view(character);
  }

  /**
   * The owner enables a pack, and the packs it extends. A pack they may not read is a 404, as is a missing one; one
   * extending a pack they may not read is a 409, and so is any change while a campaign decides. Enabling a pack twice
   * is no change.
   */
  public async enable(actor: UserId, id: CharacterId, { packId }: EnablePackBody): Promise<CharacterPacks> {
    const character = await this.#owned(actor, id);
    await this.#refuseIfCampaignDecides(id);
    const planned = await this.#plan(actor, packId);
    const enabled = await this.#packs.listForCharacter(id);
    const fresh = planned.filter((pack) => !enabled.some((row) => row.packId === pack.id));
    if (fresh.length > 0) {
      await this.#packs.enable(actor, id, this.#rowsFor(actor, fresh));
    }
    return this.#view(character);
  }

  /**
   * The owner stops the character using a pack. An official pack is always on, a pack an enabled pack extends stays
   * on, and a campaign's packs are not the character's to change: each is a 409. One the character does not use is no
   * change.
   */
  public async disable(actor: UserId, id: CharacterId, packId: ContentPackId): Promise<CharacterPacks> {
    const character = await this.#owned(actor, id);
    await this.#refuseIfCampaignDecides(id);
    const known = await this.#catalog.byIds([packId]);
    if (known.get(packId)?.official === true) {
      throw new ConflictError(`Pack ${packId} is official and always on`, message(CharacterPackMessage.AlwaysOn));
    }
    const enabled = await this.#packs.listForCharacter(id);
    if (enabled.some((row) => row.packId === packId)) {
      await this.#refuseIfRequired(enabled, packId);
      await this.#packs.disable(actor, id, packId);
    }
    return this.#view(character);
  }

  /** One of the actor's characters. Another user's is a 404, the same as a missing one (ADR-0007). */
  async #owned(actor: UserId, id: CharacterId): Promise<Character> {
    const character = await this.#characters.findById(id);
    if (character === undefined || !mayAccessCharacter(actor, character)) {
      throw new NotFoundError('Character', id);
    }
    return character;
  }

  async #refuseIfCampaignDecides(id: CharacterId): Promise<void> {
    const campaign = await this.#campaigns.of(id);
    if (campaign !== undefined) {
      throw new ConflictError(
        `Character ${id} uses the packs of its campaign`,
        message(CharacterPackMessage.CampaignDecides, { campaign: campaign.name }),
      );
    }
  }

  #rowsFor(actor: UserId, fresh: readonly CatalogPack[]): readonly CharacterPack[] {
    const enabledAt = this.#clock.now();
    return fresh.map((pack): CharacterPack => ({
      id: CharacterPackId.parse(newId()),
      packId: pack.id,
      enabledBy: actor,
      enabledAt,
    }));
  }

  /**
   * The homebrew packs enabling `packId` adds, the pack last and each after the packs it extends. Official packs are
   * always on, so are left out. A private pack is fine: the owner reads their own, and a character is the one place a
   * pack can be tried before it is shared.
   */
  async #plan(actor: UserId, packId: ContentPackId): Promise<readonly CatalogPack[]> {
    const [readable, order] = await Promise.all([this.#catalog.readableBy(actor), this.#catalog.closure(packId)]);
    const mayRead = new Set(readable.map((pack) => pack.id));
    const known = await this.#catalog.byIds(order);
    const root = known.get(packId);
    if (root === undefined || !mayRead.has(packId)) {
      throw new NotFoundError('Pack', packId);
    }
    const homebrew = CharacterPackService.#homebrewOf(order, known);
    for (const pack of homebrew) {
      if (!mayRead.has(pack.id)) {
        throw new ConflictError(
          `Pack ${root.id} extends ${pack.id}, which the owner may not read`,
          message(CharacterPackMessage.DependencyUnreadable, { pack: root.title, dependency: pack.title }),
        );
      }
    }
    return homebrew;
  }

  /** Whether an enabled pack still extends this one, which keeps it on: a 409 naming them. */
  async #refuseIfRequired(enabled: readonly CharacterPack[], packId: ContentPackId): Promise<void> {
    const requiredBy = await this.#extending(enabled.map((row) => row.packId));
    const requirers = requiredBy.get(packId) ?? [];
    if (requirers.length > 0) {
      throw new ConflictError(
        `Pack ${packId} is extended by ${requirers.join(', ')}`,
        message(CharacterPackMessage.RequiredBy, { packs: requirers.join(', ') }),
      );
    }
  }

  /** For each pack, the packs among `ids` that extend it. */
  async #extending(ids: readonly ContentPackId[]): Promise<RequiredBy> {
    const closures = await Promise.all(ids.map(async (root) => ({ root, closure: await this.#catalog.closure(root) })));
    const known = await this.#catalog.byIds(ids);
    const extenders = new Map<ContentPackId, PackTitle[]>();
    for (const { root, closure } of closures) {
      const title = known.get(root)?.title;
      for (const dependency of closure) {
        if (dependency !== root && title !== undefined) {
          extenders.set(dependency, [...(extenders.get(dependency) ?? []), title]);
        }
      }
    }
    return new Map(
      [...extenders].map(([dependency, titles]): [ContentPackId, readonly PackTitle[]] => [
        dependency,
        titles.toSorted((left, right) => left.localeCompare(right)),
      ]),
    );
  }

  /** The packs in force: the attached campaign's, else the owner's own that they may still read. */
  async #inForce(character: Character, campaign: AttachedCampaign | undefined): Promise<readonly ContentPackId[]> {
    if (campaign !== undefined) {
      return campaign.packs;
    }
    const [rows, readable] = await Promise.all([
      this.#packs.listForCharacter(character.id),
      this.#catalog.readableBy(character.ownerId),
    ]);
    // A pack made private since, or deleted, is not in force; its row comes back with the pack if it is shared again.
    const mayRead = new Set(readable.map((pack) => pack.id));
    return rows.map((row) => row.packId).filter((packId) => mayRead.has(packId));
  }

  /** The character's packs and, for its owner while no campaign decides, the packs they could add. */
  async #view(character: Character): Promise<CharacterPacks> {
    const campaign = await this.#campaigns.of(character.id);
    const manageable = campaign === undefined;
    const [ids, official] = await Promise.all([this.#inForce(character, campaign), this.#catalog.official()]);
    const [known, requiredBy] = await Promise.all([this.#catalog.byIds(ids), this.#extending(ids)]);
    const homebrew = ids.flatMap((id): CatalogPack[] => {
      const pack = known.get(id);
      return pack === undefined || pack.official ? [] : [pack];
    });
    const enabled = [...official, ...homebrew.toSorted(byTitle)].map((pack) =>
      enabledEntry(pack, requiredBy.get(pack.id) ?? [], manageable),
    );
    return {
      decidedBy: manageable ? PackAuthority.Character : PackAuthority.Campaign,
      ...(campaign === undefined ? {} : { campaign: campaign.name }),
      manageable,
      enabled,
      candidates: manageable ? await this.#candidates(character.ownerId, ids) : [],
      unsupported: await this.#unsupported(character, ids),
    };
  }

  /** The packs the character holds content from that are not in `inForce`, by title. */
  async #unsupported(character: Character, inForce: readonly ContentPackId[]): Promise<readonly UnsupportedPack[]> {
    const held = (await this.#held?.of(character)) ?? [];
    const using = new Set(inForce);
    const ids = held.filter((id) => !using.has(id));
    if (ids.length === 0) {
      return [];
    }
    const known = await this.#catalog.byIds(ids);
    return CharacterPackService.#homebrewOf(ids, known)
      .toSorted(byTitle)
      .map((pack) => unsupportedEntry(pack));
  }

  /** The packs the owner may read that the character does not use yet. */
  async #candidates(owner: UserId, ids: readonly ContentPackId[]): Promise<readonly PackCandidate[]> {
    const readable = await this.#catalog.readableBy(owner);
    const used = new Set(ids);
    return readable.filter((pack) => !pack.official && !used.has(pack.id)).map((pack) => candidateEntry(pack));
  }
}
