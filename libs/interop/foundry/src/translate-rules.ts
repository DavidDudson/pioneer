import { ContentKind, RuleElement, RuleElementKey } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { NO_REFERENCES, resolveUuid } from './entry-references';
import type { EntryReferences } from './entry-references';
import { kebab } from './foundry-flags';
import { fromFoundryFormula } from './foundry-formula';
import { isLangKey, isUnresolved, localize } from './foundry-lang';
import type { LangValues, UnresolvedKey, UnresolvedText } from './foundry-lang';
import type { FoundryLang } from './foundry-release';
import { isUnread, withChoiceSet, withTagQuery } from './translate-choice-sets';
import { withDefenceTypes } from './translate-defences';
import { withFavoredWeaponRank } from './translate-favored-weapon';
import { withFontChoice } from './translate-font-choice';
import { withItemScope } from './translate-item-alterations';
import { withLanguageSlots } from './translate-language-slots';
import { withModifierSelectors, withNamespacedOptions } from './translate-modifiers';
import { withRollOption } from './translate-roll-options';
import { withSense } from './translate-senses';
import type { FoundrySenses } from './translate-senses';
import { withSkillRaise } from './translate-skill-raises';
import { withStrikeDamage } from './translate-strike';
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

const GRANT_FIELDS_REPLACED: ReadonlySet<string> = new Set(['uuid', 'inMemoryOnly', 'onDeleteActions']);

/**
 * Foundry's delete actions, as a derived grant reads them. The granter side decides: `cascade` (the grant goes with
 * its granter) is a derived grant, `detach` (the grantee stays, as Prone after Unconscious) is not, and Foundry
 * defaults to `detach` for a physical item and `cascade` for anything else. The grantee side (`restrict`, `detach`:
 * whether the grantee can be removed alone) has no Pioneer meaning, as a granted entry is never removed alone;
 * `cascade` there (removing the grantee removes its granter) is kept for the backlog.
 */
const FoundryDeleteActions = z
  .strictObject({
    granter: z.enum(['cascade', 'detach', 'restrict']).optional(),
    grantee: z.enum(['cascade', 'detach', 'restrict']).optional(),
  })
  .optional();

/** The kinds Foundry files as physical items, whose grants detach from their granter unless they say otherwise. */
const PHYSICAL_KINDS: ReadonlySet<ContentKind> = new Set([
  ContentKind.Armor,
  ContentKind.Consumable,
  ContentKind.Equipment,
  ContentKind.Shield,
  ContentKind.Treasure,
  ContentKind.Weapon,
]);

/** Whether a grant of `item` with Foundry's `onDeleteActions` goes with its granter and only with it. */
function isDerivedGrant(deletes: unknown, item: ContentId | undefined, references: EntryReferences): boolean {
  const actions = FoundryDeleteActions.safeParse(deletes);
  if (!actions.success) {
    return false;
  }
  const kind = item === undefined ? undefined : references.kinds.get(item);
  const physical = kind !== undefined && PHYSICAL_KINDS.has(kind);
  const granter = actions.data?.granter ?? (physical ? 'detach' : 'cascade');
  return granter === 'cascade' && actions.data?.grantee !== 'cascade';
}

/**
 * A `GrantItem` naming its item by compendium UUID, granting the entry that UUID resolves to instead. Foundry's
 * `inMemoryOnly` (granted without being saved to the actor, as conditions grant theirs) has no Pioneer meaning: a
 * grant is always derived. An unresolved UUID, or delete actions a derived grant lacks, leave it as it is, so the
 * element fails and is kept for the backlog.
 */
function withGrantedId(raw: unknown, references: EntryReferences): unknown {
  if (keyOf(raw) !== RuleElementKey.GrantItem || typeof raw !== 'object' || raw === null || !('uuid' in raw)) {
    return raw;
  }
  const deletes = 'onDeleteActions' in raw ? raw.onDeleteActions : undefined;
  const item = typeof raw.uuid === 'string' ? resolveUuid(references, raw.uuid) : undefined;
  if (item === undefined || !isDerivedGrant(deletes, item, references)) {
    return raw;
  }
  const rest = Object.entries(raw).filter(([field]) => !GRANT_FIELDS_REPLACED.has(field));
  return { ...Object.fromEntries(rest), item };
}

/**
 * Foundry's alteration of a granted condition's value, `{ mode: override, property: badge-value, value: 2 }`, alone
 * on its grant. A value read from a pick or the item (`{item|...}`, `@item...`) is a string, which this does not take.
 */
const FoundryBadgeValue = z.tuple([
  z.strictObject({ mode: z.literal('override'), property: z.literal('badge-value'), value: z.number() }),
]);

/**
 * A `GrantItem` whose only alteration sets the granted condition's value, as the grant's `value`. Any other
 * alterations leave it as it is, so the element fails and is kept for the backlog.
 */
function withGrantValue(raw: unknown): unknown {
  if (keyOf(raw) !== RuleElementKey.GrantItem || typeof raw !== 'object' || raw === null || !('alterations' in raw)) {
    return raw;
  }
  const alterations = FoundryBadgeValue.safeParse(raw.alterations);
  if (!alterations.success) {
    return raw;
  }
  const { alterations: _replaced, ...rest } = raw;
  return { ...rest, value: alterations.data[0].value };
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

/** Foundry's grant of a `ChoiceSet`'s pick on the same item: `{item|flags.system.rulesSelections.doctrine}`. */
const SELECTION_UUID = /^\{item\|flags\.system\.rulesSelections\.(?<flag>[A-Za-z0-9]+)\}$/u;

/**
 * A `GrantItem` of a `ChoiceSet`'s pick, as Foundry names it by the pick's flag, granting `{ choice }` under the flag
 * `withTagQuery` gives it, when a `ChoiceSet` of the entry that translated declares that flag; without one the grant
 * would read a pick nothing asks for, so it is left for the backlog with its `ChoiceSet`. Delete actions are read as for
 * a granted id; a pick is no physical item.
 */
function withChoiceGrant(raw: unknown, references: EntryReferences, declared: ReadonlySet<string>): unknown {
  if (keyOf(raw) !== RuleElementKey.GrantItem || typeof raw !== 'object' || raw === null || !('uuid' in raw)) {
    return raw;
  }
  const flag = typeof raw.uuid === 'string' ? SELECTION_UUID.exec(raw.uuid)?.groups?.['flag'] : undefined;
  const deletes = 'onDeleteActions' in raw ? raw.onDeleteActions : undefined;
  const choice = flag === undefined ? undefined : kebab(flag);
  if (choice === undefined || !declared.has(choice) || !isDerivedGrant(deletes, undefined, references)) {
    return raw;
  }
  const rest = Object.entries(raw).filter(([field]) => !GRANT_FIELDS_REPLACED.has(field));
  return { ...Object.fromEntries(rest), item: { choice } };
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

function shapeRule(raw: unknown, context: RuleContext, unresolved: UnresolvedKey[]): Shaped {
  const references = context.references ?? NO_REFERENCES;
  const text = withDisplayLabel(localized(raw, context, unresolved));
  const rolled = withRollOption(withNamespacedOptions(text), context.values.item);
  const options = withDefenceTypes(withItemScope(rolled));
  const granted = withGrantedId(withPioneerFormula(options), references);
  const struck = withStrikeDamage(granted);
  const modifier = withModifierSelectors(struck);
  const queried = withLanguageSlots(withTagQuery(withGrantValue(modifier)));
  const font = withSkillRaise(withFavoredWeaponRank(withFontChoice(queried)));
  const senses = { references, senses: context.senses };
  return { raw, plain: withSense(font, senses), chosen: withSense(withChoiceSet(font, context.values.item), senses) };
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
  const shaped = kept.map((raw) => shapeRule(raw, context, unresolved));
  const declared = declaredFlags(shaped);
  const parsed = shaped.map(({ chosen }) => RuleElement.safeParse(withChoiceGrant(chosen, references, declared)));
  return {
    ...settle(entry, shaped, parsed),
    dropped,
    unresolvedText: unresolved.map(({ key, reason }) => ({ entry, key, reason })),
  };
}
