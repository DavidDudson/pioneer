import { TargetKind, TargetQualifier } from '@pioneer/rules/sdk';

/**
 * Foundry's spell targets, English text ("1 willing living creature or 1 undead", "you and up to 4 allies"), as
 * Pioneer's `targets` (ADR-0021). Only whole wordings of counts, qualifiers and kinds map; anything else ("the
 * triggering creature", "1 creature you know by name") is undefined, for the caller to report.
 */

/** "you and up to 4 allies": the caster, and the targets that follow. */
const INCLUDES_YOU = /^you and (?<rest>.+)$/u;

/** Alternatives: "1 creature or object", "1 creature, unattended object, or construct". */
const ALTERNATIVES = /,? or |, /u;

/** "up to 5 creatures": the count is a most. */
const UP_TO = 'up to ';

const DIGITS = /^\d+$/u;

const COUNT_WORDS: ReadonlyMap<string, number> = new Map([
  ['one', 1],
  ['a', 1],
  ['an', 1],
]);

/** What a target is, by its singular and plural words. */
const KINDS: ReadonlyMap<string, TargetKind> = new Map([
  ['creature', TargetKind.Creature],
  ['creatures', TargetKind.Creature],
  ['object', TargetKind.Object],
  ['objects', TargetKind.Object],
  ['ally', TargetKind.Ally],
  ['allies', TargetKind.Ally],
  ['corpse', TargetKind.Corpse],
  ['corpses', TargetKind.Corpse],
  ['weapon', TargetKind.Weapon],
  ['weapons', TargetKind.Weapon],
  ['item', TargetKind.Item],
  ['items', TargetKind.Item],
]);

/** Kinds Foundry writes in two words. */
const SPELL_EFFECT = /^(?<before>.*?)\s*spell effects?$/u;

const QUALIFIERS: ReadonlyMap<string, TargetQualifier> = new Map([
  ['willing', TargetQualifier.Willing],
  ['living', TargetQualifier.Living],
  ['unattended', TargetQualifier.Unattended],
  ['magic', TargetQualifier.Magical],
  ['magical', TargetQualifier.Magical],
]);

/** "1 undead": a creature with the trait, as Foundry and the rules write it. */
const UNDEAD = 'undead';

/** How many of a target, and whether "up to" that many. */
interface Count {
  readonly count: number;
  readonly upTo?: true;
}

/** One target as `targets.any` holds it. */
interface Target extends Count {
  readonly of: TargetKind;
  readonly qualifiers?: readonly TargetQualifier[];
  readonly traits?: readonly string[];
}

/** A target's words, split into what it is and the words narrowing it. */
interface Described {
  readonly of: TargetKind;
  readonly words: readonly string[];
  readonly traits: readonly string[];
}

/** What the words say a target is: its last word, or `spell effect`; an `undead` creature has the trait. */
function described(text: string): Described | undefined {
  const spellEffect = SPELL_EFFECT.exec(text)?.groups;
  if (spellEffect !== undefined) {
    const before = spellEffect['before'] ?? '';
    return { of: TargetKind.SpellEffect, words: before === '' ? [] : before.split(' '), traits: [] };
  }
  const words = text.split(' ');
  const last = words.pop() ?? '';
  const kind = KINDS.get(last);
  if (kind !== undefined) {
    const undead = words.at(-1) === UNDEAD;
    return { of: kind, words: undead ? words.slice(0, -1) : words, traits: undead ? [UNDEAD] : [] };
  }
  return last === UNDEAD ? { of: TargetKind.Creature, words, traits: [UNDEAD] } : undefined;
}

/** A target's text split into its count, when it starts with one, and the words after it. */
interface Counted {
  readonly count?: Count;
  readonly words: string;
}

/** "up to 5 willing creatures": an optional "up to", a count in digits or words, then the words. */
function counted(text: string): Counted {
  const upTo = text.startsWith(UP_TO);
  const rest = upTo ? text.slice(UP_TO.length) : text;
  const [first = '', ...words] = rest.split(' ');
  const count = DIGITS.test(first) ? Number(first) : COUNT_WORDS.get(first);
  return count === undefined
    ? { words: text }
    : { count: { count, ...(upTo ? { upTo: true } : {}) }, words: words.join(' ') };
}

/** One alternative, counted as `inherited` when its own text has no count. */
function targetOf(text: string, inherited: Count | undefined): Target | undefined {
  const { count: own, words } = counted(text);
  const count = own ?? inherited;
  const target = described(words);
  if (count === undefined || target === undefined) {
    return undefined;
  }
  const qualifiers = target.words.flatMap((word) => QUALIFIERS.get(word) ?? []);
  if (qualifiers.length < target.words.length) {
    return undefined;
  }
  return {
    ...count,
    of: target.of,
    ...(qualifiers.length === 0 ? {} : { qualifiers }),
    ...(target.traits.length === 0 ? {} : { traits: target.traits }),
  };
}

/** Each alternative, a later one counted as the first when it gives no count ("1 creature or object"). */
function alternativesOf(text: string): Target[] | undefined {
  const [first = '', ...rest] = text.split(ALTERNATIVES);
  const head = targetOf(first, undefined);
  if (head === undefined) {
    return undefined;
  }
  const inherited: Count = { count: head.count, ...(head.upTo === undefined ? {} : { upTo: head.upTo }) };
  const tail = rest.flatMap((each) => targetOf(each, inherited) ?? []);
  return tail.length < rest.length ? undefined : [head, ...tail];
}

/** Foundry's target text as `targets`, or undefined when its wording does not map. Blank text is the caller's to skip. */
export function targetsOf(text: string): object | undefined {
  const value = text.trim().toLowerCase();
  const rest = INCLUDES_YOU.exec(value)?.groups?.['rest'];
  const any = alternativesOf(rest ?? value);
  return any && { any, ...(rest === undefined ? {} : { includesYou: true }) };
}
