import type { Attribute, Size } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

/** What the build summary names, in its order (#462). */
export const BuildPart = {
  Class: 'class',
  Subclass: 'subclass',
  Ancestry: 'ancestry',
  Heritage: 'heritage',
  Background: 'background',
  Deity: 'deity',
  KeyAttribute: 'keyAttribute',
  Size: 'size',
} as const;
export type BuildPart = ValueOf<typeof BuildPart>;

/** A part's value: content by its name, an attribute, or a size. */
export type BuildValue = { readonly name: string } | { readonly attribute: Attribute } | { readonly size: Size };

/** One part of the build as the summary shows it; an undefined value says what to pick. */
export interface BuildLine {
  readonly part: BuildPart;
  readonly value: BuildValue | undefined;
}
