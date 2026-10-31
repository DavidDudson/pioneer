import { inject, Injectable } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { LocaleFormat } from '@pioneer/frontier';
import { ActionOriginKind } from '@pioneer/rules/engine';
import { filter, merge } from 'rxjs';

import type { LabelNames } from '../breakdown/line-words';
import { conditionalLines } from '../statistics/conditional-lines';
import type { ActionLine } from './action-line';
import type { ShownAction } from './action-row.component';
import { PASSIVE } from './actions-list';
import type { CostGroup } from './actions-list';
import { ACTION_COST_MESSAGES, ACTION_SOURCE_MESSAGES, ActionsMessage } from './actions-messages';

const NO_NAMES: LabelNames = { entries: new Map() };

/**
 * Words the actions list in the UI locale. Read `changed` inside a `computed` so the result is worded again when the
 * language changes or a message scope finishes loading.
 */
@Injectable({ providedIn: 'root' })
export class ActionWords {
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));

  /** Ticks when the locale changes or a message scope finishes loading. */
  public readonly changed: Signal<unknown> = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  /** Compares two names in the UI locale. */
  public readonly compare = (left: string, right: string): number => this.#format.compare(left, right);

  /** Says a message. */
  public readonly say = (key: string, params?: Readonly<Record<string, string | number>>): string =>
    this.#i18n.translate(key, params);

  /** "1 action", "Reaction", or the word for an action with no cost. */
  public cost(cost: CostGroup): string {
    return this.#i18n.translate(cost === PASSIVE ? ActionsMessage.Passive : ACTION_COST_MESSAGES[cost]);
  }

  /** "Basic action", or "Granted by Shield Block". */
  public source({ origin, source }: ActionLine): string {
    return origin.kind === ActionOriginKind.Granted && source !== undefined
      ? this.#i18n.translate(ActionsMessage.GrantedBy, { name: source })
      : this.#i18n.translate(ACTION_SOURCE_MESSAGES[origin.kind]);
  }

  /** The line with its cost and source worded together, and the reasons it is not plainly available worded. */
  public shown(line: ActionLine, names: LabelNames = NO_NAMES): ShownAction {
    return {
      line,
      detail: this.#format.list([this.cost(line.cost ?? PASSIVE), this.source(line)], 'unit'),
      reasons: line.reasons.map(({ key, params }) => this.#i18n.translate(key, params)),
      conditions:
        line.roll === undefined ? [] : conditionalLines(line.roll, { i18n: this.#i18n, format: this.#format, names }),
    };
  }
}
