import type { ValueOf } from '@pioneer/shared/kernel';

import type { IconGlyph } from './icon-glyph';

/** The pieces a PF2e action cost is drawn from. */
export const ActionShape = {
  Action: 'action',
  Free: 'free',
  Reaction: 'reaction',
  To: 'to',
} as const;
export type ActionShape = ValueOf<typeof ActionShape>;

/** The SVG attribute that holds a path's shape. */
const PATH_DATA = 'd';
const DIAMOND = 'M12 3 21 12 12 21 3 12Z';

/**
 * Pioneer's own drawings of the action symbols, in the shapes players know from the books: a solid diamond for an
 * action, an open one for a free action, a turning arrow for a reaction, and a short rule for "to" between the ends
 * of a range. Drawn on a 24 unit grid; solid shapes are filled, the rest are 1px lines like every other icon.
 */
export const ACTION_SHAPES: Readonly<Record<ActionShape, IconGlyph>> = {
  [ActionShape.Action]: [['path', { [PATH_DATA]: DIAMOND, fill: 'currentColor', stroke: 'none' }]],
  [ActionShape.Free]: [['path', { [PATH_DATA]: DIAMOND }]],
  [ActionShape.Reaction]: [
    ['path', { [PATH_DATA]: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3' }],
    ['path', { [PATH_DATA]: 'M4.5 3.5v4h4' }],
  ],
  [ActionShape.To]: [['path', { [PATH_DATA]: 'M7 12h10' }]],
};
