/** The ids of the table's columns. */
export const BrowseColumn = {
  Name: 'name',
  Kind: 'kind',
  Level: 'level',
  Role: 'role',
  Size: 'size',
  HitPoints: 'hitPoints',
  ArmorClass: 'armorClass',
  Traits: 'traits',
  Source: 'source',
} as const;

/** The short code each column has in a shared view's `s` and `c` params (ADR-0068). Fixed: links name them. */
export const BrowseColumnCode = {
  Name: 'name',
  Kind: 'kind',
  Level: 'lvl',
  Role: 'role',
  Size: 'size',
  HitPoints: 'hp',
  ArmorClass: 'ac',
  Traits: 'trt',
  Source: 'src',
} as const;
