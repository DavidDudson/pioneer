import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PlayCommandField } from '@pioneer/character/domain';
import type { SpendId } from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncData,
  AsyncPending,
  AsyncRegion,
  DateDisplay,
  Skeleton,
  Stack,
  Text,
} from '@pioneer/frontier';
import type { ContentEntry, ContentId, ContentKind } from '@pioneer/rules/sdk';

import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { ACTION_CONTENT_KINDS } from '../sheet-actions';
import { describeSaveError } from '../sheet-field';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';
import { spendRows } from './spend-log-view';
import type { SpendRow } from './spend-log-view';

/** What the log names: the actions, items and spells that can be used. */
const SPEND_CONTENT_KINDS: readonly ContentKind[] = [...new Set([...ACTION_CONTENT_KINDS, ...SPELL_CONTENT_KINDS])];

/**
 * The spend log (#355): what was used since the turn began, newest first, each with what it cost and a button that
 * takes it back, giving its actions, reaction and frequency use back to the turn.
 */
@Component({
  selector: 'pio-sheet-spend-log',
  imports: [AsyncButton, AsyncData, AsyncPending, AsyncRegion, DateDisplay, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-spend-log.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetSpendLog {
  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);

  protected readonly registry = injectContentRegistry(SPEND_CONTENT_KINDS);
  protected readonly playQuery = this.#play.play;

  /** The log's rows, with the names of the actions the content has. */
  protected readonly rows = computed((): readonly SpendRow[] => {
    const read = this.#play.play.data();
    const entries: readonly ContentEntry[] = this.registry.data()?.packs.flatMap((pack) => pack.otherEntries) ?? [];
    const names = new Map<ContentId, string>(entries.map((entry): [ContentId, string] => [entry.id, entry.name]));
    return read === undefined ? [] : spendRows(read.play.spendLog, names);
  });

  /** What a row's cost says, in the UI locale. */
  protected readonly costOf = (row: SpendRow): string => this.#i18n.translate(row.cost.key, row.cost.params);

  /** The undo for `id`, as the button runs it. */
  protected readonly undo = (id: SpendId) => async (): Promise<void> =>
    this.#play.send({ field: PlayCommandField.UndoSpend, id });

  /** The server's reason (a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
