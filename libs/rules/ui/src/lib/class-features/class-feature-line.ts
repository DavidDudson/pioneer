/** A class feature on the character as the sheet lists it: its name, and the class and class level it came from. */
export interface ClassFeatureLine {
  /** Unique among the lines: the feature's content id. */
  readonly key: string;
  readonly name: string;
  readonly className: string;
  readonly level: number;
}
