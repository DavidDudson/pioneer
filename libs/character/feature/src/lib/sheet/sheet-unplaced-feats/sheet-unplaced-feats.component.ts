import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField, unplacedFeatBreaks } from '@pioneer/character/domain';
import { AsyncButton, Badge, BadgeTone, Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import type { ContentId, SlotKey } from '@pioneer/rules/sdk';
import { ContentPreview, OptionPicker } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { sheetEntry } from '../sheet-entry-previews';
import { FEAT_CONTENT_KINDS, sheetFeats } from '../sheet-feats';
import { slotsOpenTo } from '../sheet-unplaced-feat-slots';

/** One imported feat that fits no slot, as the sheet lists it. */
interface UnplacedFeatRow {
  readonly id: ContentId;
  /** The feat's name; undefined while the feats load or when no loaded pack has it. */
  readonly name: string | undefined;
  readonly reason: MessageDescriptor;
  /** The open slots that offer it now, by label; empty when none does. */
  readonly slots: readonly SelectOption<SlotKey>[];
}

/**
 * The feats an import found that no slot offers (ADR-0064): flagged as breaking a rule, never forced into a slot.
 * Picking one in a feat slot, or moving it to a slot that now offers it, takes it off the list; Dismiss does too. Nothing shows when there are none.
 */
@Component({
  selector: 'pio-sheet-unplaced-feats',
  imports: [OptionPicker, AsyncButton, Badge, ContentPreview, Heading, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-unplaced-feats.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetUnplacedFeats {
  readonly #store = inject(CharacterStore);
  readonly #feats = injectContentRegistry(FEAT_CONTENT_KINDS);
  readonly #i18n = inject(TranslocoService);
  protected readonly Tone = BadgeTone;

  protected readonly rows: Signal<readonly UnplacedFeatRow[]> = computed(() => {
    const character = this.#store.selected();
    const registry = this.#feats.data();
    if (character === undefined) {
      return [];
    }
    const slots = this.#store.slots();
    const open = registry === undefined || slots === undefined ? [] : sheetFeats(registry, character, slots).slots;
    return unplacedFeatBreaks(character.document).map(({ feat, reason }) => ({
      id: feat,
      name: registry === undefined ? undefined : sheetEntry(registry, feat)?.name,
      reason,
      slots: slotsOpenTo(feat, open, slots ?? []).map(({ key, label }) => ({
        value: key,
        label: this.#i18n.translate(label.key, label.params),
      })),
    }));
  });

  protected readonly move =
    (feat: ContentId) =>
    async (slot: SlotKey | undefined): Promise<void> => {
      if (slot !== undefined) {
        await this.#store.selectSlot(slot, feat);
      }
    };

  protected readonly dismiss = (feat: ContentId) => async (): Promise<void> =>
    this.#store.patch({ field: CharacterPatchField.DismissUnplacedFeat, feat });
}
