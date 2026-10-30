import { formLimits, itemContent } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { SIZE_MESSAGES } from '@pioneer/rules/ui';
import type { FormPreviewRow } from '@pioneer/rules/ui';

import { sheetSenses } from './sheet-senses';
import { sheetSlotContent } from './sheet-slot-content';
import { sheetVitalsInPlay } from './sheet-statistics';
import { sheetStrikes } from './sheet-strikes';

/** The messages the rows beyond the numbers are worded with. */
const RowMessage = {
  Size: 'character.sheet.formPreview.size',
  Strikes: 'character.sheet.formPreview.strikes',
  Senses: 'character.sheet.formPreview.senses',
  Casting: 'character.sheet.formPreview.casting',
  Speech: 'character.sheet.formPreview.speech',
  Hands: 'character.sheet.formPreview.hands',
  Can: 'character.sheet.formPreview.can',
  Cannot: 'character.sheet.formPreview.cannot',
} as const;

/** Words a message key in the viewer's language. */
type Translate = (key: string) => string;

/** What the rows compare: the character outside any form, and with the form on, over the content. */
export interface FormRowInputs {
  readonly registry: ContentRegistry;
  readonly own: Character;
  readonly morphed: Character;
  readonly translate: Translate;
}

/** `list` worded as one line, or undefined when it is empty. */
function listed(names: readonly string[]): string | undefined {
  return names.length === 0 ? undefined : names.join(', ');
}

/** The row for `name` when the form's `form` differs from `own`. */
function differing(name: string, own: string | undefined, form: string | undefined): readonly FormPreviewRow[] {
  return form === undefined || own === form ? [] : [{ name, own: own ?? '', form }];
}

/** The name of the content entry `id`, else its id. */
function entryName(registry: ContentRegistry, id: ContentId): string {
  return registry.packs.flatMap((pack) => pack.otherEntries).find((entry) => entry.id === id)?.name ?? id;
}

function sizeRow({ registry, own, morphed, translate }: FormRowInputs): readonly FormPreviewRow[] {
  const inForm = sheetVitalsInPlay(registry, morphed)?.size;
  const outOfForm = sheetVitalsInPlay(registry, own)?.size?.size ?? inForm?.base;
  return differing(
    translate(RowMessage.Size),
    outOfForm === undefined ? undefined : translate(SIZE_MESSAGES[outOfForm]),
    inForm === undefined ? undefined : translate(SIZE_MESSAGES[inForm.size]),
  );
}

function strikesRow({ registry, own, morphed, translate }: FormRowInputs): readonly FormPreviewRow[] {
  const names = (character: Character): readonly string[] =>
    sheetStrikes(registry, character).map(({ name, nameKey }) => (nameKey === undefined ? name : translate(nameKey)));
  return differing(translate(RowMessage.Strikes), listed(names(own)), listed(names(morphed)));
}

function sensesRow({ registry, own, morphed, translate }: FormRowInputs): readonly FormPreviewRow[] {
  const inForm = sheetSenses(registry, morphed).senses;
  const names = (senses: readonly { readonly sense: ContentId }[]): string | undefined =>
    listed(senses.map(({ sense }) => entryName(registry, sense)));
  // A form without senses of its own leaves the character's, so only a form that lists some is a change.
  const formListsSenses = inForm.some(({ fromForm }) => fromForm === true);
  return formListsSenses
    ? differing(translate(RowMessage.Senses), names(sheetSenses(registry, own).senses), names(inForm))
    : [];
}

function limitsRows({ registry, morphed, translate }: FormRowInputs): readonly FormPreviewRow[] {
  const limits = formLimits(morphed.document, itemContent(registry), sheetSlotContent(registry));
  const row = (forbidden: boolean | undefined, name: string): readonly FormPreviewRow[] =>
    forbidden === true
      ? [{ name: translate(name), own: translate(RowMessage.Can), form: translate(RowMessage.Cannot) }]
      : [];
  return [
    ...row(limits?.cantCast, RowMessage.Casting),
    ...row(limits?.cantSpeak, RowMessage.Speech),
    ...row(limits?.noHands, RowMessage.Hands),
  ];
}

/** The rows for what a form changes besides the numbers: size, Strikes, senses and what the character can no longer do. */
export function formRows(inputs: FormRowInputs): readonly FormPreviewRow[] {
  return [...sizeRow(inputs), ...strikesRow(inputs), ...sensesRow(inputs), ...limitsRows(inputs)];
}
