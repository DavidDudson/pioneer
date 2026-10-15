import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { UnenabledContent } from '@pioneer/character/domain';
import { List, ListItem, Message, Stack, Text } from '@pioneer/frontier';

import { CharacterUnenabledStore } from '../../data/character-unenabled-store';

/** One line of the warning: what is unenabled, and the pack it comes from. */
interface UnenabledLine {
  readonly key: string;
  readonly params: { readonly name: string; readonly pack: string };
}

/** A group of lines under one heading. */
interface UnenabledGroup {
  readonly heading: string;
  readonly lines: readonly UnenabledLine[];
}

/** The warning: which campaign has not enabled it, and what, grouped by kind. */
interface UnenabledView {
  readonly campaign: string;
  readonly groups: readonly UnenabledGroup[];
}

const HEADINGS = {
  variantRules: 'character.unenabled.variantRules',
  packs: 'character.unenabled.packs',
  items: 'character.unenabled.items',
} as const;

/** The groups that have lines, in the order the warning lists them. */
function groupsOf(content: UnenabledContent): readonly UnenabledGroup[] {
  const groups: readonly UnenabledGroup[] = [
    {
      heading: HEADINGS.variantRules,
      lines: content.variantRules.map(({ variantId, name, packTitle }) => ({
        key: variantId,
        params: { name, pack: packTitle },
      })),
    },
    {
      heading: HEADINGS.packs,
      lines: content.packs.map(({ packId, title, publisher }) => ({
        key: packId,
        params: { name: title, pack: publisher },
      })),
    },
    {
      heading: HEADINGS.items,
      lines: content.items.map(({ item, name, packTitle }) => ({
        key: item,
        params: { name, pack: packTitle },
      })),
    },
  ];
  return groups.filter((group) => group.lines.length > 0);
}

/**
 * A warning on the Plan tab listing the variant rules, packs and items the character uses that the campaign it is in
 * has not enabled, so the player can raise it with the GM. It warns only: nothing is blocked or hidden. Shown only
 * while something is unenabled, and gone once the campaign enables it or the character stops using it. A failed read
 * shows nothing, since the warning is advice and the sheet works without it.
 */
@Component({
  selector: 'pio-sheet-unenabled-content',
  imports: [List, ListItem, Message, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-unenabled-content.component.html',
  providers: [CharacterUnenabledStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetUnenabledContent {
  readonly #store = inject(CharacterUnenabledStore);

  /** What is unenabled, when anything is. */
  protected readonly unenabled = computed((): UnenabledView | undefined => {
    const content = this.#store.content.data();
    if (content?.campaign === undefined) {
      return undefined;
    }
    const groups = groupsOf(content);
    return groups.length === 0 ? undefined : { campaign: content.campaign, groups };
  });
}
