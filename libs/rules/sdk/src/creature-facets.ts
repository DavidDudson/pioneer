import { ContentKind } from './content-kind';
import { CreatureRole } from './creature';
import { FacetId, FacetLabel, facetLabels, FacetType } from './facet';
import type { FacetDefinition } from './facet';
import { Size } from './size';

const CreatureFacetMessage = {
  Role: FacetLabel.parse('rules.facet.label.role'),
  Size: FacetLabel.parse('rules.facet.label.size'),
} as const;

const ROLE_LABELS = facetLabels({
  [CreatureRole.Monster]: 'rules.facet.role.monster',
  [CreatureRole.Npc]: 'rules.facet.role.npc',
});

const SIZE_LABELS = facetLabels({
  [Size.Tiny]: 'rules.facet.size.tiny',
  [Size.Small]: 'rules.facet.size.small',
  [Size.Medium]: 'rules.facet.size.medium',
  [Size.Large]: 'rules.facet.size.large',
  [Size.Huge]: 'rules.facet.size.huge',
  [Size.Gargantuan]: 'rules.facet.size.gargantuan',
});

/**
 * What the bestiary filters on besides the common level, rarity and traits (a creature's type is one of its traits):
 * monster or NPC, and size.
 */
export const CREATURE_FACETS: readonly FacetDefinition[] = [
  {
    id: FacetId.parse('role'),
    type: FacetType.Set,
    label: CreatureFacetMessage.Role,
    path: ['data', 'role'],
    values: ROLE_LABELS,
    appliesTo: [ContentKind.Creature],
  },
  {
    id: FacetId.parse('size'),
    type: FacetType.Set,
    label: CreatureFacetMessage.Size,
    path: ['data', 'size'],
    values: SIZE_LABELS,
    appliesTo: [ContentKind.Creature],
  },
];
