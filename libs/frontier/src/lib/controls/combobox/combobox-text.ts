/** The picked value of a combobox and its label, once an option for it has loaded. */
export interface Picked<TValue extends string> {
  readonly value: TValue | undefined;
  readonly label: string | undefined;
}

/** What the input's text follows: the pick, and the query shown while nothing is picked. */
export interface TextSource<TValue extends string> {
  readonly picked: Picked<TValue>;
  readonly query: string;
}

export function samePicked<TValue extends string>(left: Picked<TValue>, right: Picked<TValue>): boolean {
  return left.value === right.value && left.label === right.label;
}

export function sameTextSource<TValue extends string>(left: TextSource<TValue>, right: TextSource<TValue>): boolean {
  return samePicked(left.picked, right.picked) && left.query === right.query;
}

/**
 * The input's text: the query while nothing is picked, else the picked option's label. The label also fills in when its
 * option arrives after the value (an async source), but never over typing in an open list.
 */
export function textOf<TValue extends string>(
  { picked, query }: TextSource<TValue>,
  previous: string | undefined,
  expanded: boolean,
): string {
  // Signal forms hold "nothing picked" as '', so a form reset to '' clears the text as undefined does.
  if (picked.value === undefined || picked.value === '') {
    return query;
  }
  if (previous !== undefined && expanded) {
    return previous;
  }
  return picked.label ?? previous ?? '';
}
