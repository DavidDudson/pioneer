import { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import type { ConditionEffect, ConditionValue, ContentId, HitPoints } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { ActiveCondition } from './conditions';
import type { CountedMaxima, SlotCountKey, UseCountKey } from './counted-resources';
import type { DeathTrack, Doomed } from './death-track';
import { InventoryItemId } from './inventory';
import type { Resource, ResourceCount, ResourceMaxima, ResourcesSpent } from './resources';
import { StaffSlotSchema } from './staff-charges';
import type { StaffLimits } from './staff-limits';

/**
 * The play edits that restore resources. Each is its own action, optional at the table, and applies as one command
 * after its changes were previewed; none is ever applied on its own, such as when the app opens.
 */
export const RestCommandField = {
  /** HP (Constitution modifier, at least 1, times level), the conditions the content eases on Rest (fatigued, drained) eased, and doomed down 1. */
  Rest: 'rest',
  /**
   * Spell slots, focus points and per-day uses back, and the staff to prepare, if any, with the slot a prepared caster
   * expends for more charges.
   */
  DailyPreparations: 'dailyPreparations',
  /** One focus point back. */
  Refocus: 'refocus',
  /** Hero points to 1, and per-session uses back. */
  StartSession: 'startSession',
} as const;
export type RestCommandField = ValueOf<typeof RestCommandField>;

/** The most prepared slots one daily preparations can change: far above the slots any character has. */
export const PREPARED_PICKS_MAX = 100;

/** A prepared slot and the spell to prepare in it, as `selectSlot` asks for it. */
export const PreparedPickSchema = z.strictObject({ slot: SlotKey, selection: ChoiceValue });
export type PreparedPick = z.infer<typeof PreparedPickSchema>;

export const RestCommandSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(RestCommandField.Rest) }),
  z.object({
    field: z.literal(RestCommandField.DailyPreparations),
    staff: InventoryItemId.optional(),
    slot: StaffSlotSchema.optional(),
    /** The spells to prepare in place of the build's, which replace them on the build in the same edit. */
    prepared: z.array(PreparedPickSchema).max(PREPARED_PICKS_MAX).optional(),
  }),
  z.object({ field: z.literal(RestCommandField.Refocus) }),
  z.object({ field: z.literal(RestCommandField.StartSession) }),
]);
export type RestCommand = z.infer<typeof RestCommandSchema>;

/** What changed, in the terms the preview words; the sheet turns each into a message. */
export const RestChangeKind = {
  HitPoints: 'hitPoints',
  ConditionRemoved: 'conditionRemoved',
  ConditionLowered: 'conditionLowered',
  Doomed: 'doomed',
  Points: 'points',
  Slots: 'slots',
  Uses: 'uses',
  StaffCharges: 'staffCharges',
  SlotExpended: 'slotExpended',
} as const;
export type RestChangeKind = ValueOf<typeof RestChangeKind>;

export type RestChange =
  | {
      readonly kind: typeof RestChangeKind.HitPoints;
      readonly gained: HitPoints;
    }
  | {
      readonly kind: typeof RestChangeKind.ConditionRemoved;
      readonly condition: ContentId;
    }
  | {
      readonly kind: typeof RestChangeKind.ConditionLowered;
      readonly condition: ContentId;
      readonly value: ConditionValue;
    }
  | { readonly kind: typeof RestChangeKind.Doomed; readonly doomed: Doomed }
  | {
      readonly kind: typeof RestChangeKind.Points;
      readonly resource: Resource;
      readonly from: ResourceCount;
      readonly to: ResourceCount;
    }
  | {
      readonly kind: typeof RestChangeKind.Slots;
      readonly key: SlotCountKey;
      readonly amount: ResourceCount;
    }
  | {
      readonly kind: typeof RestChangeKind.Uses;
      readonly key: UseCountKey;
      readonly amount: ResourceCount;
    }
  | {
      readonly kind: typeof RestChangeKind.StaffCharges;
      readonly item: InventoryItemId;
      readonly charges: ResourceCount;
    }
  | {
      readonly kind: typeof RestChangeKind.SlotExpended;
      readonly key: SlotCountKey;
    };

/** What Rest does to each condition the content says it eases, by id: remove it, or lower it by 1. None without content. */
export type RecoveryConditions = ReadonlyMap<ContentId, ConditionEffect>;

/** What a restoring action reads besides the play state. */
export interface RestLimits {
  readonly hitPoints: HitPoints;
  /** What Rest heals: the Constitution modifier, at least 1, times level. */
  readonly healing: HitPoints;
  readonly recovery: RecoveryConditions;
  readonly resources: ResourceMaxima;
  readonly counted: CountedMaxima;
  /** The staves and spell ranks daily preparations reads to prepare a staff. */
  readonly staff: StaffLimits;
}

/** The part of a play state the restoring actions read and write. */
export type RestPlay = DeathTrack & {
  readonly hp: { readonly damage: HitPoints; readonly temp: HitPoints };
  readonly resources: ResourcesSpent;
  readonly conditions: readonly ActiveCondition[];
};

/** The play state an action leaves, and the changes it made, which are none when there was nothing to restore. */
export interface RestOutcome<Play extends RestPlay> {
  readonly play: Play;
  readonly changes: readonly RestChange[];
}

/** Whether `command` is one of the restoring actions. */
export function isRestCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, RestCommand> {
  return Object.values<unknown>(RestCommandField).includes(command.field);
}
