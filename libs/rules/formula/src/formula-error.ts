import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { TextPosition } from './units';

/** Thrown inside the parser or evaluator to unwind to `parseFormula` or `evaluate`, which report it as a failed outcome. */
export class FormulaError extends Error {
  public override readonly name = 'FormulaError';
  public readonly descriptor: MessageDescriptor;
  public readonly position: TextPosition;

  public constructor(descriptor: MessageDescriptor, position: TextPosition) {
    super(`${descriptor.key} at ${position}`);
    this.descriptor = descriptor;
    this.position = position;
  }
}
