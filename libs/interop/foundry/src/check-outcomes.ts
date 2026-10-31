import { BlockKind, DegreeOfSuccess, InlineKind, RichTextString, TextMark } from '@pioneer/rules/sdk';
import type { BlockNode, CheckNode, CheckOutcomes, InlineContent, InlineNode, ParagraphNode } from '@pioneer/rules/sdk';

/**
 * Foundry spells a check's results out in the paragraphs after it, each opened by the degree in bold:
 * `<p><strong>Critical Success</strong> The creature is unaffected.</p>`. This pass copies those paragraphs onto the
 * check before them as its `outcomes`, so the roll card can show the one that was rolled. The paragraphs stay in the
 * text: the description reads the same, and nothing is lost if a check is not rolled. A basic check has fixed
 * outcomes the card words itself, so it is left alone.
 */

const DEGREE_LABELS: ReadonlyMap<string, DegreeOfSuccess> = new Map([
  ['critical success', DegreeOfSuccess.CriticalSuccess],
  ['success', DegreeOfSuccess.Success],
  ['failure', DegreeOfSuccess.Failure],
  ['critical failure', DegreeOfSuccess.CriticalFailure],
]);

const LEADING_SPACE = /^\s+/u;
const TRAILING_MARKS = /[\s.:]+$/u;

/** The degree a paragraph opens with in bold, and the text after it; undefined for any other paragraph. */
function outcomeOf({ content }: ParagraphNode): readonly [DegreeOfSuccess, InlineContent] | undefined {
  const [first, ...rest] = content;
  const isLabel = first?.type === InlineKind.Text && first.marks?.includes(TextMark.Strong) === true;
  const degree = isLabel ? DEGREE_LABELS.get(first.text.replace(TRAILING_MARKS, '').toLowerCase()) : undefined;
  if (degree === undefined) {
    return undefined;
  }
  const [next, ...after] = rest;
  const trimmed = next?.type === InlineKind.Text ? next.text.replace(LEADING_SPACE, '') : undefined;
  const opened =
    next?.type === InlineKind.Text && trimmed !== undefined && trimmed !== ''
      ? [{ ...next, text: RichTextString.parse(trimmed) }, ...after]
      : after;
  const body: InlineContent = next?.type === InlineKind.Text ? opened : rest;
  return body.length === 0 ? undefined : [degree, body];
}

/** The outcome paragraphs that follow `blocks[start]`, rules between them skipped; the run ends at any other block. */
function outcomesAfter(blocks: readonly BlockNode[], start: number): CheckOutcomes {
  const outcomes: CheckOutcomes = {};
  const following = blocks.slice(start + 1).filter((block) => block.type !== BlockKind.Rule);
  for (const block of following) {
    const outcome = block.type === BlockKind.Paragraph ? outcomeOf(block) : undefined;
    if (outcome === undefined) {
      break;
    }
    const [degree, body] = outcome;
    outcomes[degree] ??= body;
  }
  return outcomes;
}

function isOutcomeless(node: InlineNode): node is CheckNode {
  return node.type === InlineKind.Check && node.basic !== true && node.outcomes === undefined;
}

/** The paragraph with `outcomes` on its last check; undefined when it has no check that can take them. */
function withOutcomes(paragraph: ParagraphNode, outcomes: CheckOutcomes): ParagraphNode | undefined {
  const index = paragraph.content.findLastIndex(isOutcomeless);
  const check = paragraph.content[index];
  if (check?.type !== InlineKind.Check) {
    return undefined;
  }
  const content = paragraph.content.map((node, at) => (at === index ? { ...check, outcomes } : node));
  return { ...paragraph, content };
}

/** `blocks` with each non-basic check given the per-degree paragraphs that follow it. */
export function attachCheckOutcomes(blocks: readonly BlockNode[]): BlockNode[] {
  return blocks.map((block, index) => {
    if (block.type !== BlockKind.Paragraph || outcomeOf(block) !== undefined) {
      return block;
    }
    const outcomes = outcomesAfter(blocks, index);
    return Object.keys(outcomes).length === 0 ? block : (withOutcomes(block, outcomes) ?? block);
  });
}
