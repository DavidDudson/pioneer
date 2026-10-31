import {
  EffectInstanceId,
  equippedRules,
  heldShields,
  itemContent,
  PlayCommandField,
  SELF,
  ShieldCondition,
  shieldCondition,
  shieldHitPoints,
  SpendId,
  SpendKind,
} from '@pioneer/character/domain';
import type { Character, PlayCommand, PlayState } from '@pioneer/character/domain';
import { EntrySlug, HitPoints } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';

import { sheetSlotContent } from './sheet-slot-content';

const NONE = HitPoints.parse(0);

const RAISE_A_SHIELD = EntrySlug.parse('action:raise-a-shield');
const RAISED = EntrySlug.parse('effect:effect-raise-a-shield');
const SHIELD_BLOCK = EntrySlug.parse('feat:shield-block');

/** The entries Raise a Shield and Shield Block are made of, by id. */
export interface ShieldIds {
  /** The Raise a Shield action. */
  readonly raise: ContentId;
  /** The effect that is on while the shield is raised. */
  readonly raised: ContentId;
  /** The Shield Block reaction. */
  readonly block: ContentId;
}

/** The ids of the entries the content has for Raise a Shield and Shield Block; undefined when it lacks one. */
export function shieldIds(registry: ContentRegistry): ShieldIds | undefined {
  const bySlug = new Map(
    registry.packs.flatMap((pack) => pack.otherEntries).map((entry): [EntrySlug, ContentId] => [entry.slug, entry.id]),
  );
  const raise = bySlug.get(RAISE_A_SHIELD);
  const raised = bySlug.get(RAISED);
  const block = bySlug.get(SHIELD_BLOCK);
  return raise === undefined || raised === undefined || block === undefined ? undefined : { raise, raised, block };
}

/** The message each state of a shield is shown as. */
export const SHIELD_CONDITION_MESSAGES = {
  [ShieldCondition.Whole]: 'character.sheet.shields.whole',
  [ShieldCondition.Broken]: 'character.sheet.shields.broken',
  [ShieldCondition.Destroyed]: 'character.sheet.shields.destroyed',
} as const satisfies Record<ShieldCondition, string>;

/** A shield held, as the sheet lists it: its name, Hardness, the Hit Points it has left and how it stands. */
export interface ShieldLine {
  /** The inventory item that holds it. */
  readonly key: string;
  readonly name: string;
  readonly hardness: number;
  readonly hitPoints: number;
  readonly left: number;
  readonly condition: ShieldCondition;
  /** A battle form's shield: it has no Hit Points to show. */
  readonly undamageable: boolean;
}

/** The shields the character holds, with the damage the play state records on each. */
export function shieldLines(registry: ContentRegistry, character: Character, play: PlayState): readonly ShieldLine[] {
  const slots = sheetSlotContent(registry);
  const items = itemContent(registry);
  const held = heldShields(character.document.inventory, items, () => equippedRules(character.document, items, slots));
  return held.map(({ entry, item, hardness, hitPoints, brokenThreshold, undamageable }): ShieldLine => {
    const stats = { hardness, hitPoints, brokenThreshold, ...(undamageable === true ? { undamageable } : {}) };
    const damage = play.shields[item] ?? NONE;
    return {
      key: item,
      name: slots.lookup.entry(entry)?.name ?? entry,
      hardness,
      hitPoints,
      left: shieldHitPoints(stats, damage),
      condition: shieldCondition(stats, damage),
      undamageable: undamageable === true,
    };
  });
}

/** Whether the shield is raised: its effect is on the character. */
export function shieldRaised(play: PlayState, { raised }: ShieldIds): boolean {
  return play.effects.some(({ effect }) => effect === raised);
}

/** The edit that follows Raise a Shield being used: the raised shield's effect, unless it is already on. */
export function raisedEdit(play: PlayState, ids: ShieldIds): PlayCommand | undefined {
  return shieldRaised(play, ids)
    ? undefined
    : { field: PlayCommandField.ApplyEffect, id: EffectInstanceId.parse(newId()), effect: ids.raised, source: SELF };
}

/** The reaction Shield Block takes from the turn. */
export function blockSpend(ids: ShieldIds): PlayCommand {
  return {
    field: PlayCommandField.SpendAction,
    id: SpendId.parse(newId()),
    action: ids.block,
    cost: { kind: SpendKind.Reaction },
  };
}
