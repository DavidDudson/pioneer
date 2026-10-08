import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { TextPosition } from './units';

/** Thrown inside the parser to unwind to `parseDiceExpression`, which reports it as a failed outcome. */
export class DiceSyntaxError extends Error {
  public override readonly name = 'DiceSyntaxError';
  public readonly descriptor: MessageDescriptor;
  public readonly position: TextPosition;

  public constructor(descriptor: MessageDescriptor, position: TextPosition) {
    super(`${descriptor.key} at ${position}`);
    this.descriptor = descriptor;
    this.position = position;
  }
}
