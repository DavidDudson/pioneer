import type { CharacterId, Companion, CompanionId } from '@pioneer/character/domain';
import { ConflictError, message } from '@pioneer/shared/kernel';

import { CharacterCompanionMessage } from './character-companion-message';
import { CharacterCompanionRepository } from './character-companion-repository';
import type { CompanionArchival, CompanionWriteContext } from './character-companion-repository';

/** The kinds a live companion holds the place of. */
function liveKinds(rows: readonly Companion[]): ReadonlySet<Companion['kind']> {
  return new Set(rows.filter((each) => each.archived === undefined).map((each) => each.kind));
}

/** Repository adapter for tests and local experiments. It does not model the character's version. */
export class InMemoryCharacterCompanionRepository extends CharacterCompanionRepository {
  readonly #rows = new Map<CharacterId, readonly Companion[]>();

  public override async listForCharacter(characterId: CharacterId): Promise<readonly Companion[]> {
    const rows = this.#rows.get(characterId) ?? [];
    return [
      ...rows.filter((each) => each.archived === undefined).toReversed(),
      ...rows.filter((each) => each.archived !== undefined).toReversed(),
    ];
  }

  public override async add({ characterId }: CompanionWriteContext, companion: Companion): Promise<void> {
    const rows = this.#rows.get(characterId) ?? [];
    if (liveKinds(rows).has(companion.kind)) {
      throw new ConflictError(
        `Character ${characterId} already has a live ${companion.kind}`,
        message(CharacterCompanionMessage.KindTaken, { kind: companion.kind }),
      );
    }
    this.#rows.set(characterId, [...rows, companion]);
  }

  public override async archive(
    { characterId, at }: CompanionWriteContext,
    { id, reason }: CompanionArchival,
  ): Promise<void> {
    this.#replace(characterId, id, (each) =>
      each.archived === undefined ? { ...each, archived: { at, reason } } : each,
    );
  }

  public override async restore({ characterId }: CompanionWriteContext, id: CompanionId): Promise<void> {
    const rows = this.#rows.get(characterId) ?? [];
    const target = rows.find((each) => each.id === id);
    if (target?.archived === undefined) {
      return;
    }
    if (liveKinds(rows).has(target.kind)) {
      throw new ConflictError(
        `Character ${characterId} already has a live ${target.kind}`,
        message(CharacterCompanionMessage.RestoreBlocked, { kind: target.kind }),
      );
    }
    this.#replace(characterId, id, (each) => ({ ...each, archived: undefined }));
  }

  #replace(characterId: CharacterId, id: CompanionId, change: (companion: Companion) => Companion): void {
    this.#rows.set(
      characterId,
      (this.#rows.get(characterId) ?? []).map((each) => (each.id === id ? change(each) : each)),
    );
  }
}
