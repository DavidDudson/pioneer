import {
  activeSpellOf,
  effectContent,
  isSpellEffectOffered,
  SpellSpendKind,
  spellContent,
  SpendProblem,
  sustainedRounds,
} from '@pioneer/character/domain';
import type { ActiveEffect, ActiveSpell, FormShift, SpendRequest } from '@pioneer/character/domain';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { ContentKind, spellEffectId, Trait } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry } from '@pioneer/rules/sdk';

const ATTACK = Trait.parse('attack');

/**
 * The kinds whose entry says whether using it is an attack. A Strike is used by its weapon's id and the weapon has no
 * attack trait, so an entry of any other kind is left to the client, as an action with no entry is.
 */
const ATTACK_KINDS: ReadonlySet<ContentKind> = new Set([
  ContentKind.Action,
  ContentKind.Feat,
  ContentKind.ClassFeature,
  ContentKind.Spell,
]);

/** The entry of the registry named `id`, if any. */
function entryOf(registry: ContentRegistry, id: ContentId): ContentEntry | undefined {
  return registry.packs.flatMap((pack) => pack.otherEntries).find((entry) => entry.id === id);
}

/** Whether the spend flags an attack that the content of the action says it is not. */
function falseAttack({ attack, action }: SpendRequest, registry: ContentRegistry): boolean {
  if (attack !== true) {
    return false;
  }
  const entry = entryOf(registry, action);
  return entry !== undefined && ATTACK_KINDS.has(entry.kind) && !entry.traits.includes(ATTACK);
}

/**
 * Whether the spend pays for a spell the way its content rules out: a Focus Point for a spell without the focus
 * trait, or a slot for a focus spell or a cantrip. An action that is not a spell is not checked.
 */
function wrongPayment({ action, slot, focus }: SpendRequest, registry: ContentRegistry): boolean {
  if (slot === undefined && focus !== true) {
    return false;
  }
  const spell = spellContent(registry).anySpell(action);
  if (spell === undefined) {
    return false;
  }
  return (focus === true && !spell.focus) || (slot !== undefined && (spell.focus || spell.cantrip));
}

/** A content entry that is a spell. */
type SpellEntry = Extract<ContentEntry, { kind: typeof ContentKind.Spell }>;

/** The spell entry named `id`, if it is one. */
function spellEntryOf(registry: ContentRegistry, id: ContentId): SpellEntry | undefined {
  const entry = entryOf(registry, id);
  return entry?.kind === ContentKind.Spell ? entry : undefined;
}

/** Whether the spend casts a spell as sustained that the content does not sustain for as long as the cast says. */
function wrongSustain({ action, spell }: SpendRequest, registry: ContentRegistry): boolean {
  if (spell?.kind !== SpellSpendKind.Cast) {
    return false;
  }
  const entry = spellEntryOf(registry, action);
  return entry === undefined || sustainedRounds(entry.data.duration) !== spell.rounds;
}

/** Whether the spend dismisses with the Dismiss action a spell whose content has no such action. */
function wrongDismiss({ spell }: SpendRequest, registry: ContentRegistry, active: readonly ActiveSpell[]): boolean {
  if (spell?.kind !== SpellSpendKind.Dismiss) {
    return false;
  }
  const dismissed = activeSpellOf(active, spell.id);
  return dismissed !== undefined && spellEntryOf(registry, dismissed.spell)?.data.dismiss !== true;
}

/** Whether the spend shifts an effect on the character that is not a polymorph effect, which only a form can be. */
function shiftsNonForm(shift: FormShift, registry: ContentRegistry, active: readonly ActiveEffect[]): boolean {
  const target = active.find(({ id }) => id === shift.effect);
  return target !== undefined && effectContent(registry).get(target.effect)?.polymorph !== true;
}

/** Whether the spell `action` lists the form `to` among its effects, and offers it to the character by its roll options `facts`. */
function listsForm(
  { action, to }: { readonly action: ContentId; readonly to: ContentId },
  registry: ContentRegistry,
  facts: PredicateFacts | undefined,
): boolean {
  const effects = spellEntryOf(registry, action)?.data.effects ?? [];
  return effects.some((listed) => spellEffectId(listed) === to && isSpellEffectOffered(listed, facts));
}

/** Whether the spend puts on the character a form that the action's content does not list, or does not offer the character. */
function wrongApply(
  { action, apply }: SpendRequest,
  registry: ContentRegistry,
  facts: PredicateFacts | undefined,
): boolean {
  return apply !== undefined && !listsForm({ action, to: apply.effect }, registry, facts);
}

/** Whether the spend shifts a form that the action's content does not: the effect must be a polymorph one, the spell must shift forms, and list the form it shifts to, offered to the character by its roll options. */
function wrongShift(
  { action, shift }: SpendRequest,
  registry: ContentRegistry,
  { facts, activeEffects }: Pick<SpendSpells, 'facts' | 'activeEffects'>,
): boolean {
  if (shift === undefined) {
    return false;
  }
  if (shiftsNonForm(shift, registry, activeEffects)) {
    return true;
  }
  return (
    spellEntryOf(registry, action)?.data.shiftsForm !== true || !listsForm({ action, to: shift.to }, registry, facts)
  );
}

/** What a spend's content check reads of the play state: the active spells a sustain or dismissal names. */
export interface SpendSpells {
  readonly activeSpells: readonly ActiveSpell[];
  /** The effects on the character, which a form shift changes one of. */
  readonly activeEffects: readonly ActiveEffect[];
  /** The character's roll options, which a form shift's predicate reads; none refuses a form with a predicate. */
  readonly facts?: PredicateFacts | undefined;
}

/**
 * Why the action's own content rules out `request`, or undefined when it allows it. The flags the client sends are
 * checked against the entry the action names; an action with no entry, such as a Strike, has nothing to check.
 */
export function contentRefusal(
  request: SpendRequest,
  registry: ContentRegistry,
  { activeSpells, activeEffects, facts }: SpendSpells,
): SpendProblem | undefined {
  if (falseAttack(request, registry)) {
    return SpendProblem.AttackNotAllowed;
  }
  if (wrongPayment(request, registry)) {
    return SpendProblem.PaymentNotAllowed;
  }
  if (wrongSustain(request, registry)) {
    return SpendProblem.NotSustained;
  }
  if (wrongApply(request, registry, facts) || wrongShift(request, registry, { facts, activeEffects })) {
    return SpendProblem.ShiftNotAllowed;
  }
  return wrongDismiss(request, registry, activeSpells) ? SpendProblem.DismissNotAllowed : undefined;
}
