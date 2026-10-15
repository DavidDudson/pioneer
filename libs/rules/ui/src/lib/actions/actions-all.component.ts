import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Disclosure, FilterChips, Stack, Text } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { ActionOriginKind } from '@pioneer/rules/engine';
import { ActionMode } from '@pioneer/rules/sdk';

import type { ActionLine } from './action-line';
import { ActionList } from './action-list.component';
import type { ShownAction } from './action-row.component';
import { ActionWords } from './action-words';
import { COST_ORDER, filterActions, NO_FILTERS, traitsOf } from './actions-list';
import type { ActionFilters, CostGroup } from './actions-list';
import { ACTION_MODE_MESSAGES, ACTION_SOURCE_MESSAGES, ActionsMessage } from './actions-messages';

/**
 * The All view (`pio-actions`): every action, narrowed by mode, trait, cost and source, each with its status and why
 * an action that cannot be used cannot.
 */
@Component({
  selector: 'pio-actions-all',
  imports: [ActionList, Disclosure, FilterChips, Stack, Text, TranslocoPipe],
  templateUrl: './actions-all.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionsAll {
  /** Undefined while loading. */
  public readonly lines = input.required<readonly ActionLine[] | undefined>();

  protected readonly Message = ActionsMessage;
  readonly #words = inject(ActionWords);
  readonly #filters = signal<ActionFilters>(NO_FILTERS);

  protected readonly modes = computed(() => this.#filters().modes);
  protected readonly costs = computed(() => this.#filters().costs);
  protected readonly traits = computed(() => this.#filters().traits);
  protected readonly sources = computed(() => this.#filters().sources);

  protected readonly modeOptions = computed((): readonly SelectOption<ActionMode>[] => {
    this.#words.changed();
    return Object.values(ActionMode).map((value) => ({ value, label: this.#words.say(ACTION_MODE_MESSAGES[value]) }));
  });

  protected readonly costOptions = computed((): readonly SelectOption<CostGroup>[] => {
    this.#words.changed();
    return COST_ORDER.map((value) => ({ value, label: this.#words.cost(value) }));
  });

  protected readonly sourceOptions = computed((): readonly SelectOption<ActionOriginKind>[] => {
    this.#words.changed();
    return Object.values(ActionOriginKind).map((value) => ({
      value,
      label: this.#words.say(ACTION_SOURCE_MESSAGES[value]),
    }));
  });

  protected readonly traitOptions = computed((): readonly SelectOption<string>[] => {
    this.#words.changed();
    return traitsOf(this.lines() ?? [], this.#words.compare).map((value) => ({ value, label: value }));
  });

  /** Every action the filters let through. */
  protected readonly rows = computed((): readonly ShownAction[] | undefined => {
    this.#words.changed();
    const lines = this.lines();
    return lines === undefined
      ? undefined
      : filterActions(lines, this.#filters()).map((line) => this.#words.shown(line));
  });

  protected setModes(modes: ReadonlySet<ActionMode>): void {
    this.#filters.update((filters) => ({ ...filters, modes }));
  }

  protected setCosts(costs: ReadonlySet<CostGroup>): void {
    this.#filters.update((filters) => ({ ...filters, costs }));
  }

  protected setTraits(traits: ReadonlySet<string>): void {
    this.#filters.update((filters) => ({ ...filters, traits }));
  }

  protected setSources(sources: ReadonlySet<ActionOriginKind>): void {
    this.#filters.update((filters) => ({ ...filters, sources }));
  }
}
