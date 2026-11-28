import type { Provider } from '@angular/core';
import { FilterOperator } from '@pioneer/frontier';
import { PropertyAlign, providePropertyKinds } from '@pioneer/frontier/data';
import type { PropertyContext, PropertyKind } from '@pioneer/frontier/data';
import type { SourceRef } from '@pioneer/rules/sdk';

import { ActionCostCell } from '../picker-cells/action-cost-cell/action-cost-cell.component';
import type { Chip } from '../picker-cells/chip-list/chip-list.component';
import { ChipList } from '../picker-cells/chip-list/chip-list.component';
import { LevelCell } from '../picker-cells/level-cell/level-cell.component';
import { ACTION_KIND_MESSAGES } from '../picker-cells/picker-cell-messages';
import type { ActionKind } from '../picker-cells/picker-cell-messages';
import { PrerequisiteList, PrerequisiteState } from '../picker-cells/prerequisite-list/prerequisite-list.component';
import type { PrerequisiteLine } from '../picker-cells/prerequisite-list/prerequisite-list.component';
import { ACTION_ORDER } from '../picker-cells/rules-table-schema';
import { SourcesCell } from './cells/sources-cell.component';

/** The ids of the kinds rules properties use, besides the four frontier ships. */
export const RulesPropertyKindId = {
  Level: 'rules-level',
  Chips: 'rules-chips',
  ActionCost: 'rules-action-cost',
  Prerequisites: 'rules-prerequisites',
  Sources: 'rules-sources',
} as const;

function compareNumbers(left: number, right: number): number {
  if (left < right) {
    return -1;
  }

  return left > right ? 1 : 0;
}

/** What a level-less entry sorts by: before every level, creatures' -1 included. */
const NO_LEVEL = Number.NEGATIVE_INFINITY;

const LEVEL_KIND: PropertyKind<number | undefined> = {
  id: RulesPropertyKindId.Level,
  align: PropertyAlign.End,
  operators: [FilterOperator.Is, FilterOperator.Between],
  cell: LevelCell,
  compare: (left, right) => compareNumbers(left ?? NO_LEVEL, right ?? NO_LEVEL),
  text: (value, context: PropertyContext) => (value === undefined ? '' : context.formatNumber(value)),
};

function labelsOf(chips: ReadonlyArray<Chip>): string {
  return chips.map(({ label }) => label).join(' ');
}

const CHIPS_KIND: PropertyKind<ReadonlyArray<Chip>> = {
  id: RulesPropertyKindId.Chips,
  align: PropertyAlign.Start,
  operators: [FilterOperator.IsAnyOf, FilterOperator.Is, FilterOperator.IsNot],
  cell: ChipList,
  compare: (left, right, context) => context.compareText(labelsOf(left), labelsOf(right)),
  text: labelsOf,
};

const ACTION_COST_KIND: PropertyKind<ActionKind> = {
  id: RulesPropertyKindId.ActionCost,
  align: PropertyAlign.Start,
  operators: [FilterOperator.Is, FilterOperator.IsNot, FilterOperator.IsAnyOf],
  cell: ActionCostCell,
  compare: (left, right) => compareNumbers(ACTION_ORDER.indexOf(left), ACTION_ORDER.indexOf(right)),
  text: (value, context) => context.translate(ACTION_KIND_MESSAGES[value].label),
};

function unmetCount(lines: ReadonlyArray<PrerequisiteLine>): number {
  return lines.filter(({ state }) => state === PrerequisiteState.Unmet).length;
}

const PREREQUISITES_KIND: PropertyKind<ReadonlyArray<PrerequisiteLine>> = {
  id: RulesPropertyKindId.Prerequisites,
  align: PropertyAlign.Start,
  operators: [FilterOperator.Is, FilterOperator.IsNot],
  cell: PrerequisiteList,
  compare: (left, right) => compareNumbers(unmetCount(left), unmetCount(right)),
  text: (value) => value.map(({ label }) => label).join(', '),
};

const SOURCES_KIND: PropertyKind<ReadonlyArray<SourceRef>> = {
  id: RulesPropertyKindId.Sources,
  align: PropertyAlign.Start,
  operators: [FilterOperator.IsAnyOf, FilterOperator.Is, FilterOperator.IsNot],
  cell: SourcesCell,
  compare: (left, right) => compareNumbers(left.length, right.length),
  text: (value, context) => context.formatNumber(value.length),
};

/** The kinds the rules libraries add to frontier's. */
export const RULES_PROPERTY_KINDS: ReadonlyArray<PropertyKind> = [
  LEVEL_KIND,
  CHIPS_KIND,
  ACTION_COST_KIND,
  PREREQUISITES_KIND,
  SOURCES_KIND,
];

/** Registers the rules kinds. Provide it where a table built from rules properties is shown. */
export function provideRulesPropertyKinds(): Provider {
  return providePropertyKinds(...RULES_PROPERTY_KINDS);
}
