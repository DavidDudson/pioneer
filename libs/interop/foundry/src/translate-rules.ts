import { RuleElement, RuleElementKey } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import type * as z from 'zod';

import { NO_REFERENCES } from './entry-references';
import type { EntryReferences } from './entry-references';
import { fromFoundryFormula } from './foundry-formula';
import { isLangKey, isUnresolved, localize } from './foundry-lang';
import type { LangValues, UnresolvedKey, UnresolvedText } from './foundry-lang';
import type { FoundryLang } from './foundry-release';
import { withActiveEffect } from './translate-active-effects';
import { withCreatureRule, withFormSpeedBrackets } from './translate-battle-form';
import type { FoundrySenses } from './translate-battle-form';
import { isUnread, withChoiceObjects, withChoiceSet, withChoiceValues, withTagQuery } from './translate-choice-sets';
import { withDefenceTypes } from './translate-defences';
import { withFavoredWeaponRank } from './translate-favored-weapon';
import { withFontChoice } from './translate-font-choice';
import { withGrantedItems } from './translate-granted-items';
import { withAura, withChoiceGrant, withGrantedId, withGrantFields, withGrantValue } from './translate-grants';
import { withItemScope } from './translate-item-alterations';
import { withLanguageSlots } from './translate-language-slots';
import {
  withBaseSpeed,
  withCreatureSize,
  withDiceFormula,
  withModifierSelectors,
  withNamespacedOptions,
} from './translate-modifiers';
import { withNoteText } from './translate-notes';
import { withRollOption } from './translate-roll-options';
import { withSkillPathChoices } from './translate-skill-raises';
// oxlint-disable-next-line import/max-dependencies -- where every Foundry rule element is shaped, one translator module for each kind
import { withoutStrikeExtras, withStrikeDamage, withStrikeScope } from './translate-strike';
import { withoutDropped } from './translate-token-rules';
import type { DroppedRule } from './translate-token-rules';

/**
 * An entry's Foundry rule elements, each run through `RuleElement`. One that fails is kept aside with its raw JSON
 * for the backlog, and the entry is imported without it. Lang keys in an element are resolved to English first.
 */

/** A Foundry rule element `RuleElement` rejects: the backlog item Epic 2.6 (#21) works through. */
export interface UntranslatedRule {
  readonly entry: ContentId;
  /** The element's `key`, or empty when it has none. */
  readonly key: string;
  /** The element as Foundry wrote it. */
  readonly raw: unknown;
}

function keyOf(raw: unknown): string {
  if (typeof raw !== 'object' || raw === null || !('key' in raw)) {
    return '';
  }
  return typeof raw.key === 'string' ? raw.key : '';
}

/** `raw` with a string `value` in Pioneer's reference spelling, the only formula field the envelope's elements share. */
function withPioneerFormula(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('value' in raw) || typeof raw.value !== 'string') {
    return raw;
  }
  return { ...raw, value: fromFoundryFormula(raw.value) };
}

/** A field or array item left out because its lang key did not resolve. */
const OMITTED = Symbol('omitted');

/** A string's text when it is a lang key, else the string; `OMITTED`, reported, when the key does not resolve. */
function localizedString(value: string, context: RuleContext, unresolved: UnresolvedKey[]): string | typeof OMITTED {
  if (!isLangKey(value)) {
    return value;
  }
  const text = localize(context.lang, value, context.values);
  if (isUnresolved(text)) {
    unresolved.push(text);
    return OMITTED;
  }
  return text.text;
}

/** `value` with each lang key in it resolved; one that does not resolve is reported and its field or item left out. */
function localized(value: unknown, context: RuleContext, unresolved: UnresolvedKey[]): unknown {
  if (typeof value === 'string') {
    return localizedString(value, context, unresolved);
  }
  if (Array.isArray(value)) {
    return value.map((item) => localized(item, context, unresolved)).filter((item) => item !== OMITTED);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .map(([field, item]) => [field, localized(item, context, unresolved)])
      .filter(([, item]) => item !== OMITTED),
  );
}

/**
 * `raw` with Foundry's base `label`, which names what the element produces on the sheet (a modifier's breakdown line,
 * a toggle), as Pioneer's `display.label`.
 */
function withDisplayLabel(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('label' in raw) || typeof raw.label !== 'string') {
    return raw;
  }
  const { label, ...rest } = raw;
  const display = 'display' in raw && typeof raw.display === 'object' ? raw.display : {};
  return { ...rest, display: { ...display, label } };
}

/** How an entry's elements resolve: references to other entries, and lang keys with the entry's own name. */
export interface RuleContext {
  readonly references?: EntryReferences;
  readonly lang: FoundryLang;
  readonly values: LangValues;
  /** What each Foundry sense fixes, for its `Sense` elements; without it they keep the acuity and range they give. */
  readonly senses?: FoundrySenses;
}

export interface RuleTranslation {
  readonly rules: readonly RuleElement[];
  readonly untranslated: readonly UntranslatedRule[];
  /** Elements dropped on purpose, as they only change a Foundry token. */
  readonly dropped: readonly DroppedRule[];
  /** Lang keys in the elements, translated or not, that had no English text. */
  readonly unresolvedText: readonly UnresolvedText[];
}

/** A raw rule element shaped two ways: as it was before `withChoiceSet`, and with it. */
interface Shaped {
  readonly raw: unknown;
  readonly plain: unknown;
  readonly chosen: unknown;
}

/** `raw` with its grant fields read, the content id a grant names, and the aura effects. */
function withGrants(raw: unknown, references: EntryReferences): unknown {
  const fields = withGrantFields(raw);
  const granted = withGrantedId(fields, references);
  return withAura(granted, references);
}

function shapeRule(raw: unknown, context: RuleContext, unresolved: UnresolvedKey[]): Shaped {
  const references = context.references ?? NO_REFERENCES;
  const text = withDisplayLabel(localized(raw, context, unresolved));
  const rolled = withRollOption(withNamespacedOptions(text), context.values.item);
  const scoped = withDiceFormula(withDefenceTypes(withItemScope(rolled)));
  const options = withNoteText(scoped, context);
  const granted = withGrants(withPioneerFormula(options), references);
  const struck = withStrikeScope(withStrikeDamage(withoutStrikeExtras(granted)));
  const modifier = withBaseSpeed(withModifierSelectors(withCreatureSize(struck)));
  const queried = withLanguageSlots(withTagQuery(withGrantValue(modifier)));
  const font = withActiveEffect(withFavoredWeaponRank(withFontChoice(queried)));
  const senses = { references, senses: context.senses };
  return {
    raw,
    plain: withCreatureRule(font, senses),
    chosen: withCreatureRule(withChoiceSet(font, context.values.item, references), senses),
  };
}

/** The flags of the `ChoiceSet`s among `shaped` that translate. */
function declaredFlags(shaped: readonly Shaped[]): ReadonlySet<string> {
  return new Set(
    shaped.flatMap(({ chosen }) => {
      const element = RuleElement.safeParse(chosen);
      return element.success && element.data.key === RuleElementKey.ChoiceSet ? [String(element.data.flag)] : [];
    }),
  );
}

type Parsed = z.ZodSafeParseResult<RuleElement>;

/** What `shaped` came to, its elements `parsed` the same way: the ones that translate, and those kept for the backlog. */
function settle(
  entry: ContentId,
  shaped: readonly Shaped[],
  parsed: readonly Parsed[],
): Pick<RuleTranslation, 'rules' | 'untranslated'> {
  const reads = (flag: string): boolean =>
    parsed.some((element) => element.success && JSON.stringify(element.data).includes(`"choice":"${flag}"`));
  const rules: RuleElement[] = [];
  const untranslated: UntranslatedRule[] = [];
  for (const [index, { raw, plain }] of shaped.entries()) {
    const element = parsed[index];
    if (element?.success === true && !isUnread(element.data, plain, reads)) {
      rules.push(element.data);
    } else {
      untranslated.push({ entry, key: keyOf(raw), raw });
    }
  }
  return { rules, untranslated };
}

export function translateRules(entry: ContentId, raws: readonly unknown[], context: RuleContext): RuleTranslation {
  const unresolved: UnresolvedKey[] = [];
  const references = context.references ?? NO_REFERENCES;
  const { kept, dropped } = withoutDropped(entry, raws);
  const granted = withChoiceObjects(withFormSpeedBrackets(withGrantedItems(kept, references)));
  const shaped = withChoiceValues(withSkillPathChoices(granted), context.values.item).map((raw) =>
    shapeRule(raw, context, unresolved),
  );
  const declared = declaredFlags(shaped);
  const parsed = shaped.map(({ chosen }) => RuleElement.safeParse(withChoiceGrant(chosen, references, declared)));
  return {
    ...settle(entry, shaped, parsed),
    dropped,
    unresolvedText: unresolved.map(({ key, reason }) => ({ entry, key, reason })),
  };
}
