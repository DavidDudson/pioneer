import { ActionCategory } from '../actions/action-line';
import type { ActionLine } from '../actions/action-line';

function inBasic(action: ActionLine): ActionLine {
  return { ...action, category: ActionCategory.Basic };
}

/** The lines all listed under one kind, so a view shows them in one list whatever their origins. */
export function inOneKind(actions: readonly ActionLine[]): readonly ActionLine[] {
  return actions.map((action) => inBasic(action));
}
