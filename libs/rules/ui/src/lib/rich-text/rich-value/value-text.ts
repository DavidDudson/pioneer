import type { LocaleFormat } from '@pioneer/frontier';
import { InlineKind } from '@pioneer/rules/sdk';
import type { CheckNode, DamageInstance, DamageNode, DurationNode, Selector, TemplateNode } from '@pioneer/rules/sdk';

import type { RichTextLinks } from '../rich-text-links';
import {
  AREA_SHAPE_MESSAGES,
  DAMAGE_CATEGORY_MESSAGES,
  DAMAGE_TYPE_MESSAGES,
  DURATION_MESSAGES,
  RichTextMessage,
} from '../rich-text-messages';

/** Inline nodes that read as a value: a check, damage or healing, an area or a duration. */
export type ValueNode = CheckNode | DamageNode | TemplateNode | DurationNode;

/** Message parameters; selects take `yes`/`no`, since a message can't test for a missing value. */
type MessageParams = Readonly<Record<string, string | number>>;

/** Translates a key in the active locale. */
export type Translate = (key: string, params?: MessageParams) => string;

/** What value text needs besides the node: names from the page, translation, and locale formatting. */
export interface ValueTextContext {
  readonly links: RichTextLinks;
  readonly translate: Translate;
  readonly format: LocaleFormat;
}

const YES = 'yes';
const NO = 'no';
const SAVE_PREFIX = 'save:';

function yesNo(value: boolean): string {
  return value ? YES : NO;
}

/** A statistic's name from the page, or a generic word when the page doesn't know it. */
function statisticName(selector: Selector, { links, translate }: ValueTextContext): string {
  const isSave = selector.startsWith(SAVE_PREFIX);
  return (
    links.statisticName(selector) ?? translate(isSave ? RichTextMessage.UnnamedSave : RichTextMessage.UnnamedCheck)
  );
}

function checkText(node: CheckNode, context: ValueTextContext): string {
  const { dc } = node;
  const against = typeof dc === 'object' ? dc.against : undefined;
  const named = context.links.statisticName(node.statistic) !== undefined;
  return context.translate(RichTextMessage.Check, {
    statistic: statisticName(node.statistic, context),
    dc: typeof dc === 'number' ? dc : 0,
    hasDc: yesNo(typeof dc === 'number'),
    basic: yesNo(node.basic === true),
    // "basic Reflex save"; an unnamed save already reads "saving throw".
    save: yesNo(named && node.statistic.startsWith(SAVE_PREFIX)),
    against: yesNo(against !== undefined),
    againstName:
      against === undefined
        ? ''
        : (context.links.statisticName(against) ?? context.translate(RichTextMessage.UnnamedDc)),
  });
}

function instanceText(instance: DamageInstance, { translate }: ValueTextContext): string {
  const { category, damageType } = instance;
  return translate(RichTextMessage.Damage, {
    formula: instance.formula,
    hasCategory: yesNo(category !== undefined),
    category: category === undefined ? '' : translate(DAMAGE_CATEGORY_MESSAGES[category]),
    hasType: yesNo(damageType !== undefined),
    damageType: damageType === undefined ? '' : translate(DAMAGE_TYPE_MESSAGES[damageType]),
  });
}

function damageText(node: DamageNode, context: ValueTextContext): string {
  const amount = context.format.list(node.instances.map((instance) => instanceText(instance, context)));
  return node.healing === true ? context.translate(RichTextMessage.Healing, { amount }) : amount;
}

function templateText(node: TemplateNode, { translate, format }: ValueTextContext): string {
  return translate(RichTextMessage.Template, {
    distance: format.distance(node.size),
    shape: translate(AREA_SHAPE_MESSAGES[node.shape]),
    wide: yesNo(node.width !== undefined),
    width: node.width === undefined ? '' : format.distance(node.width),
  });
}

/**
 * What a value node says, in the reader's language and units: "DC 20 Athletics", "2d6 fire and 1d6 persistent
 * fire", "20 ft burst", "1 minute".
 */
export function valueText(node: ValueNode, context: ValueTextContext): string {
  if (node.type === InlineKind.Check) {
    return checkText(node, context);
  }
  if (node.type === InlineKind.Damage) {
    return damageText(node, context);
  }
  if (node.type === InlineKind.Template) {
    return templateText(node, context);
  }
  return context.translate(DURATION_MESSAGES[node.unit], { count: node.count });
}
