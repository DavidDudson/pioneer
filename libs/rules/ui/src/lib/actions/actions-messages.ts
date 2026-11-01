import { ActionOriginKind, ActionStatus } from '@pioneer/rules/engine';
import { ActionCost, ActionMode } from '@pioneer/rules/sdk';

import { ActionResourceKind } from './action-line';

/** Message keys the actions list renders with, spelled out so the key check sees them. */
export const ActionsMessage = {
  /** The label of the Now and All switch. */
  ViewLabel: 'rules.actions.viewLabel',
  /** "Now": what the character can do at this moment. */
  NowView: 'rules.actions.nowView',
  /** "All": everything the character can ever do. */
  AllView: 'rules.actions.allView',
  /** Nothing to do right now. */
  EmptyNow: 'rules.actions.emptyNow',
  /** No action matches the filters. */
  EmptyAll: 'rules.actions.emptyAll',
  /** The summary of the filters in the All view. */
  Filters: 'rules.actions.filters',
  FilterMode: 'rules.actions.filterMode',
  FilterCost: 'rules.actions.filterCost',
  FilterTrait: 'rules.actions.filterTrait',
  FilterSource: 'rules.actions.filterSource',
  /** "Granted by Shield Block": where an action the character was granted comes from. */
  GrantedBy: 'rules.actions.grantedBy',
  /** Heading over the actions with no cost. */
  Passive: 'rules.actions.passive',
  /** The button that uses an action. */
  Use: 'rules.actions.use',
  /** The button that uses a variable-cost action for one action. */
  UseForOne: 'rules.actions.useForOne',
  /** The button that uses a variable-cost action for {count} actions. */
  UseForMany: 'rules.actions.useForMany',
  /** Label of an action's trigger in its hover summary. */
  SummaryTrigger: 'rules.actions.summary.trigger',
  /** Label of what an action needs in its hover summary. */
  SummaryRequirements: 'rules.actions.summary.requirements',
} as const;

/** How each action cost is worded, spelled out so the key check sees them. */
export const ACTION_COST_MESSAGES: Readonly<Record<ActionCost, string>> = {
  [ActionCost.One]: 'rules.facet.actionCost.one',
  [ActionCost.Two]: 'rules.facet.actionCost.two',
  [ActionCost.Three]: 'rules.facet.actionCost.three',
  [ActionCost.Free]: 'rules.facet.actionCost.free',
  [ActionCost.Reaction]: 'rules.facet.actionCost.reaction',
};

/** How each sheet mode is worded. */
export const ACTION_MODE_MESSAGES: Readonly<Record<ActionMode, string>> = {
  [ActionMode.Encounter]: 'rules.facet.mode.encounter',
  [ActionMode.Exploration]: 'rules.facet.mode.exploration',
  [ActionMode.Downtime]: 'rules.facet.mode.downtime',
};

/** How each way an action comes to be on the list is worded. */
export const ACTION_SOURCE_MESSAGES: Readonly<Record<ActionOriginKind, string>> = {
  [ActionOriginKind.Basic]: 'rules.actions.source.basic',
  [ActionOriginKind.Skill]: 'rules.actions.source.skill',
  [ActionOriginKind.Granted]: 'rules.actions.source.granted',
  [ActionOriginKind.Item]: 'rules.actions.source.item',
};

/** What an item action shows of the resource it spends, by the kind of resource. */
export const ACTION_RESOURCE_MESSAGES: Readonly<Record<ActionResourceKind, string>> = {
  [ActionResourceKind.Quantity]: 'rules.actions.resource.quantity',
  [ActionResourceKind.Charges]: 'rules.actions.resource.charges',
  [ActionResourceKind.Uses]: 'rules.actions.resource.uses',
};

/** How each status is worded. */
export const ACTION_STATUS_MESSAGES: Readonly<Record<ActionStatus, string>> = {
  [ActionStatus.Available]: 'rules.actions.status.available',
  [ActionStatus.Conditional]: 'rules.actions.status.conditional',
  [ActionStatus.Unavailable]: 'rules.actions.status.unavailable',
};

/** How a variable cost is worded, by the action count it starts at and the one it runs to. Only the ranges drawn. */
export const ACTION_RANGE_MESSAGES: Readonly<Partial<Record<ActionCost, Readonly<Partial<Record<number, string>>>>>> = {
  [ActionCost.One]: { 2: 'rules.actions.costRange.oneToTwo', 3: 'rules.actions.costRange.oneToThree' },
  [ActionCost.Two]: { 3: 'rules.actions.costRange.twoToThree' },
};

/** The cost an action count is drawn as. */
export const ACTION_COUNT_COSTS: Readonly<Partial<Record<number, ActionCost>>> = {
  2: ActionCost.Two,
  3: ActionCost.Three,
};
