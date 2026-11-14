/** The ways a character moves that the sheet lists, each a row; a Step is the distance of that action, not a Speed. */
export const Movement = {
  Walk: 'walk',
  Swim: 'swim',
  Fly: 'fly',
  Climb: 'climb',
  Burrow: 'burrow',
  Step: 'step',
} as const;
export type Movement = (typeof Movement)[keyof typeof Movement];

/** Message keys the speed rows render with, spelled out so the key check sees them. */
export const SpeedsMessage = {
  /** "25 ft". */
  Feet: 'rules.speeds.feet',
  /** What a row reads when the character has no speed of that kind. */
  None: 'rules.speeds.none',
} as const;

/** The name of each movement. */
export const MOVEMENT_MESSAGES: Readonly<Record<Movement, string>> = {
  [Movement.Walk]: 'rules.speeds.walk',
  [Movement.Swim]: 'rules.speeds.swim',
  [Movement.Fly]: 'rules.speeds.fly',
  [Movement.Climb]: 'rules.speeds.climb',
  [Movement.Burrow]: 'rules.speeds.burrow',
  [Movement.Step]: 'rules.speeds.step',
};
