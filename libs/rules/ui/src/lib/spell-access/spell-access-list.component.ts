import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideX } from '@lucide/angular';
import { AsyncButton, EmptyState, Icon, List, ListItem, Skeleton, Stack, Text } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';

import { ContentPreview } from '../entry-preview/content-preview.component';
import type { SpellAccessLine } from './spell-access-line';
import { SpellAccessMessage } from './spell-access-messages';

const LOADING_ROWS = 2;

/** Takes a spell out of the build's access; resolves once it is saved. */
export type RemoveSpellAccess = (spell: string) => Promise<unknown>;

/** A line as the list shows it: by name, or "Unknown spell" when no loaded pack has it, and its Remove. */
interface AccessRow {
  readonly spell: ContentId;
  readonly name: string;
  readonly remove: () => Promise<unknown>;
}

/**
 * The uncommon, rare and unique spells a character has access to (ADR-0044), each with Remove, which runs `remove`
 * with the spell's id, pending and failing in place.
 *
 * Presentational (ADR-0028): the caller works out the lines, or passes undefined while they load.
 *
 * ```html
 * <pio-spell-access-list [lines]="access()?.granted" [remove]="revoke" />
 * ```
 */
@Component({
  selector: 'pio-spell-access-list',
  imports: [ContentPreview, AsyncButton, EmptyState, Icon, List, ListItem, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './spell-access-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpellAccessListView {
  /** The spells in the order the build lists them, or undefined while they load. */
  public readonly lines = input<readonly SpellAccessLine[] | undefined>();
  public readonly remove = input<RemoveSpellAccess>(async () => undefined);

  readonly #i18n = inject(TranslocoService);

  protected readonly rows = computed((): readonly AccessRow[] | undefined => {
    const remove = this.remove();
    return this.lines()?.map(({ spell, name }) => ({
      spell,
      name: name ?? this.#i18n.translate(SpellAccessMessage.UnknownSpell),
      remove: async () => remove(spell),
    }));
  });
  protected readonly Message = SpellAccessMessage;
  protected readonly RemoveIcon = LucideX;
  protected readonly loadingRows = Array.from({ length: LOADING_ROWS }, (_unused, index) => index);
}
