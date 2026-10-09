import { InlineKind } from '@pioneer/rules/sdk';
import type { CheckNode, DamageNode, DurationNode, TemplateNode } from '@pioneer/rules/sdk';

import type { RichTextLinks } from '../rich-text-links';
import { RichTextMessage } from '../rich-text-messages';

/** Inline nodes that read as a value: a check, damage, an area or a duration. */
export type ValueNode = CheckNode | DamageNode | TemplateNode | DurationNode;

/** Message parameters; selects take `yes`/`no` and `none`, since a message can't test for a missing value. */
type ValueParams = Readonly<Record<string, string | number>>;

/** The message a value node reads as, and its parameters. */
export interface ValueText {
  readonly key: string;
  readonly params: ValueParams;
}

const YES = 'yes';
const NO = 'no';
const NONE = 'none';

function checkText(node: CheckNode, links: RichTextLinks): ValueText {
  return {
    key: RichTextMessage.Check,
    params: {
      statistic: links.statisticName(node.statistic) ?? node.statistic,
      dc: node.dc ?? NONE,
      hasDc: node.dc === undefined ? NO : YES,
      basic: node.basic === true ? YES : NO,
    },
  };
}

/** What a value node says, in the reader's language: "DC 20 Athletics", "2d6 fire", "20-foot burst", "1 minute". */
export function valueText(node: ValueNode, links: RichTextLinks): ValueText {
  if (node.type === InlineKind.Check) {
    return checkText(node, links);
  }
  if (node.type === InlineKind.Damage) {
    return { key: RichTextMessage.Damage, params: { formula: node.formula, damageType: node.damageType ?? NONE } };
  }
  if (node.type === InlineKind.Template) {
    return { key: RichTextMessage.Template, params: { size: node.size, shape: node.shape } };
  }
  return { key: RichTextMessage.Duration, params: { count: node.count, unit: node.unit } };
}
