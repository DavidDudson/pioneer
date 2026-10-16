import { characterFocus, characterGrants, characterSpellcasting } from '@pioneer/character/domain';
import type { CharacterDocument, CharacterFocus, SlotContent } from '@pioneer/character/domain';
import type { ChoiceSlot } from '@pioneer/rules/grants';
import { ContentId, RuleElementKey, SlotRank } from '@pioneer/rules/sdk';

import { openPicks, picking } from './choice-search';
import type { ChoicePick } from './choice-search';
import { ImportKind, PathbuilderName } from './import-kind';
import type { PathbuilderImport } from './read-pathbuilder-export';
import { SpellGapReason } from './spell-listing';
import type { SpellGap, SpellPicks, SpellPlacementContent } from './spell-listing';

/** Placing so far: the document with the picks made, and the picks. */
interface Placed {
  readonly document: CharacterDocument;
  readonly choices: SpellPicks;
  /** The picks still allowed: one for each spell wanted, so a pick that undoes another cannot go on for ever. */
  readonly passes: number;
}

/** The picks that make the character's focus entries have the focus spells an export lists, and those they still lack. */
export interface FocusPlacement {
  readonly choices: SpellPicks;
  readonly gaps: readonly SpellGap[];
}

/** The character's focus spells and focus pool as the engine reads them from the features that grant them (ADR-0050). */
export function documentFocus(document: CharacterDocument, slots: SlotContent): CharacterFocus {
  return characterFocus(characterSpellcasting(characterGrants(document, slots)), slots.spells, document.level);
}

/** A focus spell Pathbuilder lists for a tradition and attribute: how it is listed, and the rank it is cast at. */
interface Listed {
  readonly tradition: string;
  readonly attribute: string;
  readonly caster: PathbuilderName;
  readonly name: PathbuilderName;
  readonly id: ContentId;
  readonly cantrip: boolean;
  /** The spell by `keyOf`: with the tradition and attribute of the entry it is listed for. */
  readonly key: string;
}

/** The names a list holds, trimmed, without the empty ones. */
function named(names: readonly string[]): PathbuilderName[] {
  return names.flatMap((name) => (name.trim() === '' ? [] : [PathbuilderName.parse(name.trim())]));
}

/** The focus cantrips and focus spells Pathbuilder lists that matched content. */
function listed(value: PathbuilderImport, content: SpellPlacementContent): Listed[] {
  return Object.entries(value.reported.focus).flatMap(([tradition, byAttribute]) =>
    Object.entries(byAttribute).flatMap(([attribute, listing]) => {
      const caster = PathbuilderName.parse(`${tradition} ${attribute} focus`);
      const lists = [
        { cantrip: true, names: named(listing.focusCantrips) },
        { cantrip: false, names: named(listing.focusSpells) },
      ];
      return lists.flatMap(({ cantrip, names }) =>
        names.flatMap((name): Listed[] => {
          const match = content.lookup.resolve(ImportKind.Spell, name);
          return match === undefined
            ? []
            : [
                {
                  tradition,
                  attribute,
                  caster,
                  name,
                  id: ContentId.parse(match.id),
                  cantrip,
                  key: keyOf(tradition, attribute, ContentId.parse(match.id)),
                },
              ];
        }),
      );
    }),
  );
}

/** What names the focus entries of a tradition and attribute. */
function homeOf(tradition: string, attribute: string): string {
  return `${tradition}|${attribute}`;
}

/** What names a focus spell with the tradition and attribute of the entry that has it. */
function keyOf(tradition: string, attribute: string, id: ContentId): string {
  return `${tradition}|${attribute}|${id}`;
}

/** The focus spells the character has, by `keyOf`. */
function held(document: CharacterDocument, content: SpellPlacementContent): Set<string> {
  return new Set(
    documentFocus(document, content.slots).entries.flatMap(({ entry, spells }) =>
      spells.map(({ id }) => keyOf(entry.tradition, entry.attribute, id)),
    ),
  );
}

/** How far down the features a feature grants a focus spell may sit: a class feature grants a mystery that holds them. */
const GRANT_DEPTH = 3;

/**
 * Whether the entry carries `FocusSpells` elements, or grants an entry that does, a few grants down: its choices may
 * answer for a focus spell, and the choices of an unrelated entry do not.
 */
function givesFocus(content: SpellPlacementContent, id: ContentId, depth: number = GRANT_DEPTH): boolean {
  const rules = content.slots.lookup.entry(id)?.rules ?? [];
  return (
    depth >= 0 &&
    rules.some((rule) => {
      if (rule.key === RuleElementKey.FocusSpells) {
        return true;
      }
      const granted = rule.key === RuleElementKey.GrantItem ? ContentId.safeParse(rule.item) : undefined;
      return granted?.success === true && givesFocus(content, granted.data, depth - 1);
    })
  );
}

/** Whether the choice sits in an entry that gives focus spells, or one of its options is an entry that does. */
function answersFocus(content: SpellPlacementContent, slot: ChoiceSlot): boolean {
  return (
    givesFocus(content, slot.origin.entry) ||
    slot.options.some((option) => {
      const offered = ContentId.safeParse(option.value);
      return offered.success && givesFocus(content, offered.data, GRANT_DEPTH - 1);
    })
  );
}

/** The first open choice option that gives the character one of the `left` spells, if any does. */
function helpful(
  document: CharacterDocument,
  content: SpellPlacementContent,
  left: readonly Listed[],
): ChoicePick | undefined {
  return openPicks(document, content, (slot) => answersFocus(content, slot)).find((pick) => {
    const have = held(picking(document, pick), content);
    return left.some((spell) => have.has(spell.key));
  });
}

/** The picks that give the wanted spells, one choice at a time: each makes the character hold one more of them. */
function pickChoices(placed: Placed, content: SpellPlacementContent, wanted: readonly Listed[]): Placed {
  const have = held(placed.document, content);
  const left = wanted.filter((spell) => !have.has(spell.key));
  const pick = left.length === 0 || placed.passes === 0 ? undefined : helpful(placed.document, content, left);
  if (pick === undefined) {
    return placed;
  }
  const [slot, value] = pick;
  return pickChoices(
    {
      document: picking(placed.document, pick),
      choices: { ...placed.choices, [slot]: value },
      passes: placed.passes - 1,
    },
    content,
    wanted,
  );
}

/** The wanted spells the character still lacks, with why. */
function lacking(document: CharacterDocument, content: SpellPlacementContent, wanted: readonly Listed[]): SpellGap[] {
  const have = held(document, content);
  const { rank, entries } = documentFocus(document, content.slots);
  const homes = new Set(entries.map(({ entry }) => homeOf(entry.tradition, entry.attribute)));
  return wanted.flatMap((spell): SpellGap[] =>
    have.has(spell.key)
      ? []
      : [
          {
            caster: spell.caster,
            rank: spell.cantrip ? SlotRank.Cantrip : rank,
            name: spell.name,
            reason: homes.has(homeOf(spell.tradition, spell.attribute))
              ? SpellGapReason.NotGranted
              : SpellGapReason.NoEntry,
          },
        ],
  );
}

/**
 * Pathbuilder's focus spells and focus cantrips on the character (ADR-0050). They come from the features that grant them,
 * so nothing is placed in a slot; what can be set is a feature's own choice (a mystery, a devotion spell, a domain),
 * picked as the option that gives the spell. A listed spell no choice gives is a gap: the character has no focus entry of
 * its tradition and attribute (`no-entry`), or the entry does not have it (`not-granted`). A cantrip is listed as one, any
 * other focus spell at the rank every focus spell is cast at.
 */
export function placeFocus(
  document: CharacterDocument,
  content: SpellPlacementContent,
  value: PathbuilderImport,
): FocusPlacement {
  const wanted = listed(value, content);
  const placed = pickChoices({ document, choices: {}, passes: wanted.length }, content, wanted);
  return { choices: placed.choices, gaps: lacking(placed.document, content, wanted) };
}
