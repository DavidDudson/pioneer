import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { restrictionsHolding } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Stack } from '@pioneer/frontier';
import type { ActionMode } from '@pioneer/rules/sdk';
import { ActionCategory, ActionsView, ActionsViewKind } from '@pioneer/rules/ui';
import type { ActionLine } from '@pioneer/rules/ui';
import { map } from 'rxjs';

import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { ACTION_CONTENT_KINDS, sheetActions } from '../sheet-actions';
import { SheetConsumableRoll } from '../sheet-consumable-roll/sheet-consumable-roll.component';
import { sheetRestrictions } from '../sheet-environments';
import { sheetInnateActions } from '../sheet-innate-actions';
import { statisticInputsOf } from '../sheet-inputs';
import { sheetItemActions } from '../sheet-item-actions';
import { SheetSpender } from '../sheet-spender';
import { SheetState } from '../sheet-state';
import { sheetStrikeActions } from '../sheet-strike-actions';
import { RememberedActionKind } from './remembered-action-kind';

/** The query parameter that names the open subtab: the kind of action it lists. */
const KIND_PARAM = 'actions';

/** The kind `text` names, or undefined for none or an unknown one. */
function kindFrom(text: string | null): ActionCategory | undefined {
  return Object.values(ActionCategory).find((kind) => kind === text);
}

/**
 * A sheet tab's Actions section (#353): the character's actions in the tab's mode, as Now (what it can do at this
 * moment, grouped by cost, the situation's first, and only what the turn has the actions for) and All (every action,
 * filterable, with why an unusable one is). An action with a roll rolls on the sheet's roll card in one click, with
 * the conditional toggles of the roll; one with a cost is used with the sheet's spender (#355). It reads the character
 * the sheet shows, so the conditions and the form in play (#531) decide what is usable.
 */
@Component({
  selector: 'pio-sheet-actions',
  imports: [ActionsView, AsyncData, AsyncPending, AsyncRegion, SheetConsumableRoll, Stack],
  templateUrl: './sheet-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetActions {
  readonly #sheet = inject(SheetState);
  readonly #play = inject(PlayStore);
  readonly #spender = inject(SheetSpender);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #remembered = inject(RememberedActionKind);
  readonly #urlKind = toSignal(this.#route.queryParamMap.pipe(map((params) => kindFrom(params.get(KIND_PARAM)))));

  /** The tab's mode: the Now view lists the actions used in it. */
  public readonly mode = input.required<ActionMode>();

  /** The registry with the actions and what grants them. */
  protected readonly registry = injectContentRegistry(ACTION_CONTENT_KINDS);
  protected readonly playQuery = this.#play.play;
  protected readonly view = signal<ActionsViewKind>(ActionsViewKind.Now);
  protected readonly entryNames = this.#sheet.picks.entryNames;
  /** The open subtab: the address's, else the one last open on any sheet tab. */
  protected readonly kind = computed((): ActionCategory | undefined => this.#urlKind() ?? this.#remembered.kind());

  public constructor() {
    // A tab opened without a subtab in its address takes the remembered one into it, so the address says what is shown.
    effect(() => {
      const remembered = this.#remembered.kind();
      if (remembered !== undefined && this.#urlKind() === undefined) {
        untracked(() => {
          this.#write(remembered);
        });
      }
    });
  }

  protected open(kind: ActionCategory | undefined): void {
    this.#remembered.kind.set(kind);
    this.#write(kind);
  }

  #write(kind: ActionCategory | undefined): void {
    // oxlint-disable-next-line typescript/no-floating-promises -- the router reports a failed navigation itself
    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { [KIND_PARAM]: kind },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** The actions as the engine decides them for the character now; undefined while the content or play state loads. */
  protected readonly lines = computed((): readonly ActionLine[] | undefined => {
    const registry = this.registry.data();
    const character = this.#sheet.character();
    const read = this.#play.play.data();
    if (registry === undefined || character === undefined || read === undefined) {
      return undefined;
    }
    const engine = this.#sheet.engine();
    const restrictions = sheetRestrictions({ registry, engine, character }, read.play.environments);
    const turn = this.#spender.turn();
    const own = sheetActions(registry, character, {
      resources: read.play.resources,
      turn,
      restrictions: restrictionsHolding(restrictions),
    });
    const items =
      engine === undefined
        ? []
        : sheetItemActions(registry, character, {
            resources: read.play.resources,
            turn,
            inputs: statisticInputsOf(engine, character),
          });
    return [
      ...sheetStrikeActions(registry, character, turn),
      ...sheetInnateActions(registry, character, turn),
      ...own,
      ...items,
    ];
  });
}
