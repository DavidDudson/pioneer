import { TargetCountWord, TargetKind, TargetQualifier, TargetWithin, TargetYou } from '@pioneer/rules/sdk';

/**
 * Foundry's spell targets, English text ("1 willing living creature or 1 undead", "you and up to 4 allies", "the
 * triggering creature"), as Pioneer's `targets` (ADR-0021). Only whole wordings of counts, qualifiers, traits and
 * kinds map; anything else ("1 creature you know by name", "1 creature of a level no greater than ...") is
 * undefined, for the caller to report.
 */

/** "you and up to 4 allies", "you or 1 ally": the caster, as well as or instead of the targets that follow. */
const YOU = /^you (?<you>and|or) (?<rest>.+)$/u;

/** "1 ally and 1 enemy": one target as well as another. */
const BOTH = /^(?<first>.+?) and (?<second>.+)$/u;

/** Alternatives: "1 creature or object", "1 creature, unattended object, or construct". */
const ALTERNATIVES = /,? or |, /u;

/** Counts written with "or" or "to", reworded before the alternatives are split on "or". */
const REWORDINGS: readonly (readonly [RegExp, string])[] = [
  /* A choice up to a number: "1 to 3 willing creatures", "1 or 2 creatures". "1 or 10" is two counts, not a range. */
  [/^1 to (?<most>\d+) /u, 'up to $<most> '],
  [/^1 or 2 /u, 'up to 2 '],
  [/^1 or (?:more|any number of) /u, 'any number of '],
  /* Pet Cache's "1 willing creature that is your companion". */
  [/ creature that is your companion$/u, ' companion'],
];

/** "up to 5 creatures": the count is a most. */
const UP_TO = 'up to ';

/** "any number of creatures". */
const ANY_NUMBER = 'any number of ';

/** "the triggering creature": the one that triggered a reaction spell. */
const TRIGGERING = 'the triggering ';

/** "all creatures in range", "enemies in the area": every one of them there. */
const ALL_WITHIN = /^(?:all )?(?<words>.+) in (?:the )?(?<within>area|range)$/u;

const WITHIN: ReadonlyMap<string, TargetWithin> = new Map([
  ['area', TargetWithin.Area],
  ['range', TargetWithin.Range],
]);

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
  ['enemy', TargetKind.Enemy],
  ['enemies', TargetKind.Enemy],
  ['corpse', TargetKind.Corpse],
  ['corpses', TargetKind.Corpse],
  ['weapon', TargetKind.Weapon],
  ['weapons', TargetKind.Weapon],
  ['item', TargetKind.Item],
  ['items', TargetKind.Item],
  ['companion', TargetKind.Companion],
]);

/** The caster's own creatures: "your animal companion", "your familiar". */
const YOURS: ReadonlyMap<string, TargetKind> = new Map([
  ['your animal companion', TargetKind.AnimalCompanion],
  ['your familiar', TargetKind.Familiar],
  ['your eidolon', TargetKind.Eidolon],
  ['your companion', TargetKind.Companion],
]);

/** Kinds Foundry writes in two words. */
const SPELL_EFFECT = /^(?<before>.*?)\s*spell effects?$/u;

const QUALIFIERS: ReadonlyMap<string, TargetQualifier> = new Map([
  ['willing', TargetQualifier.Willing],
  ['living', TargetQualifier.Living],
  ['dead', TargetQualifier.Dead],
  ['dying', TargetQualifier.Dying],
  ['sleeping', TargetQualifier.Sleeping],
  ['falling', TargetQualifier.Falling],
  ['flying', TargetQualifier.Flying],
  ['corporeal', TargetQualifier.Corporeal],
  ['unattended', TargetQualifier.Unattended],
  ['magic', TargetQualifier.Magical],
  ['magical', TargetQualifier.Magical],
]);

/**
 * Creature traits a target can be named by, as a noun ("1 animal", "1 undead") or before its kind ("1 extraplanar
 * creature"): the creature types, and the planar traits.
 */
const CREATURE_TRAITS: ReadonlySet<string> = new Set([
  'aberration',
  'animal',
  'astral',
  'beast',
  'celestial',
  'construct',
  'dragon',
  'elemental',
  'ethereal',
  'extraplanar',
  'fey',
  'fiend',
  'fungus',
  'giant',
  'humanoid',
  'monitor',
  'ooze',
  'plant',
  'spirit',
  'undead',
]);

/** How many of a target, and whether "up to" that many, all of them somewhere, or the triggering one. */
interface Count {
  readonly count: number | TargetCountWord;
  readonly upTo?: true;
  readonly within?: TargetWithin;
  readonly triggering?: true;
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

/** What the words say a target is: its last word, or `spell effect`; a creature trait as the last word is a creature. */
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
    return { of: kind, words, traits: [] };
  }
  return CREATURE_TRAITS.has(last) ? { of: TargetKind.Creature, words, traits: [last] } : undefined;
}

/** A target's text split into its count, when it starts with one, and the words after it. */
interface Counted {
  readonly count?: Count;
  readonly words: string;
}

/** "up to 5 willing creatures": an optional "up to", a count in digits or words, then the words. */
function numbered(text: string): Counted {
  const upTo = text.startsWith(UP_TO);
  const rest = upTo ? text.slice(UP_TO.length) : text;
  const [first = '', ...words] = rest.split(' ');
  const count = DIGITS.test(first) ? Number(first) : COUNT_WORDS.get(first);
  return count === undefined
    ? { words: text }
    : { count: { count, ...(upTo ? { upTo: true } : {}) }, words: words.join(' ') };
}

/** A count in words ("any number of", "the triggering", "all … in range") or a number. */
function counted(text: string): Counted {
  const within = ALL_WITHIN.exec(text)?.groups;
  const where = within && WITHIN.get(within['within'] ?? '');
  if (within !== undefined && where !== undefined) {
    return { count: { count: TargetCountWord.All, within: where }, words: within['words'] ?? '' };
  }
  if (text.startsWith(ANY_NUMBER)) {
    return { count: { count: TargetCountWord.Any }, words: text.slice(ANY_NUMBER.length) };
  }
  if (text.startsWith(TRIGGERING)) {
    return { count: { count: 1, triggering: true }, words: text.slice(TRIGGERING.length) };
  }
  return numbered(text);
}

/** The words before a kind as its qualifiers and traits; undefined when any word is neither. */
function narrowed(target: Described): Pick<Target, 'qualifiers' | 'traits'> | undefined {
  const qualifiers = target.words.flatMap((word) => QUALIFIERS.get(word) ?? []);
  const traits = [...target.words.filter((word) => CREATURE_TRAITS.has(word)), ...target.traits];
  if (qualifiers.length + traits.length < target.words.length + target.traits.length) {
    return undefined;
  }
  return {
    ...(qualifiers.length === 0 ? {} : { qualifiers }),
    ...(traits.length === 0 ? {} : { traits }),
  };
}

/** One alternative, counted as `inherited` when its own text has no count. */
function targetOf(text: string, inherited: Count | undefined): Target | undefined {
  const yours = YOURS.get(text);
  if (yours !== undefined) {
    return { count: 1, of: yours };
  }
  const { count: own, words } = counted(text);
  const count = own ?? inherited;
  const target = described(words);
  const narrowing = target && narrowed(target);
  if (count === undefined || target === undefined || narrowing === undefined) {
    return undefined;
  }
  return { ...count, of: target.of, ...narrowing };
}

/** The count a later alternative without its own takes from the first: "the triggering creature or object". */
function countOf({ of: _of, qualifiers: _qualifiers, traits: _traits, ...count }: Target): Count {
  return count;
}

/** Each alternative, a later one counted as the first when it gives no count ("1 creature or object"). */
function alternativesOf(text: string): Target[] | undefined {
  const [first = '', ...rest] = text.split(ALTERNATIVES);
  const head = targetOf(first, undefined);
  if (head === undefined) {
    return undefined;
  }
  const inherited = countOf(head);
  const tail = rest.flatMap((each) => targetOf(each, inherited) ?? []);
  return tail.length < rest.length ? undefined : [head, ...tail];
}

/** Text with its counts reworded ("1 to 3" as "up to 3"). */
function reworded(text: string): string {
  let words = text;
  for (const [pattern, replacement] of REWORDINGS) {
    words = words.replace(pattern, replacement);
  }
  return words;
}

/** `targets` without the caster: alternatives, or one target as well as another ("1 ally and 1 enemy"). */
interface Groups {
  readonly any: readonly Target[];
  readonly plus?: readonly Target[];
}

function groupsOf(text: string): Groups | undefined {
  const any = alternativesOf(reworded(text));
  if (any !== undefined) {
    return { any };
  }
  const both = BOTH.exec(text)?.groups;
  const first = both && alternativesOf(reworded(both['first'] ?? ''));
  const plus = both && alternativesOf(reworded(both['second'] ?? ''));
  return first && plus && { any: first, plus };
}

/** Foundry's target text as `targets`, or undefined when its wording does not map. Blank text is the caller's to skip. */
export function targetsOf(text: string): object | undefined {
  const value = text.trim().toLowerCase();
  const you = YOU.exec(value)?.groups;
  const groups = groupsOf(you?.['rest'] ?? value);
  const caster = you?.['you'] === 'or' ? TargetYou.Or : TargetYou.And;
  return groups && { ...groups, ...(you === undefined ? {} : { you: caster }) };
}
