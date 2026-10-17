import { CreatureRole, Size } from '@pioneer/rules/sdk';

/** The message key of each creature role, the ones the role filter uses. */
export const ROLE_MESSAGES: Readonly<Record<CreatureRole, string>> = {
  [CreatureRole.Monster]: 'rules.facet.role.monster',
  [CreatureRole.Npc]: 'rules.facet.role.npc',
};

/** The sizes from tiny to gargantuan, so the size column sorts by how big a creature is. */
export const SIZE_ORDER: readonly Size[] = [Size.Tiny, Size.Small, Size.Medium, Size.Large, Size.Huge, Size.Gargantuan];
