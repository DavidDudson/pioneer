/**
 * The value union of a const object. Pairs with the const-object pattern that
 * replaces TypeScript `enum` (banned by `erasableSyntaxOnly`):
 *
 * ```ts
 * export const Ancestry = { Human: 'human', Elf: 'elf' } as const;
 * export type Ancestry = ValueOf<typeof Ancestry>;
 * export const AncestrySchema = z.enum(Ancestry);
 * ```
 *
 * `Ancestry.Human` reads like an enum member, `Ancestry` is also the union
 * type, and `z.enum` accepts the object directly.
 */
export type ValueOf<TObject> = TObject[keyof TObject];
