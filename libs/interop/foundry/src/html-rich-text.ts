import { BlockKind, InlineKind, RichText, RichTextHeadingLevel, TextMark } from '@pioneer/rules/sdk';
import type { BlockNode, InlineContent } from '@pioneer/rules/sdk';
import { isTag, isText } from 'domhandler';
import type { ChildNode, Element } from 'domhandler';
import { parseDocument } from 'htmlparser2';

import { tableOf } from './html-table';
import type { TableContext } from './html-table';
import { joined, normalised, runOfBlock } from './rich-text-run';
import type { Marks, RunNode } from './rich-text-run';

/**
 * Foundry's HTML descriptions as Pioneer rich text (content-model.md, "Foundry import"). The converter knows the
 * block, list, table and mark elements Foundry writes; any other element, and every attribute, is reported by name,
 * and the text inside it is kept. Enrichers (`@UUID[...]`, `@Check[...]`) and action glyph spans stay text for the
 * enricher story (#399).
 */

export interface RichTextTranslation {
  readonly richText: RichText;
  /** Markup the converter does not map, once each: an element (`span`) or an attribute (`table[class]`). */
  readonly unknownMarkup: readonly string[];
}

/** Reported when the text would break `RichText`'s size or nesting bounds; the description is then left empty. */
export const OVERSIZED_MARKUP = 'rich-text-bounds';

/** Headings below the third level are clamped to it: a description sits under the entry's own heading. */
const HEADING_LEVELS: ReadonlyMap<string, RichTextHeadingLevel> = new Map([
  ['h1', RichTextHeadingLevel.One],
  ['h2', RichTextHeadingLevel.Two],
  ['h3', RichTextHeadingLevel.Three],
  ['h4', RichTextHeadingLevel.Three],
  ['h5', RichTextHeadingLevel.Three],
  ['h6', RichTextHeadingLevel.Three],
]);

const MARKS: ReadonlyMap<string, TextMark> = new Map([
  ['strong', TextMark.Strong],
  ['b', TextMark.Strong],
  ['em', TextMark.Emphasis],
  ['i', TextMark.Emphasis],
]);

const MARK_ORDER: readonly TextMark[] = Object.values(TextMark);

/** Parts of a list or table, read where they belong; met anywhere else, their content is kept in place. */
const STRUCTURE: ReadonlySet<string> = new Set(['li', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption']);
const LIST_ITEM = 'li';
const ORDERED_LIST = 'ol';
const LINE_BREAK = 'br';

/** The marks around the current node, and the markup reported so far. */
interface Context {
  readonly marks: Marks;
  readonly unknown: Set<string>;
}

/** Blocks finished so far and the inline run still open. */
interface Sink {
  readonly blocks: BlockNode[];
  run: RunNode[];
}

function withMark(context: Context, mark: TextMark | undefined): Context {
  if (mark === undefined) {
    return context;
  }
  const marks = MARK_ORDER.filter((each) => each === mark || context.marks.includes(each));
  return { marks, unknown: context.unknown };
}

/** Closes the open run as a paragraph, unless it holds only whitespace. */
function flush(sink: Sink): void {
  const content = normalised(sink.run);
  sink.run = [];
  if (content.length > 0) {
    sink.blocks.push({ type: BlockKind.Paragraph, content });
  }
}

function reportAttributes(element: Element, { unknown }: Context): void {
  for (const attribute of Object.keys(element.attribs)) {
    unknown.add(`${element.name}[${attribute}]`);
  }
}

function blocksOf(nodes: readonly ChildNode[], context: Context): BlockNode[] {
  const sink: Sink = { blocks: [], run: [] };
  for (const node of nodes) {
    visit(node, sink, context);
  }
  flush(sink);
  return sink.blocks;
}

/** The inline content of an element that holds no blocks (a heading, a table cell); blocks inside become lines. */
function inlineOf(nodes: readonly ChildNode[], context: Context): InlineContent {
  return normalised(joined(blocksOf(nodes, context).map((block) => runOfBlock(block))));
}

function tableContext(context: Context): TableContext {
  return {
    inline: (nodes: readonly ChildNode[]): InlineContent => inlineOf(nodes, context),
    report: (element: Element): void => {
      reportAttributes(element, context);
    },
  };
}

/** Each `li` is an item; anything else directly inside the list is an item of its own. */
function listOf(list: Element, context: Context): BlockNode[] {
  const items = list.children
    .map((child) => {
      const isItem = isTag(child) && child.name === LIST_ITEM;
      if (isItem) {
        reportAttributes(child, context);
      }
      return blocksOf(isItem ? child.children : [child], context);
    })
    .filter((item) => item.length > 0);
  const [first, ...rest] = items;
  return first === undefined
    ? []
    : [{ type: BlockKind.List, ordered: list.name === ORDERED_LIST, items: [first, ...rest] }];
}

function headingOf(element: Element, level: RichTextHeadingLevel, context: Context): BlockNode[] {
  const content = inlineOf(element.children, context);
  return content.length === 0 ? [] : [{ type: BlockKind.Heading, level, content }];
}

/** The blocks of a block element, or `undefined` when the element is not one. */
function blockElement(element: Element, context: Context): BlockNode[] | undefined {
  const level = HEADING_LEVELS.get(element.name);
  if (level !== undefined) {
    return headingOf(element, level, context);
  }
  switch (element.name) {
    case 'p': {
      return blocksOf(element.children, context);
    }
    case 'hr': {
      return [{ type: BlockKind.Rule }];
    }
    case 'ul':
    case 'ol': {
      return listOf(element, context);
    }
    case 'table': {
      return tableOf(element, tableContext(context));
    }
    default: {
      return undefined;
    }
  }
}

/** Inline elements add to the open run: a line break, a mark over their content, or their content alone. */
function visitInline(element: Element, sink: Sink, context: Context): void {
  if (element.name === LINE_BREAK) {
    sink.run.push({ type: InlineKind.LineBreak });
    return;
  }
  const mark = MARKS.get(element.name);
  if (mark === undefined && !STRUCTURE.has(element.name)) {
    context.unknown.add(element.name);
  }
  const inner = withMark(context, mark);
  for (const child of element.children) {
    visit(child, sink, inner);
  }
}

function visit(node: ChildNode, sink: Sink, context: Context): void {
  if (isText(node)) {
    sink.run.push({ type: InlineKind.Text, text: node.data, marks: context.marks });
    return;
  }
  if (!isTag(node)) {
    return;
  }
  reportAttributes(node, context);
  const blocks = blockElement(node, context);
  if (blocks === undefined) {
    visitInline(node, sink, context);
    return;
  }
  flush(sink);
  sink.blocks.push(...blocks);
}

/**
 * A Foundry description as rich text, with the markup it could not map. The result always parses as `RichText`:
 * a description past its size or nesting bounds is left empty and reported as `OVERSIZED_MARKUP`.
 */
export function htmlToRichText(html: string): RichTextTranslation {
  const unknown = new Set<string>();
  const richText = RichText.safeParse(blocksOf(parseDocument(html).children, { marks: [], unknown }));
  if (!richText.success) {
    unknown.add(OVERSIZED_MARKUP);
  }
  return { richText: richText.success ? richText.data : [], unknownMarkup: [...unknown] };
}
