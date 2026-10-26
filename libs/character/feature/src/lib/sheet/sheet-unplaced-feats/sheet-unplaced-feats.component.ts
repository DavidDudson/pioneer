import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CharacterPatchField, unplacedFeatBreaks } from '@pioneer/character/domain';
import { AsyncButton, Badge, BadgeTone, Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';
import { ContentPreview } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { sheetEntry } from '../sheet-entry-previews';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';

/** One imported feat that fits no slot, as the sheet lists it. */
interface UnplacedFeatRow {
  readonly id: ContentId;
  /** The feat's name; undefined while the feats load or when no loaded pack has it. */
  readonly name: string | undefined;
  readonly reason: MessageDescriptor;
}

/**
 * The feats an import found that no slot offers (ADR-0064): flagged as breaking a rule, never forced into a slot.
 * Picking one in a feat slot takes it off the list; Dismiss does too. Nothing shows when there are none.
 */
@Component({
  selector: 'pio-sheet-unplaced-feats',
  imports: [AsyncButton, Badge, ContentPreview, Heading, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-unplaced-feats.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetUnplacedFeats {
  readonly #store = inject(CharacterStore);
  readonly #feats = injectContentRegistry(FEAT_CONTENT_KINDS);
  protected readonly Tone = BadgeTone;

  protected readonly rows: Signal<readonly UnplacedFeatRow[]> = computed(() => {
    const character = this.#store.selected();
    const registry = this.#feats.data();
    if (character === undefined) {
      return [];
    }
    return unplacedFeatBreaks(character.document).map(({ feat, reason }) => ({
      id: feat,
      name: registry === undefined ? undefined : sheetEntry(registry, feat)?.name,
      reason,
    }));
  });

  protected readonly dismiss = (feat: ContentId) => async (): Promise<void> =>
    this.#store.patch({ field: CharacterPatchField.DismissUnplacedFeat, feat });
}
