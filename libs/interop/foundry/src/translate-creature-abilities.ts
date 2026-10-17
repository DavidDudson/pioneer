import { RichText, Trait } from '@pioneer/rules/sdk';
import type { RuleElement } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { itemSystem, Traits } from './creature-embedded';
import type { Embedded } from './creature-embedded';
import { FoundryDocument } from './foundry-document';
import { expandLocalize } from './foundry-lang';
import { htmlToRichText } from './html-rich-text';
import { KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';
import { actionData } from './translate-action';
import { translateRules } from './translate-rules';

/** A creature's `action` items as abilities: passive traits, actions, reactions and free actions. */

const HTML_MAX = 1_000_000;
const REACTION = 'reaction';

const Description = z.looseObject({ value: z.string().max(HTML_MAX).default('') });
const FoundryAbility = z.looseObject({
  description: Description.default({ value: '' }),
  traits: Traits.default({ value: [] }),
});

/** What the action translator reads of an ability: its cost and the usage paragraphs of its description. */
const Usage = z.looseObject({
  cost: z.string().optional(),
  trigger: RichText.optional(),
  requirementsText: RichText.optional(),
  frequency: z.looseObject({}).optional(),
});
type Usage = z.infer<typeof Usage>;

/**
 * The ability's usage, read from its description after `@Localize` expands, since Foundry keeps a reaction's trigger
 * in a glossary entry. Reported when the item is not shaped as an action.
 */
function usageOf(item: Embedded, html: string, input: KindInput): Usage | undefined {
  const system = { ...item.system, description: { value: html } };
  const { _id: id } = item;
  const parsed = FoundryDocument.safeParse({ _id: id, name: item.name, type: 'action', system });
  return parsed.success ? Usage.safeParse(actionData({ ...input, document: parsed.data })).data : undefined;
}

function rulesOf(item: Embedded, input: KindInput): readonly RuleElement[] {
  const raws = Array.isArray(item.system['rules']) ? item.system['rules'] : [];
  const translation = translateRules(input.envelope.id, raws, {
    lang: input.lang ?? {},
    values: { item: item.name },
    references: input.references,
    ...(input.senses === undefined ? {} : { senses: input.senses }),
  });
  for (const { key, raw } of translation.untranslated) {
    report(input.log, { reason: KindDataGapReason.UnmappedField, field: `abilities.rules.${key}`, raw });
  }
  return translation.rules;
}

/** The cost an ability keeps: a reaction with no trigger would not validate, so it is reported and kept as text. */
function costOf(usage: Usage | undefined, item: Embedded, input: KindInput): string | undefined {
  if (usage?.cost === REACTION && usage.trigger === undefined) {
    report(input.log, { reason: KindDataGapReason.UnmappedField, field: 'abilities.trigger', raw: item.name });
    return undefined;
  }
  return usage?.cost;
}

function abilityOf(item: Embedded, input: KindInput): object | undefined {
  const system = itemSystem(FoundryAbility, item, input);
  if (system === undefined) {
    return undefined;
  }
  const html = expandLocalize(system.description.value, input.lang ?? {}, { item: item.name });
  const usage = usageOf(item, html.text, input);
  const cost = costOf(usage, item, input);
  return {
    name: item.name,
    ...(cost === undefined ? {} : { cost }),
    ...(usage?.trigger === undefined ? {} : { trigger: usage.trigger }),
    ...(usage?.requirementsText === undefined ? {} : { requirements: usage.requirementsText }),
    ...(usage?.frequency === undefined ? {} : { frequency: usage.frequency }),
    traits: system.traits.value.filter((trait) => Trait.safeParse(trait).success),
    description: htmlToRichText(html.text, input.links).richText,
    rules: rulesOf(item, input),
  };
}

/** The creature's abilities, one per `action` item. */
export function abilitiesOf(items: readonly Embedded[], input: KindInput): readonly object[] {
  return items.filter((item) => item.type === 'action').flatMap((item) => abilityOf(item, input) ?? []);
}
