import type { SheetMode } from '@pioneer/character/domain';

import { SheetModeRepository } from './sheet-mode-repository';
import type { SheetModeKey } from './sheet-mode-repository';

/** Repository adapter for tests and local experiments. */
export class InMemorySheetModeRepository extends SheetModeRepository {
  readonly #modes = new Map<string, SheetMode>();

  public override async findFor({ userId, characterId }: SheetModeKey): Promise<SheetMode | undefined> {
    return this.#modes.get(`${userId}/${characterId}`);
  }

  public override async save({ userId, characterId }: SheetModeKey, mode: SheetMode): Promise<void> {
    this.#modes.set(`${userId}/${characterId}`, mode);
  }
}
