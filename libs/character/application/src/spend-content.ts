import { spellContent, SpendProblem } from '@pioneer/character/domain';
import type { SpendRequest } from '@pioneer/character/domain';
import { ContentKind, Trait } from '@pioneer/rules/sdk';
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

/**
 * Why the action's own content rules out `request`, or undefined when it allows it. The flags the client sends are
 * checked against the entry the action names; an action with no entry, such as a Strike, has nothing to check.
 */
export function contentRefusal(request: SpendRequest, registry: ContentRegistry): SpendProblem | undefined {
  if (falseAttack(request, registry)) {
    return SpendProblem.AttackNotAllowed;
  }
  return wrongPayment(request, registry) ? SpendProblem.PaymentNotAllowed : undefined;
}
