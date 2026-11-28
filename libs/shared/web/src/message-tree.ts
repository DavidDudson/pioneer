/** A message catalog: messages, or groups of them. */
export interface MessageTree {
  readonly [key: string]: MessageTree | string;
}

export function isGroup(value: MessageTree | string): value is MessageTree {
  return value instanceof Object;
}
