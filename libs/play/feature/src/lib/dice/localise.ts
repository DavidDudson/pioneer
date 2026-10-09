import type { LocaleFormat } from '@pioneer/frontier';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

/** Formats a descriptor's number params in the viewer's locale; text params (types, slugs) pass through. */
export function localised(format: LocaleFormat, descriptor: MessageDescriptor): MessageDescriptor {
  if (descriptor.params === undefined) {
    return descriptor;
  }
  const params = Object.fromEntries(
    Object.entries(descriptor.params).map(([name, value]) => [
      name,
      typeof value === 'number' ? format.number(value) : value,
    ]),
  );
  return message(descriptor.key, params);
}
