import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Segmented, Stack } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { ActionMode } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import type { ActionLine } from './action-line';
import { ActionWords } from './action-words';
import { ActionsAll } from './actions-all.component';
import { ActionsViewKind } from './actions-list';
import { ActionsMessage } from './actions-messages';
import { ActionsNow } from './actions-now.component';

/**
 * A character's actions in two views (play-and-campaigns.md, "Actions and the action economy"). Now lists what the
 * character can do at this moment in the sheet's `mode`, grouped by cost, with the actions the situation calls for
 * first. All lists every action, narrowed by mode, trait, cost and source, and says why the ones that cannot be used
 * now cannot. An action that rolls rolls on the page's roller in one click.
 *
 * Presentational (ADR-0028): the caller passes the lines the engine decided (`availableActions`) with their names, or
 * undefined while they load.
 *
 * ```html
 * <pio-actions [lines]="lines()" [mode]="mode" [(view)]="view" />
 * ```
 */
@Component({
  selector: 'pio-actions',
  imports: [ActionsAll, ActionsNow, Segmented, Stack, TranslocoPipe],
  templateUrl: './actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionsView {
  /** Undefined while loading: the list then shows placeholder rows. */
  public readonly lines = input.required<readonly ActionLine[] | undefined>();
  /** The sheet mode the Now view follows. */
  public readonly mode = input<ActionMode>(ActionMode.Encounter);
  /** What names the entries and items a conditional line comes from. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);
  /** The view that is open. */
  public readonly view = model<ActionsViewKind>(ActionsViewKind.Now);

  protected readonly Message = ActionsMessage;
  protected readonly Now = ActionsViewKind.Now;
  readonly #words = inject(ActionWords);

  /** The view switch's options, in the UI locale. */
  protected readonly viewOptions = computed((): readonly SelectOption<ActionsViewKind>[] => {
    this.#words.changed();
    return [
      { value: ActionsViewKind.Now, label: this.#words.say(ActionsMessage.NowView) },
      { value: ActionsViewKind.All, label: this.#words.say(ActionsMessage.AllView) },
    ];
  });
}
