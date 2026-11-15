import type { ValueOf } from '@pioneer/shared/kernel';

import type { IconGlyph } from './icon-glyph';

/** The pieces a PF2e action cost is drawn from. */
export const ActionMark = {
  Action: 'action',
  Free: 'free',
  Reaction: 'reaction',
  To: 'to',
} as const;

export type ActionMark = ValueOf<typeof ActionMark>;

/** The SVG attribute that holds a path's outline. */
const PATH_DATA = 'd';
const DIAMOND = 'M12 3 21 12 12 21 3 12Z';

/**
 * Pioneer's own drawings of the action symbols, in the symbols players know from the books: a solid diamond for an
 * action, an open one for a free action, a turning arrow for a reaction, and a short rule for "to" between the ends
 * of a range. Drawn on a 24 unit grid; solid symbols are filled, the rest are 1px lines like every other icon.
 */
export const ACTION_MARKS: Readonly<Record<ActionMark, IconGlyph>> = {
  [ActionMark.Action]: [['path', { [PATH_DATA]: DIAMOND, fill: 'currentColor', stroke: 'none' }]],
  [ActionMark.Free]: [['path', { [PATH_DATA]: DIAMOND }]],
  [ActionMark.Reaction]: [
    ['path', { [PATH_DATA]: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3' }],
    ['path', { [PATH_DATA]: 'M4.5 3.5v4h4' }],
  ],
  [ActionMark.To]: [['path', { [PATH_DATA]: 'M7 12h10' }]],
};
