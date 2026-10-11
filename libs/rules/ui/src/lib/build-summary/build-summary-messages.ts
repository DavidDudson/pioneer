import { Size } from '@pioneer/rules/sdk';

import { BuildPart } from './build-line';

/** Message keys the build summary renders with, spelled out so the key check sees them. */
export const BuildSummaryMessage = {
  Edit: 'rules.build.edit',
} as const;

/** What each part is called. */
export const BUILD_PART_MESSAGES: Readonly<Record<BuildPart, string>> = {
  [BuildPart.Class]: 'rules.build.part.class',
  [BuildPart.Subclass]: 'rules.build.part.subclass',
  [BuildPart.Ancestry]: 'rules.build.part.ancestry',
  [BuildPart.Heritage]: 'rules.build.part.heritage',
  [BuildPart.Background]: 'rules.build.part.background',
  [BuildPart.Deity]: 'rules.build.part.deity',
  [BuildPart.KeyAttribute]: 'rules.build.part.keyAttribute',
  [BuildPart.Size]: 'rules.build.part.size',
};

/** What an empty part asks the player to pick. */
export const BUILD_EMPTY_MESSAGES: Readonly<Record<BuildPart, string>> = {
  [BuildPart.Class]: 'rules.build.empty.class',
  [BuildPart.Subclass]: 'rules.build.empty.subclass',
  [BuildPart.Ancestry]: 'rules.build.empty.ancestry',
  [BuildPart.Heritage]: 'rules.build.empty.heritage',
  [BuildPart.Background]: 'rules.build.empty.background',
  [BuildPart.Deity]: 'rules.build.empty.deity',
  [BuildPart.KeyAttribute]: 'rules.build.empty.keyAttribute',
  [BuildPart.Size]: 'rules.build.empty.size',
};

export const SIZE_MESSAGES: Readonly<Record<Size, string>> = {
  [Size.Tiny]: 'rules.build.size.tiny',
  [Size.Small]: 'rules.build.size.small',
  [Size.Medium]: 'rules.build.size.medium',
  [Size.Large]: 'rules.build.size.large',
  [Size.Huge]: 'rules.build.size.huge',
  [Size.Gargantuan]: 'rules.build.size.gargantuan',
};
