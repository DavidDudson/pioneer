import { ActionCost } from '@pioneer/rules/sdk';
import { isText } from 'domhandler';
import type { Element } from 'domhandler';

/** Foundry's action glyph span, `<span class="action-glyph">2</span>`, and the letters and digits it shows. */

const GLYPH_ELEMENT = 'span';
const GLYPH_CLASS = 'action-glyph';
const GLYPHS: ReadonlyMap<string, ActionCost> = new Map([
  ['1', ActionCost.One],
  ['a', ActionCost.One],
  ['2', ActionCost.Two],
  ['d', ActionCost.Two],
  ['3', ActionCost.Three],
  ['t', ActionCost.Three],
  ['f', ActionCost.Free],
  ['r', ActionCost.Reaction],
]);

/** The cost an action glyph span shows; undefined when the element is not one, or shows anything else (`1 – 3`). */
export function actionGlyph(element: Element): ActionCost | undefined {
  const isGlyph = element.name === GLYPH_ELEMENT && element.attribs['class'] === GLYPH_CLASS;
  const text = element.children.map((child) => (isText(child) ? child.data : '')).join('');
  return isGlyph ? GLYPHS.get(text.trim().toLowerCase()) : undefined;
}
