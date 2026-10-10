import { BlockKind, contentKey, ContentKind, InlineKind, TriggerEvent, TriggerEventType } from '@pioneer/rules/sdk';
import type {
  ActionData,
  ContentEntry,
  ContentId,
  ContentKey,
  ContentText,
  InlineNode,
  RichText,
} from '@pioneer/rules/sdk';

/** Entry names by id, for a link in trigger text that shows its target's name rather than a label. */
export type RefNames = ReadonlyMap<ContentId, ContentText>;

/**
 * Trigger wordings the matcher knows, lowercased, without the closing full stop. A wording matches only the whole
 * trigger, so "You Strike a creature that is off-guard" stays unmatched rather than losing its condition.
 */
const KNOWN_TRIGGERS: ReadonlyMap<string, TriggerEvent> = new Map<string, TriggerEvent>([
  ['you roll initiative', { event: TriggerEventType.Initiative }],
  ['your turn begins', { event: TriggerEventType.TurnStart }],
  ['you begin your turn', { event: TriggerEventType.TurnStart }],
  ['at the start of your turn', { event: TriggerEventType.TurnStart }],
  ['the start of your turn', { event: TriggerEventType.TurnStart }],
  ['your turn ends', { event: TriggerEventType.TurnEnd }],
  ['you end your turn', { event: TriggerEventType.TurnEnd }],
  ['at the end of your turn', { event: TriggerEventType.TurnEnd }],
  ['the end of your turn', { event: TriggerEventType.TurnEnd }],
  ['you cast a spell', { event: TriggerEventType.CastSpell }],
  [
    'you cast a focus spell',
    TriggerEvent.parse({ event: TriggerEventType.CastSpell, predicate: ['item:trait:focus'] }),
  ],
  ['you cast a cantrip', TriggerEvent.parse({ event: TriggerEventType.CastSpell, predicate: ['item:trait:cantrip'] })],
  ['you strike', { event: TriggerEventType.Strike }],
  ['you make a strike', { event: TriggerEventType.Strike }],
  ['you attempt a strike', { event: TriggerEventType.Strike }],
  ['you take damage', { event: TriggerEventType.DamageTaken }],
]);

/** The words an inline node shows; undefined for a node that carries more than words (a check, damage, a glyph). */
function inlineText(node: InlineNode, names: RefNames): string | undefined {
  if (node.type === InlineKind.Text) {
    return node.text;
  }
  if (node.type === InlineKind.Ref) {
    return node.label ?? names.get(node.id);
  }
  return undefined;
}

/** A one-paragraph trigger as plain words, or undefined when it is anything richer. */
function triggerWords(trigger: RichText, names: RefNames): string | undefined {
  const [block, ...rest] = trigger;
  if (block?.type !== BlockKind.Paragraph || rest.length > 0) {
    return undefined;
  }
  const words = block.content.map((node) => inlineText(node, names));
  return words.every((word) => word !== undefined) ? words.join('') : undefined;
}

/** Lowercase, single spaces, straight apostrophes, no closing full stop. */
function normalise(words: string): string {
  return words.replaceAll('’', "'").replaceAll(/\s+/gu, ' ').trim().replace(/\.$/u, '').toLowerCase();
}

/**
 * The structured event a trigger's wording names (play-and-campaigns.md, "Triggered abilities"), or undefined when the
 * matcher doesn't know it. It runs over the committed packs (ADR-0031); what it misses is set by hand.
 */
export function matchTrigger(trigger: RichText, names: RefNames): TriggerEvent | undefined {
  const words = triggerWords(trigger, names);
  return words === undefined ? undefined : KNOWN_TRIGGERS.get(normalise(words));
}

/** How an entry is used when it is an action: an action's data, or the action a feat or class feature is. */
export function entryAction(entry: ContentEntry): ActionData | undefined {
  if (entry.kind === ContentKind.Action) {
    return entry.data;
  }
  if (entry.kind === ContentKind.Feat || entry.kind === ContentKind.ClassFeature) {
    return entry.data.action;
  }
  return undefined;
}

/** The event the matcher read for one entry. */
export interface TriggerMatch {
  readonly entry: ContentKey;
  readonly triggerEvent: TriggerEvent;
}

/**
 * For each entry whose action has a trigger but no event, the event its wording names. An entry that already has an
 * event keeps it, so a hand correction is never overwritten.
 */
export function triggerMatches(entries: readonly ContentEntry[], names: RefNames): readonly TriggerMatch[] {
  return entries.flatMap((entry) => {
    const action = entryAction(entry);
    if (action?.trigger === undefined || action.triggerEvent !== undefined) {
      return [];
    }
    const triggerEvent = matchTrigger(action.trigger, names);
    return triggerEvent === undefined ? [] : [{ entry: contentKey(entry.pack, entry.slug), triggerEvent }];
  });
}
