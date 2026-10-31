import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { archetypeProgress } from '@pioneer/character/domain';
import { Message, Stack } from '@pioneer/frontier';

import { injectContentRegistry } from '../../data/content-registry-query';
import { sheetEntryNames } from '../sheet-entry-names';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';
import { sheetSlotContent } from '../sheet-slot-content';
import { SheetState } from '../sheet-state';

/** An archetype's line: its name, and the level its lock clears at if the plan reaches it. */
interface ArchetypeLine {
  readonly key: string;
  readonly name: string;
  readonly taken: number;
  readonly lock: number;
  readonly clearsAt: number | undefined;
  readonly cleared: boolean;
}

/**
 * Each archetype the character has taken the dedication of, with the feats taken against its dedication lock and the
 * level the next dedication becomes legal at (#494): "Medic: 1 of 2 feats before your next dedication".
 */
@Component({
  selector: 'pio-sheet-archetype-progress',
  imports: [Message, Stack, TranslocoPipe],
  templateUrl: './sheet-archetype-progress.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetArchetypeProgress {
  readonly #character = inject(SheetState).character;
  /** The registry with the feats and archetypes, shared with the feats section. */
  readonly #feats = injectContentRegistry(FEAT_CONTENT_KINDS);

  protected readonly lines = computed((): readonly ArchetypeLine[] => {
    const registry = this.#feats.data();
    const character = this.#character();
    if (registry === undefined || character === undefined) {
      return [];
    }
    const names = sheetEntryNames(registry);
    return archetypeProgress(character.document, sheetSlotContent(registry)).map(
      ({ archetype, taken, lock, clearsAt }) => ({
        key: archetype,
        name: names.get(archetype) ?? archetype,
        taken,
        lock,
        clearsAt,
        cleared: taken >= lock,
      }),
    );
  });
}
