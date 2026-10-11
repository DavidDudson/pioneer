import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideX } from '@lucide/angular';
import { AsyncButton, EmptyState, Icon, List, ListItem, Skeleton, Stack, Text } from '@pioneer/frontier';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { LanguageLine } from './language-line';
import { LanguagesMessage } from './languages-messages';

const LOADING_ROWS = 2;

/** Removes the pick in a slot; resolves once it is saved. */
export type RemoveLanguage = (slot: string) => Promise<unknown>;

/** A line as the list shows it: where it came from as a message, and removing a pick. */
interface LanguageRow {
  readonly key: string;
  readonly name: string;
  readonly caption: MessageDescriptor;
  readonly remove: (() => Promise<unknown>) | undefined;
}

function rowOf({ key, name, from, slot }: LanguageLine, remove: RemoveLanguage): LanguageRow {
  const caption =
    from === undefined ? message(LanguagesMessage.Picked) : message(LanguagesMessage.From, { source: from });
  return { key, name, caption, remove: slot === undefined ? undefined : async () => remove(slot) };
}

/**
 * The languages a character knows, each with where it came from: "from Dwarf", "from Angelkin", or "Picked". A picked
 * language can be removed: its button runs `remove` with the slot it fills, pending and failing in place.
 *
 * Presentational (ADR-0028): the caller works out the lines, in sheet order, or passes undefined while they load.
 *
 * ```html
 * <pio-languages [lines]="languages()" [remove]="remove" />
 * ```
 */
@Component({
  selector: 'pio-languages',
  imports: [AsyncButton, EmptyState, Icon, List, ListItem, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './languages.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguagesView {
  /** The languages in sheet order, or undefined while they load. */
  public readonly lines = input<readonly LanguageLine[] | undefined>();
  public readonly remove = input<RemoveLanguage>(async () => undefined);

  protected readonly rows = computed(() => {
    const remove = this.remove();
    return this.lines()?.map((line) => rowOf(line, remove));
  });
  protected readonly Message = LanguagesMessage;
  protected readonly RemoveIcon = LucideX;
  protected readonly loadingRows = Array.from({ length: LOADING_ROWS }, (_unused, index) => index);
}
