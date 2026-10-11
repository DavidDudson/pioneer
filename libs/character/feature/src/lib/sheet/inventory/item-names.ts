import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import type { RunedContent } from '@pioneer/character/domain';
import { injectRunedName } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';

import { CharacterStore } from '../../data/character-store';
import { lineRunes } from './sheet-inventory';

/**
 * Each item of the open character by the name its row shows: the player's name for it, else its content's with its
 * runes ("+1 Flaming Longsword"), else that no loaded content has it. Labels name items this way so two longswords
 * read apart. Call in an injection context.
 */
export function injectItemNames(content: Signal<RunedContent | undefined>): Signal<ReadonlyMap<string, string>> {
  const store = inject(CharacterStore);
  const i18n = inject(TranslocoService);
  const runedName = injectRunedName();
  const loaded = i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  const messages = toSignal(merge(i18n.langChanges$, loaded));
  return computed(() => {
    messages();
    const runed = content();
    const named = runedName();
    const items = store.selected()?.document.inventory.items ?? [];
    return new Map(
      items.map((item): [string, string] => {
        const entry = runed?.items.get(item.item);
        if (item.name !== undefined) {
          return [item.id, item.name];
        }
        return entry === undefined || runed === undefined
          ? [item.id, i18n.translate('rules.inventory.unknownItem')]
          : [item.id, named(entry.name, lineRunes(item, entry, runed.runes))];
      }),
    );
  });
}
