import { isSpellEffectOffered, SlotCountKey } from '@pioneer/character/domain';
import type { EffectInstanceId } from '@pioneer/character/domain';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { ContentKind, spellEffectId, Trait } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry, RollOption, SpellRank } from '@pioneer/rules/sdk';
import type { ActionUse } from '@pioneer/rules/ui';

import { slotRank, spellEntries } from './sheet-active-list';
import { effectOptions } from './sheet-effects';
import type { EffectOption } from './sheet-effects';

const CANTRIP = Trait.parse('cantrip');

/** What a battle form spell's effect is called in the content, before the name of the form. */
const EFFECT_PREFIX = 'Spell Effect: ';

/** The registry kinds a form cast reads: the spells, and the effects they cast. */
export const FORM_CAST_CONTENT_KINDS: readonly ContentKind[] = [ContentKind.Spell, ContentKind.Effect];

/** One form a cast offers: the effect that carries it, and the choice of form within it when the effect has one. */
export interface FormCastChoice {
  /** Names the choice for the picker: the effect, then the form chosen within it. */
  readonly value: string;
  readonly label: string;
  readonly effect: ContentId;
  /** The roll option the effect's own choice sets; undefined when the effect is the form. */
  readonly form: RollOption | undefined;
}

/** A cast of a spell that puts a form on the caster, waiting for the form to be picked. */
export interface FormCast {
  readonly request: ActionUse;
  readonly spell: ContentId;
  readonly name: string;
  /** The rank it is cast at: the slot's, else the spell's own. */
  readonly rank: SpellRank;
  readonly choices: readonly FormCastChoice[];
  /** The form the caster is in when the spell changes it, rather than putting one on. */
  readonly shift: EffectInstanceId | undefined;
}

/** The name of an effect as the picker words a form: without the content's `Spell Effect:` prefix. */
function nameOf({ name }: EffectOption): string {
  return name.startsWith(EFFECT_PREFIX) ? name.slice(EFFECT_PREFIX.length) : name;
}

/** The forms of one effect: one per choice it offers, else the effect itself. */
function choicesOf(option: EffectOption): readonly FormCastChoice[] {
  const name = nameOf(option);
  if (option.forms.length === 0) {
    return [{ value: option.id, label: name, effect: option.id, form: undefined }];
  }
  return option.forms.map(({ option: form, label }) => ({
    value: `${option.id}:${form}`,
    label: `${name}: ${label}`,
    effect: option.id,
    form,
  }));
}

/** What a cast reads of the caster: the roll options predicates test, and the rank a focus spell is heightened to. */
export interface FormCaster {
  readonly facts: PredicateFacts;
  readonly focusRank: SpellRank;
  /** The active effect that is the form the caster is in; undefined in no form. */
  readonly form: EffectInstanceId | undefined;
}

interface RankInputs {
  readonly slot: string | undefined;
  readonly focus: boolean | undefined;
  readonly spell: { readonly traits: readonly Trait[]; readonly data: { readonly rank: SpellRank } };
  readonly caster: FormCaster | undefined;
}

/** The rank a cast is at: its slot's, else the caster's focus rank for a Focus Point cast or a cantrip, else the spell's own. */
function rankOf({ slot, focus, spell, caster }: RankInputs): SpellRank {
  const slotted = slotRank(slot === undefined ? undefined : SlotCountKey.parse(slot));
  if (slotted !== undefined) {
    return slotted;
  }
  const heightened = focus === true || spell.traits.includes(CANTRIP);
  return heightened && caster !== undefined ? caster.focusRank : spell.data.rank;
}

/**
 * The form cast using `request` would be, when the spell lists effects: the forms its effects offer. Undefined for any
 * other use, which spends at once.
 */
export function formCastOf(
  registry: ContentRegistry,
  request: ActionUse,
  caster: FormCaster | undefined,
): FormCast | undefined {
  const spell = spellEntries(registry).get(request.line.id);
  const listed = spell?.data.effects;
  if (spell === undefined || listed === undefined) {
    return undefined;
  }
  const offered = new Set(
    listed.filter((entry) => isSpellEffectOffered(entry, caster?.facts)).map((entry) => spellEffectId(entry)),
  );
  const options = effectOptions(registry).filter(({ id }) => offered.has(id));
  const choices = options.flatMap((option) => choicesOf(option));
  const { slot, focus } = request.line.payment ?? {};
  return choices.length === 0
    ? undefined
    : {
        request,
        spell: spell.id,
        name: spell.name,
        rank: rankOf({ slot, focus, spell, caster }),
        choices,
        shift: spell.data.shiftsForm === true ? caster?.form : undefined,
      };
}
