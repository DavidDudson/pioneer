import { ActionOriginKind, ActionStatus, EngineMessage } from '@pioneer/rules/engine';
import { ActionCost, ActionMode, ContentId, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { ActionLine } from '../actions/action-line';
import { statistic, term } from './breakdown-fixtures';

const BASIC = { kind: ActionOriginKind.Basic } as const;
const SKILL = { kind: ActionOriginKind.Skill } as const;

const ATHLETICS_TOTAL = 9;
const ATHLETICS_RANK_BONUS = 5;

const PLAYER_CORE = PackId.parse('player-core');

function actionId(slug: string): ContentId {
  return ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse(`action:${slug}`)));
}

/** The Athletics check an action that rolls uses. */
const ATHLETICS = statistic('skill:athletics', {
  base: [term('10', ATHLETICS_TOTAL - ATHLETICS_RANK_BONUS), term('rank', ATHLETICS_RANK_BONUS)],
});

/** An action of the fixtures with what most of them share: standing, usable now, in an encounter. */
function line(slug: string, name: string, rest: Partial<ActionLine> = {}): ActionLine {
  return {
    id: actionId(slug),
    name,
    traits: [],
    cost: ActionCost.One,
    modes: [ActionMode.Encounter],
    origin: BASIC,
    source: undefined,
    status: ActionStatus.Available,
    reasons: [],
    roll: undefined,
    priority: undefined,
    dormant: false,
    ...rest,
  };
}

const STRIDE = line('stride', 'Stride', { traits: ['move'] });
const STAND = line('stand', 'Stand', { traits: ['move'] });
const CRAWL = line('crawl', 'Crawl', { traits: ['move'] });
const ESCAPE = line('escape', 'Escape', { traits: ['attack'], origin: SKILL, roll: ATHLETICS });
const SHIELD_BLOCK = line('shield-block', 'Shield Block', {
  cost: ActionCost.Reaction,
  origin: { kind: ActionOriginKind.Granted, source: { hops: [], entry: actionId('shield-block'), sources: [] } },
  source: 'Shield Block',
});
const DEMORALIZE = line('demoralize', 'Demoralize', { traits: ['auditory', 'emotion'], origin: SKILL });
const GRAPPLE = line('grapple', 'Grapple', { traits: ['attack'], origin: SKILL, roll: ATHLETICS });
const PICK_A_LOCK = line('pick-a-lock', 'Pick a Lock', {
  cost: ActionCost.Two,
  origin: SKILL,
  status: ActionStatus.Unavailable,
  reasons: [message(EngineMessage.ActionUntrained, { rank: 'trained', skills: 'thievery' })],
});
const DISABLE = line('disable-a-device', 'Disable a Device', {
  cost: ActionCost.Two,
  origin: SKILL,
  status: ActionStatus.Conditional,
  reasons: [message(EngineMessage.ActionRequirementsText)],
});
const EARN_INCOME = line('earn-income', 'Earn Income', { cost: undefined, modes: [ActionMode.Downtime] });
const SENSE_DIRECTION = line('sense-direction', 'Sense Direction', {
  cost: undefined,
  modes: [ActionMode.Exploration],
});

/** A standing character in an encounter: basic and skill actions, one rolls, one needs training, one has requirements. */
export const STANDING_ACTIONS: readonly ActionLine[] = [
  STRIDE,
  STAND,
  ESCAPE,
  DEMORALIZE,
  GRAPPLE,
  PICK_A_LOCK,
  DISABLE,
  { ...SHIELD_BLOCK, dormant: true },
  EARN_INCOME,
  SENSE_DIRECTION,
];

/** The same character prone: Stand and Crawl are called for. */
export const PRONE_ACTIONS: readonly ActionLine[] = [
  STRIDE,
  { ...CRAWL, priority: 1 },
  { ...STAND, priority: 0 },
  DEMORALIZE,
  PICK_A_LOCK,
  { ...SHIELD_BLOCK, dormant: true },
];

/** The character grabbed: Escape is called for, ahead of the other one-action skill actions. */
export const GRABBED_ACTIONS: readonly ActionLine[] = [STRIDE, DEMORALIZE, { ...ESCAPE, priority: 0 }];

/** The character with its shield raised: Shield Block is enabled and called for. */
export const SHIELD_RAISED_ACTIONS: readonly ActionLine[] = [STRIDE, { ...SHIELD_BLOCK, priority: 0 }];
