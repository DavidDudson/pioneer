import type { Trait } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

/** Where the familiar is: what the card says in words, and which rows it shows. */
export const FamiliarCardStatus = {
  Active: 'active',
  Absent: 'absent',
  Absorbed: 'absorbed',
  Dead: 'dead',
} as const;

export type FamiliarCardStatus = ValueOf<typeof FamiliarCardStatus>;

/** The ways a familiar moves; each has its own word. */
export const FamiliarCardMovement = {
  Land: 'land',
  Burrow: 'burrow',
  Climb: 'climb',
  Fly: 'fly',
  Swim: 'swim',
} as const;

export type FamiliarCardMovement = ValueOf<typeof FamiliarCardMovement>;

/** The senses a familiar can have; each has its own word. */
export const FamiliarCardSense = {
  LowLightVision: 'low-light-vision',
  Darkvision: 'darkvision',
  Echolocation: 'echolocation',
  Scent: 'scent',
} as const;

export type FamiliarCardSense = ValueOf<typeof FamiliarCardSense>;

/** The Hit Points the card shows: what is left, the most there are, and any temporary ones. */
export interface FamiliarCardHitPoints {
  readonly current: number;
  readonly max: number;
  readonly temp: number;
}

/** A skill the familiar is named for, with its modifier. */
export interface FamiliarCardSkill {
  readonly name: string;
  readonly modifier: number;
}

/** One way the familiar moves, in feet. */
export interface FamiliarCardSpeed {
  readonly movement: FamiliarCardMovement;
  readonly feet: number;
}

/** The three saves. */
export interface FamiliarCardSaves {
  readonly fortitude: number;
  readonly reflex: number;
  readonly will: number;
}

/** What the card shows of a familiar, as plain values the sheet derives. */
export interface FamiliarCardView {
  readonly name: string;
  /** What it is, as the character named it: "Raven", "Cat". */
  readonly species: string;
  readonly status: FamiliarCardStatus;
  readonly hitPoints: FamiliarCardHitPoints;
  readonly armorClass: number;
  readonly saves: FamiliarCardSaves;
  readonly perception: number;
  readonly skills: ReadonlyArray<FamiliarCardSkill>;
  readonly speeds: ReadonlyArray<FamiliarCardSpeed>;
  readonly senses: ReadonlyArray<FamiliarCardSense>;
  readonly traits: ReadonlyArray<Trait>;
}
