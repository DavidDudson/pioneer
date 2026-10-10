import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/**
 * What a name in a Pathbuilder export refers to, in report order. Values match `ContentKind` where one kind fits;
 * `item` stands for every physical item kind (armour, weapon, equipment, consumable, …), which Pathbuilder doesn't
 * tell apart.
 */
export const ImportKind = {
  Ancestry: 'ancestry',
  Heritage: 'heritage',
  Background: 'background',
  Class: 'class',
  Deity: 'deity',
  Feat: 'feat',
  ClassFeature: 'class-feature',
  Spell: 'spell',
  Ritual: 'ritual',
  Item: 'item',
  Language: 'language',
} as const;
export type ImportKind = ValueOf<typeof ImportKind>;
export const ImportKindSchema = z.enum(ImportKind);

/** Report order: identity first, then build, magic, gear and languages. */
export const IMPORT_KIND_ORDER: readonly ImportKind[] = Object.values(ImportKind);

/** A name as Pathbuilder wrote it. Never shown as app text; it is the user's own data. */
export const PathbuilderName = z.string().min(1).brand<'PathbuilderName'>();
export type PathbuilderName = z.infer<typeof PathbuilderName>;

/** One reference in the export to a content entry, before matching. */
export interface ImportedName {
  readonly kind: ImportKind;
  readonly name: PathbuilderName;
}
