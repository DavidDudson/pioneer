import { ReferencePath } from '@pioneer/rules/formula';
import {
  DamageCategory,
  DamageCategorySchema,
  DamageInstance,
  DamageTypeSchema,
  fromFoundryPath,
  InlineKind,
} from '@pioneer/rules/sdk';
import type { DamageNode, DamageType } from '@pioneer/rules/sdk';

import { inlineLabel, reportParams, textRun } from './enricher-context';
import type { EnricherContext } from './enricher-context';
import { enricherParams } from './foundry-enricher';
import type { RunNode } from './rich-text-run';

/**
 * Foundry damage rolls (`@Damage[2d6[fire],1d6[persistent,fire]]`, `[[/r (2d8+5)[healing]]]`) as `Damage` nodes.
 * Each comma-separated instance is a formula and its `[type,category]` flavour; the formula's references are
 * translated through `fromFoundryPath`. A roll that does not translate keeps its label, or its formula, as text.
 */

const ENRICHER = '@Damage';
const FORMULA = 'formula';
/** Parameters that only change how Foundry shows the roll. */
const HANDLED: ReadonlySet<string> = new Set([FORMULA, 'name', 'shortLabel', 'immutable']);

const HEALING = 'healing';
const UNTYPED = 'untyped';
const OPEN: ReadonlySet<string> = new Set(['(', '[']);
const CLOSE: ReadonlySet<string> = new Set([')', ']']);
const INSTANCE_SEPARATOR = ',';
const FLAVOUR_SEPARATOR = ',';
/** `[splash]` inside a formula, as Foundry marks a splash term (`(1[splash])[fire]`). */
const INNER_SPLASH = /\[splash\]/gu;
const HAS_INNER_SPLASH = /\[splash\]/u;
const INNER_FLAVOUR = /\[[^\]]*\]/u;
const REFERENCE = /@(?<path>[A-Za-z][\w.]*)/gu;
const DAMAGE_INSTANCES_MAX = 8;

/** One instance, read: its translated parts, or the reason it does not translate. */
interface Instance {
  readonly instance: DamageInstance;
  readonly healing: boolean;
}

/** `text` split at top-level commas, outside brackets and parentheses. */
function topLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (OPEN.has(char)) {
      depth += 1;
    } else if (CLOSE.has(char)) {
      depth -= 1;
    } else if (char === separator && depth === 0) {
      parts.push(text.slice(from, index));
      from = index + 1;
    }
  }
  return [...parts, text.slice(from)].map((part) => part.trim());
}

/** Where the bracket that closes `text` opens, or -1 when `text` does not end in one. */
function trailingOpen(text: string, [opener, closer]: readonly [string, string]): number {
  if (!text.endsWith(closer)) {
    return -1;
  }
  let depth = 0;
  for (let index = text.length - 1; index >= 0; index -= 1) {
    const char = text.charAt(index);
    depth += char === closer ? 1 : 0;
    depth -= char === opener ? 1 : 0;
    if (depth === 0) {
      return index;
    }
  }
  return -1;
}

interface Split {
  readonly body: string;
  readonly flavour: readonly string[];
}

/** `2d6[persistent,fire]` to `2d6` and `persistent`, `fire`; a bare formula has no flavour. */
function split(text: string): Split {
  const open = trailingOpen(text, ['[', ']']);
  return open === -1
    ? { body: text, flavour: [] }
    : {
        body: text.slice(0, open).trim(),
        flavour: text
          .slice(open + 1, -1)
          .split(FLAVOUR_SEPARATOR)
          .map((word) => word.trim()),
      };
}

/** `(2d8+5)` to `2d8+5`, when the parentheses enclose the whole formula. */
function unwrapped(body: string): string {
  return trailingOpen(body, ['(', ')']) === 0 ? body.slice(1, -1).trim() : body;
}

/** The formula with each Foundry reference in Pioneer's spelling, or undefined when one has no translation. */
function pioneerFormula(body: string): string | undefined {
  const untranslated: string[] = [];
  const text = unwrapped(body.replaceAll(INNER_SPLASH, '')).replaceAll(REFERENCE, (whole, path: string) => {
    const reference = ReferencePath.safeParse(path);
    const translated = reference.success ? fromFoundryPath(reference.data) : undefined;
    if (translated === undefined) {
      untranslated.push(path);
    }
    return translated === undefined ? whole : `@${translated}`;
  });
  return untranslated.length > 0 || INNER_FLAVOUR.test(text) ? undefined : text;
}

interface Flavour {
  damageType?: DamageType;
  category?: DamageCategory;
  healing: boolean;
}

/** Adds `word` to `flavour`; false when it is not a damage type, category, `healing` or `untyped`, or repeats one. */
function addWord(flavour: Flavour, word: string): boolean {
  const damageType = DamageTypeSchema.safeParse(word);
  const category = DamageCategorySchema.safeParse(word);
  if (damageType.success && flavour.damageType === undefined) {
    flavour.damageType = damageType.data;
  } else if (category.success && flavour.category === undefined) {
    flavour.category = category.data;
  } else if (word === HEALING || word === UNTYPED) {
    flavour.healing ||= word === HEALING;
  } else {
    return false;
  }
  return true;
}

/** The damage type, category and healing a flavour names; undefined, and reported, for any word it does not know. */
function flavourOf(words: readonly string[], context: EnricherContext): Flavour | undefined {
  const flavour: Flavour = { healing: false };
  for (const word of words) {
    if (!addWord(flavour, word)) {
      context.report(`${ENRICHER}[type:${word}]`);
      return undefined;
    }
  }
  return flavour;
}

function instanceOf(text: string, context: EnricherContext): Instance | undefined {
  const { body, flavour: words } = split(text);
  const flavour = flavourOf(words, context);
  if (flavour === undefined) {
    return undefined;
  }
  const category = HAS_INNER_SPLASH.test(body) ? DamageCategory.Splash : flavour.category;
  const instance = DamageInstance.safeParse({
    formula: pioneerFormula(body),
    ...(flavour.damageType === undefined ? {} : { damageType: flavour.damageType }),
    ...(category === undefined ? {} : { category }),
  });
  if (!instance.success) {
    context.report(`${ENRICHER}[${FORMULA}]`);
  }
  return instance.success ? { instance: instance.data, healing: flavour.healing } : undefined;
}

/** The roll's instances, or undefined when one fails, healing is mixed with damage, or there are too many. */
function instancesOf(formula: string, context: EnricherContext): readonly Instance[] | undefined {
  const instances = topLevel(formula, INSTANCE_SEPARATOR).map((text) => instanceOf(text, context));
  const read = instances.filter((instance) => instance !== undefined);
  if (read.length < instances.length) {
    return undefined;
  }
  const healing = read.filter((each) => each.healing).length;
  if ((healing > 0 && healing < read.length) || read.length > DAMAGE_INSTANCES_MAX) {
    context.report(`${ENRICHER}[${FORMULA}]`);
    return undefined;
  }
  return read;
}

/** A damage roll's formula as a `Damage` node, or its label (else the formula) as text when it does not translate. */
export function damageRun(formula: string, label: string | undefined, context: EnricherContext): RunNode[] {
  const instances = instancesOf(formula, context);
  const [first, ...rest] = instances ?? [];
  if (first === undefined) {
    return textRun(label ?? formula, context);
  }
  const damageLabel = inlineLabel(label, `${ENRICHER}[label]`, context);
  const node: DamageNode = {
    type: InlineKind.Damage,
    instances: [first.instance, ...rest.map(({ instance }) => instance)],
    ...(first.healing ? { healing: true } : {}),
    ...(damageLabel === undefined ? {} : { label: damageLabel }),
  };
  return [node];
}

/** `@Damage[formula|options:...]{label}`; parameters past the formula are reported, bar presentation ones. */
export function damageEnricherRun(params: string, label: string | undefined, context: EnricherContext): RunNode[] {
  const parsed = enricherParams(params, FORMULA);
  reportParams(parsed, { enricher: ENRICHER, handled: HANDLED }, context);
  return damageRun(parsed.get(FORMULA) ?? '', label, context);
}
