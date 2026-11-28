import type { CharacterId, Companion, CompanionId } from '@pioneer/character/domain';

import { isKindFull, kindFullError } from './character-companion-limit';
import { CharacterCompanionRepository } from './character-companion-repository';
import type { CompanionArchival, CompanionWriteContext } from './character-companion-repository';

/** How many live companions of the kind the rows hold. */
function liveOfKind(rows: ReadonlyArray<Companion>, kind: Companion['kind']): number {
  return rows.filter((each) => each.archived === undefined && each.kind === kind).length;
}

/** Repository adapter for tests and local experiments. It does not model the character's version. */
export class InMemoryCharacterCompanionRepository extends CharacterCompanionRepository {
  readonly #rows = new Map<CharacterId, ReadonlyArray<Companion>>();

  public override async listForCharacter(characterId: CharacterId): Promise<ReadonlyArray<Companion>> {
    const rows = this.#rows.get(characterId) ?? [];

    return [
      ...rows.filter((each) => each.archived === undefined).toReversed(),
      ...rows.filter((each) => each.archived !== undefined).toReversed(),
    ];
  }

  public override async add({ characterId }: CompanionWriteContext, companion: Companion): Promise<void> {
    const rows = this.#rows.get(characterId) ?? [];

    if (isKindFull(companion.kind, liveOfKind(rows, companion.kind))) {
      throw kindFullError(characterId, companion.kind, 'add');
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

    if (isKindFull(target.kind, liveOfKind(rows, target.kind))) {
      throw kindFullError(characterId, target.kind, 'restore');
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
