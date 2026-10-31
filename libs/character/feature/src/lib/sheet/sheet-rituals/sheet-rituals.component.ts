import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { sheetEntry } from '../sheet-entry-previews';

/** One ritual the character knows: its name, once the content loads. */
interface RitualRow {
  readonly id: ContentId;
  /** The ritual's name; undefined while the content loads or when no loaded pack has it. */
  readonly name: string | undefined;
}

/**
 * The rituals the open character knows (#1556 feat(interop): carry Pathbuilder rituals onto the character). Nothing
 * shows when it knows none.
 */
@Component({
  selector: 'pio-sheet-rituals',
  imports: [Heading, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-rituals.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetRituals {
  readonly #store = inject(CharacterStore);
  readonly #content = injectContentRegistry([ContentKind.Ritual]);

  protected readonly rows: Signal<readonly RitualRow[]> = computed(() => {
    const registry = this.#content.data();
    return (this.#store.selected()?.document.build.rituals ?? []).map((id) => ({
      id,
      name: registry === undefined ? undefined : sheetEntry(registry, id)?.name,
    }));
  });
}
