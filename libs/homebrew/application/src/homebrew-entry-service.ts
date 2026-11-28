import { HomebrewCommand, nameSlug, starterData } from '@pioneer/homebrew/domain';
import type {
  CreateHomebrewEntryBody,
  HomebrewEntrySummary,
  HomebrewPack,
  UpdateHomebrewEntryBody,
} from '@pioneer/homebrew/domain';
import { ContentEntry, contentId, entrySlug, SourceKind } from '@pioneer/rules/sdk';
import type { ContentKind, ContentPackId, ContentText, EntrySlug, JsonValue, PackId } from '@pioneer/rules/sdk';
import { ConflictError, fieldIssues, message, NotFoundError, ValidationError } from '@pioneer/shared/kernel';
import type { Clock, UserId, Uuid } from '@pioneer/shared/kernel';

import type { EntryRef, HomebrewEntryRepository, StoredHomebrewEntry } from './homebrew-entry-repository';
import { HomebrewMessage } from './homebrew-message';
import type { HomebrewPackRepository } from './homebrew-pack-repository';
import { PackAccessPolicy } from './pack-access-policy';

/** The ports `HomebrewEntryService` works through. */
export interface HomebrewEntryPorts {
  readonly packs: HomebrewPackRepository;
  readonly entries: HomebrewEntryRepository;
}

function summarize(pack: ContentPackId, { entry, updatedAt, archivedAt }: StoredHomebrewEntry): HomebrewEntrySummary {
  return {
    id: entry.id,
    packId: pack,
    kind: entry.kind,
    slug: entry.slug,
    name: entry.name,
    level: 'level' in entry ? entry.level : undefined,
    rarity: entry.rarity,
    traits: [...entry.traits],
    archivedAt,
    updatedAt,
  };
}

/** The fields of an entry before its kind's schema has checked them. */
interface EntryCandidate {
  readonly id: Uuid;
  readonly pack: PackId;
  readonly kind: ContentKind;
  readonly slug: EntrySlug;
  readonly name: ContentText;
  readonly level: CreateHomebrewEntryBody['level'];
  readonly rarity: CreateHomebrewEntryBody['rarity'];
  readonly traits: CreateHomebrewEntryBody['traits'];
  readonly sources: ReadonlyArray<{ readonly kind: SourceKind; readonly author: UserId; readonly pack: PackId }>;
  readonly description: ReadonlyArray<never>;
  readonly rules: ReadonlyArray<never>;
  readonly data: JsonValue;
}

/** The entry `candidate` describes, or a 422 with the kind's schema's own message keys. */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- This is the parse boundary: the schema checks it here.
function checked(candidate: unknown): ContentEntry {
  const parsed = ContentEntry.safeParse(candidate);

  if (!parsed.success) {
    throw new ValidationError(fieldIssues(parsed.error.issues));
  }

  return parsed.data;
}

/**
 * Homebrew entry use cases: create, edit, archive and restore an entry of a pack the actor owns. Only the pack's
 * owner may touch its entries, so a pack the actor does not own reads as missing, however widely it is shared.
 */
export class HomebrewEntryService {
  readonly #packs: HomebrewPackRepository;
  readonly #entries: HomebrewEntryRepository;
  readonly #clock: Clock;

  public constructor({ packs, entries }: HomebrewEntryPorts, clock: Clock) {
    this.#packs = packs;
    this.#entries = entries;
    this.#clock = clock;
  }

  /** The pack's live entries, or its archived ones. */
  public async list(
    actor: UserId,
    pack: ContentPackId,
    archived: boolean,
  ): Promise<ReadonlyArray<HomebrewEntrySummary>> {
    await this.#owned(actor, pack);
    const stored = await this.#entries.list(pack, archived);

    return stored.map((row) => summarize(pack, row));
  }

  /**
   * A new entry of `input.kind`, starting from the kind's starter data and checked against the kind's schema. Its slug
   * is the kind and the name; its id derives from that and never changes after.
   */
  public async create(
    actor: UserId,
    pack: ContentPackId,
    input: CreateHomebrewEntryBody,
  ): Promise<HomebrewEntrySummary> {
    const owned = await this.#owned(actor, pack);
    const entry = checked(newEntry(actor, owned, input));
    const now = this.#clock.now();
    const stored = await this.#entries.insert(pack, entry, { actor, command: HomebrewCommand.CreateEntry, now });

    if (!stored) {
      // The write also refuses a pack that stopped being the actor's since the read above: that is a 404, not a taken slug.
      await this.#owned(actor, pack);

      throw new ConflictError(`Pack ${pack} already has ${entry.slug}`, message(HomebrewMessage.EntrySlugTaken));
    }

    return summarize(pack, { entry, updatedAt: now });
  }

  /** Changes a live entry's name, level, rarity and traits. Its kind, slug and id stay; the kind's schema still has to hold. */
  public async update(actor: UserId, ref: EntryRef, input: UpdateHomebrewEntryBody): Promise<HomebrewEntrySummary> {
    await this.#owned(actor, ref.pack);
    const found = await this.#entries.find(ref);

    if (found === undefined || found.archivedAt !== undefined) {
      throw new NotFoundError('HomebrewEntry', ref.id);
    }

    const entry = checked({ ...found.entry, ...input });
    const now = this.#clock.now();
    const replaced = await this.#entries.replace(ref.pack, entry, { actor, command: HomebrewCommand.UpdateEntry, now });

    if (!replaced) {
      throw new NotFoundError('HomebrewEntry', ref.id);
    }

    return summarize(ref.pack, { entry, updatedAt: now });
  }

  /** Archives the entry (ADR-0062). Archiving an archived one is harmless. */
  public async archive(actor: UserId, ref: EntryRef): Promise<HomebrewEntrySummary> {
    return this.#setArchived(actor, ref, true);
  }

  /** Brings an archived entry back as it was. Restoring a live one is harmless. */
  public async restore(actor: UserId, ref: EntryRef): Promise<HomebrewEntrySummary> {
    return this.#setArchived(actor, ref, false);
  }

  async #setArchived(actor: UserId, ref: EntryRef, archived: boolean): Promise<HomebrewEntrySummary> {
    await this.#owned(actor, ref.pack);
    const command = archived ? HomebrewCommand.ArchiveEntry : HomebrewCommand.RestoreEntry;
    const changed = await this.#entries.setArchived(ref, archived, { actor, command, now: this.#clock.now() });
    const found = changed ? await this.#entries.find(ref) : undefined;

    if (found === undefined) {
      throw new NotFoundError('HomebrewEntry', ref.id);
    }

    return summarize(ref.pack, found);
  }

  /** The actor's own live pack; any other, shared or not, is a 404 so its id reveals nothing. */
  async #owned(actor: UserId, id: ContentPackId): Promise<HomebrewPack> {
    const pack = await this.#packs.findById(id);

    if (pack === undefined || !PackAccessPolicy.owns(actor, pack)) {
      throw new NotFoundError('HomebrewPack', id);
    }

    return pack;
  }
}

/** What `input` describes as a whole entry, before the kind's schema has checked it; a 422 for a kind or name that cannot be filed. */
function newEntry(actor: UserId, pack: HomebrewPack, input: CreateHomebrewEntryBody): EntryCandidate {
  const data = starterData(input.kind);

  if (data === undefined) {
    throw new ValidationError([{ path: ['kind'], message: message(HomebrewMessage.EntryKindNeedsEntries) }]);
  }

  const titleSlug = nameSlug(input.name);

  if (titleSlug === undefined) {
    throw new ValidationError([{ path: ['name'], message: message(HomebrewMessage.EntryNameHasNoLetters) }]);
  }

  const slug = entrySlug(input.kind, titleSlug);

  return {
    id: contentId(pack.slug, slug),
    pack: pack.slug,
    kind: input.kind,
    slug,
    name: input.name,
    level: input.level,
    rarity: input.rarity,
    traits: input.traits,
    sources: [{ kind: SourceKind.Homebrew, author: actor, pack: pack.slug }],
    description: [],
    rules: [],
    data,
  };
}
