import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CharacterPatchField, UnplacedPickKind, unplacedPickBreaks } from '@pioneer/character/domain';
import type { UnplacedPickBreak } from '@pioneer/character/domain';
import { AsyncButton, Badge, BadgeTone, Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { CharacterStore } from '../../data/character-store';
import { CHARACTER_CONTENT_KINDS, injectContentRegistry } from '../../data/content-registry-query';
import { sheetEntry } from '../sheet-entry-previews';

/** The words a kind of pick is listed under. */
const WORDS = {
  [UnplacedPickKind.Heritage]: {
    heading: 'character.sheet.unplacedPicks.heritageHeading',
    explain: 'character.sheet.unplacedPicks.heritageExplain',
  },
  [UnplacedPickKind.Language]: {
    heading: 'character.sheet.unplacedPicks.languageHeading',
    explain: 'character.sheet.unplacedPicks.languageExplain',
  },
} as const satisfies Record<UnplacedPickKind, { readonly heading: string; readonly explain: string }>;

/** One imported heritage or language that no slot holds, as the sheet lists it. */
interface UnplacedPickRow {
  readonly id: ContentId;
  /** The pick's name; undefined while the content loads or when no loaded pack has it. */
  readonly name: string | undefined;
  readonly reason: MessageDescriptor;
}

/**
 * The imported heritage or languages (`kind`) that no slot holds (ADR-0064): flagged as breaking a rule, never forced
 * into a slot. Picking a heritage in its slot, or a language in a language slot, takes it off the list; Dismiss does
 * too. Nothing shows when there are none.
 */
@Component({
  selector: 'pio-sheet-unplaced-picks',
  imports: [AsyncButton, Badge, Heading, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-unplaced-picks.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetUnplacedPicks {
  public readonly kind = input.required<UnplacedPickKind>();

  readonly #store = inject(CharacterStore);
  readonly #content = injectContentRegistry(CHARACTER_CONTENT_KINDS);
  protected readonly Tone = BadgeTone;
  protected readonly words = computed(() => WORDS[this.kind()]);

  protected readonly rows: Signal<readonly UnplacedPickRow[]> = computed(() => {
    const character = this.#store.selected();
    const registry = this.#content.data();
    if (character === undefined) {
      return [];
    }
    return unplacedPickBreaks(character.document)
      .filter((each: UnplacedPickBreak) => each.kind === this.kind())
      .map(({ pick, reason }) => ({
        id: pick,
        name: registry === undefined ? undefined : sheetEntry(registry, pick)?.name,
        reason,
      }));
  });

  protected readonly dismiss = (pick: ContentId) => async (): Promise<void> =>
    this.#store.patch(
      this.kind() === UnplacedPickKind.Heritage
        ? { field: CharacterPatchField.DismissUnplacedHeritage, heritage: pick }
        : { field: CharacterPatchField.DismissUnplacedLanguage, language: pick },
    );
}
