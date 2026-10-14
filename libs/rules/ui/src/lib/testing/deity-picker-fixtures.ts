import { RichText, SourceRef } from '@pioneer/rules/sdk';

import type { DeityPickerRow } from '../deity-picker/deity-picker-row';

/** Player Core, page 1: a source for a fixture deity. */
const PLAYER_CORE: readonly SourceRef[] = [SourceRef.parse({ kind: 'book', book: 'player-core', page: 1 })];

/** Edicts and anathema as a deity's description has them. */
function edictsAndAnathema(edicts: string, anathema: string): RichText {
  return RichText.parse([
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Edicts', marks: ['strong'] },
        { type: 'text', text: ` ${edicts}` },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Anathema', marks: ['strong'] },
        { type: 'text', text: ` ${anathema}` },
      ],
    },
  ]);
}

/** A deity that can be holy, grants the heal font and the healing domain, which `overrides` change. */
export function deityRow(overrides: Partial<DeityPickerRow> & Pick<DeityPickerRow, 'id' | 'name'>): DeityPickerRow {
  return {
    sanctification: { modal: 'can', what: ['holy'] },
    fonts: ['heal'],
    domains: ['healing'],
    favoredWeapons: ['Scimitar'],
    skills: ['Medicine'],
    description: edictsAndAnathema('protect allies', 'create undead'),
    sources: PLAYER_CORE,
    disabledReason: undefined,
    ...overrides,
  };
}
