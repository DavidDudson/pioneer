import { computed } from '@angular/core';
import type { Signal } from '@angular/core';
import type { Character } from '@pioneer/character/domain';
import { InlineEdit } from '@pioneer/frontier';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { ApiError } from '@pioneer/shared/web';
import type * as z from 'zod';

/** How one sheet value maps to the aggregate and back. */
export interface FieldSpec<TValue> {
  readonly read: (character: Character) => TValue;
  /** Draft placeholder while loading; never shown. */
  readonly empty: TValue;
  /** Shared domain schema, so client validation matches the server. */
  readonly schema: z.ZodType;
  /** Sends the edit: a patch, or a slot pick. */
  readonly save: (value: TValue) => Promise<void>;
  readonly format?: (value: TValue) => string;
}

/** A rejected save: the server's field issue when it sent one, else the sheet's own wording. */
export function describeSaveError(error: unknown): MessageDescriptor {
  if (ApiError.isConflict(error)) {
    return message('character.sheet.conflict');
  }
  const [issue] = error instanceof ApiError ? error.issues : [];
  return issue?.message ?? message('character.sheet.saveFailed');
}

/** One chosen value of the open `character`, as its own inline edit with its own state. */
export function sheetField<TValue>(
  character: Signal<Character | undefined>,
  { read, empty, schema, save, format }: FieldSpec<TValue>,
): InlineEdit<TValue> {
  return new InlineEdit<TValue>({
    source: computed(() => {
      const current = character();
      return current === undefined ? undefined : read(current);
    }),
    empty,
    schema,
    save,
    isConflict: (error) => ApiError.isConflict(error),
    describeError: describeSaveError,
    ...(format === undefined ? {} : { format }),
  });
}
