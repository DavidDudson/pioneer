import type { InputSignalWithTransform, ModelSignal } from '@angular/core';

/** The value a component input accepts: what `setInput` takes, or what a two-way model holds. */
type InputValueOf<TMember> =
  TMember extends InputSignalWithTransform<infer _TRead, infer TAccepted>
    ? TAccepted
    : TMember extends ModelSignal<infer TValue>
      ? TValue
      : never;

/** The inputs of `TComponent` by name, each typed by what that input accepts; members that are not inputs are excluded. */
export type ComponentInputs<TComponent> = {
  readonly [TName in keyof TComponent]?: InputValueOf<TComponent[TName]>;
};
