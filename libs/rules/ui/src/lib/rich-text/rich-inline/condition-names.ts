import {
  ContentId,
  contentId,
  ContentKind,
  entrySlug,
  InlineKind,
  InlineLabel,
  PackId,
  RichTextString,
  Slug,
} from '@pioneer/rules/sdk';
import type { InlineContent } from '@pioneer/rules/sdk';

const CORE_PACK = PackId.parse('player-core');

/**
 * A valued condition's name with the value that follows it ("frightened 2"; a bare "drained" is the word, not the
 * condition), or the name of a condition unlikely to mean anything else in rules text. One group, so a split keeps the
 * mentions.
 */
const MENTION =
  /\b(?<mention>(?:clumsy|doomed|drained|dying|enfeebled|frightened|sickened|slowed|stunned|stupefied|wounded)\s\d{1,2}|blinded|confused|dazzled|deafened|encumbered|fascinated|fatigued|grabbed|immobilized|paralyzed|petrified|quickened|restrained|unconscious)\b/giu;

/** The id of the core rules' condition a mention names: its first word, lowercased ("Frightened 2" is frightened). */
function conditionOf(mention: string): ContentId {
  const [name = ''] = mention.toLowerCase().split(' ');
  const slug = entrySlug(ContentKind.Condition, Slug.parse(name));
  return ContentId.parse(contentId(CORE_PACK, slug));
}

/**
 * `content` with the names of conditions in plain text turned into references to them ("frightened 2", "blinded"), so
 * they open the condition's card like a link the content made. A run with marks, and anything that already is a
 * reference, stays as it is. A name is linked only when `linkable` says the page can show the condition.
 */
export function linkConditionNames(content: InlineContent, linkable: (id: ContentId) => boolean): InlineContent {
  return content.flatMap((node): InlineContent => {
    if (node.type !== 'text' || node.marks !== undefined) {
      return [node];
    }
    // A split on one group keeps the mentions at the odd positions, between the text around them.
    const pieces = node.text.split(MENTION);
    const linked = pieces.map((piece, index) => index % 2 === 1 && linkable(conditionOf(piece)));
    if (!linked.includes(true)) {
      return [node];
    }
    return pieces.flatMap((piece, index): InlineContent => {
      if (linked[index] === true) {
        return [{ type: InlineKind.Ref, id: conditionOf(piece), label: InlineLabel.parse(piece) }];
      }
      return piece === '' ? [] : [{ type: InlineKind.Text, text: RichTextString.parse(piece) }];
    });
  });
}
