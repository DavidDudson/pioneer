import { computed, signal, untracked } from '@angular/core';
import type { Signal } from '@angular/core';
import { loreDisplayName, LoreName, loreSelectionOf, TypedLore } from '@pioneer/character/domain';
import type { Character, CharacterSlot } from '@pioneer/character/domain';
import type { InlineEdit, SelectOption } from '@pioneer/frontier';
import { ChoiceValue } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';
import type { AttributePickerRow, SkillPickerRow, SlotPickerRow } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { NOT_CHOSEN, RootPick } from './sheet-build';
import { sheetField } from './sheet-field';
import type { TrainedNote } from './sheet-skills';

/** What a slot pick's table shows: a skill slot's skills, a boost slot's attributes, or a choice's options. */
export type SlotPickRows =
  | { readonly kind: 'skills'; readonly rows: readonly SkillPickerRow[] }
  | { readonly kind: 'attributes'; readonly rows: readonly AttributePickerRow[] }
  | { readonly kind: 'choices'; readonly rows: readonly SlotPickerRow[] };

/** What a slot pick reads and writes through. */
export interface SlotPickSources {
  readonly character: Signal<Character | undefined>;
  /** The slots as the server read them. */
  readonly slots: Signal<readonly CharacterSlot[] | undefined>;
  readonly select: (slot: SlotKey, selection: ChoiceValue, loreName?: LoreName) => Promise<void>;
  readonly clear: (slot: SlotKey) => Promise<void>;
  readonly translate: (key: string) => string;
}

/**
 * A slot as an inline pick, with its label and what it offers: a trained skill or skill increase, or a `ChoiceSet` that
 * lists its options.
 */
export interface SlotPickField {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly options: Signal<readonly SelectOption<string>[]>;
  /** What its table shows of each option. */
  readonly rows: Signal<SlotPickRows>;
  /** The skills the slot can't offer because the character is trained already, and what trains them. */
  readonly trained: Signal<readonly TrainedNote[]>;
  readonly field: InlineEdit<string | undefined>;
}

/** A draft in a skill pick: a pick, none, or a Lore typed in the picker (`lore:Sailing`). */
const SlotDraft = z.union([RootPick, TypedLore]);

/** Picks what a draft says in `slot`: a typed Lore becomes the pick of its topic, with the name it was typed as. */
async function saveDraft(sources: SlotPickSources, slot: SlotKey, draft: string): Promise<void> {
  const typed = TypedLore.safeParse(draft);
  const lore = typed.success ? loreSelectionOf(typed.data) : undefined;
  await (lore === undefined
    ? sources.select(slot, ChoiceValue.parse(draft))
    : sources.select(slot, lore.selection, lore.loreName));
}

/** The name a typed Lore draft shows as: what was typed, with Lore after it. */
function typedName(draft: string): string | undefined {
  const typed = TypedLore.safeParse(draft);
  const lore = typed.success ? LoreName.safeParse(draft.slice(typed.data.indexOf(':') + 1)) : undefined;
  return lore?.success === true ? loreDisplayName(lore.data) : undefined;
}

/** The name the server read for the pick stored in `slot`, shown when its slot no longer offers it. */
function storedName({ slots }: SlotPickSources, slot: SlotKey): string | undefined {
  const read = slots()?.find((each) => each.key === slot);
  return read !== undefined && 'selectionName' in read ? read.selectionName : undefined;
}

/**
 * A slot as an inline pick, named by its options, or by the name the server read when its slot no longer offers the
 * pick. An empty slot, or one the character hasn't (its key undefined), reads as `NOT_CHOSEN`, never undefined, which
 * the edit takes for still loading.
 */
export function slotField(
  sources: SlotPickSources,
  slot: Signal<SlotKey | undefined>,
  options: Signal<readonly SelectOption<string>[]>,
): InlineEdit<string | undefined> {
  return sheetField<string | undefined>(sources.character, {
    read: (character) => {
      const key = slot();
      return key === undefined ? NOT_CHOSEN : (character.document.build.choices[key] ?? NOT_CHOSEN);
    },
    empty: NOT_CHOSEN,
    schema: SlotDraft,
    save: async (value) => {
      const key = slot();
      if (key === undefined) {
        return;
      }
      await (value === undefined || value === NOT_CHOSEN ? sources.clear(key) : saveDraft(sources, key, value));
    },
    format: (value) => {
      if (value === undefined || value === NOT_CHOSEN) {
        return sources.translate('character.sheet.notChosen');
      }
      const key = slot();
      const stored = key === undefined ? undefined : storedName(sources, key);
      return options().find((option) => option.value === value)?.label ?? stored ?? typedName(value) ?? value;
    },
  });
}

/** What a slot shows while it has gone: nothing. */
const NO_ROWS: SlotPickRows = { kind: 'choices', rows: [] };

function sameKeys(left: readonly SlotKey[], right: readonly SlotKey[]): boolean {
  return left.length === right.length && left.every((key, index) => key === right[index]);
}

/** A slot a pick field is made for: its key, its label and what it offers. */
export interface PickSlot {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly options: readonly SelectOption<string>[];
  /** Absent for a slot with no table. */
  readonly rows?: SlotPickRows;
  readonly trained?: readonly TrainedNote[];
}

/**
 * One inline pick per slot, made anew only when the slots change (a class change, an Intelligence boost, a level up, a
 * feat that asks), so an edit in progress keeps its session while the character changes around it.
 */
export function slotFieldsOf(
  sources: SlotPickSources,
  slots: Signal<readonly PickSlot[] | undefined>,
): Signal<readonly SlotPickField[]> {
  const keys = computed(() => (slots() ?? []).map((slot) => slot.key), { equal: sameKeys });
  return computed(() =>
    keys().flatMap((key): SlotPickField[] => {
      const label = untracked(() => slots()?.find((slot) => slot.key === key)?.label);
      if (label === undefined) {
        return [];
      }
      const options = computed(() => slots()?.find((slot) => slot.key === key)?.options ?? []);
      const trained = computed(() => slots()?.find((slot) => slot.key === key)?.trained ?? []);
      const rows = computed((): SlotPickRows => slots()?.find((slot) => slot.key === key)?.rows ?? NO_ROWS);
      return [{ key, label, options, rows, trained, field: slotField(sources, signal(key), options) }];
    }),
  );
}
