let count = 0;

/** A document-unique id for linking parts (label → control, control → message). */
export function uniqueId(prefix: string): string {
  count += 1;
  return `${prefix}-${count}`;
}
