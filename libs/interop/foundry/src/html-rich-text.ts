import { BlockKind, InlineKind, RichText, RichTextHeadingLevel, TextMark } from '@pioneer/rules/sdk';
import type { BlockNode, InlineContent } from '@pioneer/rules/sdk';
import { isTag, isText } from 'domhandler';
import type { ChildNode, Element } from 'domhandler';
import { parseDocument } from 'htmlparser2';

import { actionGlyph } from './action-glyph';
import { attachCheckOutcomes } from './check-outcomes';
import { NO_LINKS } from './enricher-context';
import type { FoundryLinks } from './enricher-context';
import { tableOf } from './html-table';
import type { TableContext } from './html-table';
import { joined, normalised, runOfBlock } from './rich-text-run';
import type { Marks, RunNode } from './rich-text-run';
import { enrichedRun } from './translate-enricher';

/**
 * Foundry's HTML descriptions as Pioneer rich text (content-model.md, "Foundry import"). The converter knows the
 * block, list, table and mark elements Foundry writes; any other element, and every attribute, is reported by name,
 * and the text inside it is kept. Enrichers (`@UUID[...]`, `@Check[...]`) become inline nodes (`enrichedRun`) and
 * action glyph spans `ActionCost` nodes.
 */

export interface RichTextTranslation {
  readonly richText: RichText;
  /** Markup the converter does not map, once each: an element (`span`) or an attribute (`table[class]`). */
  readonly unknownMarkup: readonly string[];
  /** Enrichers, or parts of them, that stay text or are dropped, once each (`@UUID[spell-effects]`, `@Check[traits]`). */
  readonly untranslatedEnrichers: readonly string[];
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

/** Parts of a list or table, read where they belong; met anywhere else, each is a block. */
const STRUCTURE: ReadonlySet<string> = new Set(['li', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption']);
const LIST_ITEM = 'li';
const ORDERED_LIST = 'ol';
const LINE_BREAK = 'br';

/**
 * How deep the converter follows nested elements. Rich text nests far less (`RICH_TEXT_DEPTH_MAX`); past this, the
 * rest of the text is kept flat and `OVERSIZED_MARKUP` reported, so deep markup cannot exhaust the stack.
 */
const ELEMENT_DEPTH_MAX = 64;

/** Elements whose content is not text a reader sees: reported, and dropped with everything in them. */
const DROPPED: ReadonlySet<string> = new Set(['script', 'style', 'template', 'noscript', 'iframe', 'object', 'svg']);

/** The marks around the current node, how deep it is, the markup and enrichers reported so far, and link targets. */
interface Context {
  readonly marks: Marks;
  readonly depth: number;
  readonly unknown: Set<string>;
  readonly enrichers: Set<string>;
  readonly links: FoundryLinks;
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
  return { ...context, marks };
}

function deeper(context: Context): Context {
  return { ...context, depth: context.depth + 1 };
}

/** The text under an element, walked without recursion; dropped elements add nothing. */
function flatText(root: Element): string {
  const parts: string[] = [];
  const stack: ChildNode[] = [root];
  let node = stack.pop();
  while (node !== undefined) {
    if (isText(node)) {
      parts.push(node.data);
    } else if (isTag(node) && !DROPPED.has(node.name)) {
      stack.push(...node.children.toReversed());
    }
    node = stack.pop();
  }
  return parts.join('');
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
    blocks: (nodes: readonly ChildNode[]): BlockNode[] => blocksOf(nodes, context),
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

/**
 * The blocks of a block element, or `undefined` when the element is not one. A list item or table part out of place
 * is a block of its own, so its words don't run into the next one's.
 */
function blockElement(element: Element, context: Context): BlockNode[] | undefined {
  const level = HEADING_LEVELS.get(element.name);
  if (level !== undefined) {
    return headingOf(element, level, context);
  }
  if (STRUCTURE.has(element.name)) {
    return blocksOf(element.children, context);
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
  if (mark === undefined) {
    context.unknown.add(element.name);
  }
  const inner = withMark(context, mark);
  for (const child of element.children) {
    visit(child, sink, inner);
  }
}

/** Whether the element is left out of the walk: dropped with its content, or kept as flat text past the depth limit. */
function skipped(element: Element, sink: Sink, context: Context): boolean {
  if (DROPPED.has(element.name)) {
    context.unknown.add(element.name);
    return true;
  }
  if (context.depth < ELEMENT_DEPTH_MAX) {
    return false;
  }
  context.unknown.add(OVERSIZED_MARKUP);
  sink.run.push({ type: InlineKind.Text, text: flatText(element), marks: context.marks });
  return true;
}

/** Whether the element is an action glyph span, added to the run as its cost. */
function visitedGlyph(element: Element, sink: Sink): boolean {
  const cost = actionGlyph(element);
  if (cost !== undefined) {
    sink.run.push({ type: InlineKind.ActionCost, cost });
  }
  return cost !== undefined;
}

function visitElement(element: Element, sink: Sink, context: Context): void {
  if (visitedGlyph(element, sink)) {
    return;
  }
  reportAttributes(element, context);
  if (skipped(element, sink, context)) {
    return;
  }
  const blocks = blockElement(element, deeper(context));
  if (blocks === undefined) {
    visitInline(element, sink, deeper(context));
    return;
  }
  flush(sink);
  sink.blocks.push(...blocks);
}

function visit(node: ChildNode, sink: Sink, context: Context): void {
  if (isText(node)) {
    const report = (problem: string): void => {
      context.enrichers.add(problem);
    };
    sink.run.push(...enrichedRun(node.data, { links: context.links, marks: context.marks, report }));
  } else if (isTag(node)) {
    visitElement(node, sink, context);
  }
}

/** Each top-level block as a plain paragraph, its parts on separate lines: what is left when the structure is too big. */
function flattened(blocks: readonly BlockNode[]): BlockNode[] {
  return blocks
    .map((block) => normalised(runOfBlock(block)))
    .filter((content) => content.length > 0)
    .map((content) => ({ type: BlockKind.Paragraph, content }));
}

/**
 * A Foundry description as rich text, with the markup and enrichers it could not map. Links resolve against
 * `links`; without them every link stays text. The result always parses as `RichText`: a description past its size
 * or nesting bounds is flattened to paragraphs, or left empty if that is still too big, and reported as
 * `OVERSIZED_MARKUP`.
 */
export function htmlToRichText(html: string, links: FoundryLinks = NO_LINKS): RichTextTranslation {
  const context: Context = { marks: [], depth: 0, unknown: new Set(), enrichers: new Set(), links };
  const blocks = attachCheckOutcomes(blocksOf(parseDocument(html).children, context));
  const richText = RichText.safeParse(blocks);
  const reported = { untranslatedEnrichers: [...context.enrichers] };
  if (richText.success) {
    return { richText: richText.data, unknownMarkup: [...context.unknown], ...reported };
  }
  context.unknown.add(OVERSIZED_MARKUP);
  const flat = RichText.safeParse(flattened(blocks));
  return { richText: flat.success ? flat.data : [], unknownMarkup: [...context.unknown], ...reported };
}
