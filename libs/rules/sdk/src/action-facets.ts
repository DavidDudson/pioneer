import {
  actionCostValue,
  ActionCostValue,
  actionMode,
  ActionMode,
  actionSkills,
  featArchetype,
  featSkills,
  SkillValue,
} from './action-facet-values';
import { ContentKind } from './content-kind';
import { facetLabels, FacetId, FacetLabel, FacetType } from './facet';
import type { FacetDefinition } from './facet';
import { FeatCategory } from './feat';

const ActionFacetMessage = {
  ActionCost: FacetLabel.parse('rules.facet.label.actionCost'),
  FeatCategory: FacetLabel.parse('rules.facet.label.featCategory'),
  Archetype: FacetLabel.parse('rules.facet.label.archetype'),
  Skill: FacetLabel.parse('rules.facet.label.skill'),
  Mode: FacetLabel.parse('rules.facet.label.mode'),
} as const;

const ACTION_COST_LABELS = facetLabels({
  [ActionCostValue.One]: 'rules.facet.actionCost.one',
  [ActionCostValue.Two]: 'rules.facet.actionCost.two',
  [ActionCostValue.Three]: 'rules.facet.actionCost.three',
  [ActionCostValue.Free]: 'rules.facet.actionCost.free',
  [ActionCostValue.Reaction]: 'rules.facet.actionCost.reaction',
  [ActionCostValue.Variable]: 'rules.facet.actionCost.variable',
  [ActionCostValue.Passive]: 'rules.facet.actionCost.passive',
});

const FEAT_CATEGORY_LABELS = facetLabels({
  [FeatCategory.Ancestry]: 'rules.facet.featCategory.ancestry',
  [FeatCategory.Class]: 'rules.facet.featCategory.class',
  [FeatCategory.General]: 'rules.facet.featCategory.general',
  [FeatCategory.Skill]: 'rules.facet.featCategory.skill',
  [FeatCategory.Bonus]: 'rules.facet.featCategory.bonus',
});

const SKILL_LABELS = facetLabels({
  [SkillValue.Acrobatics]: 'rules.facet.skill.acrobatics',
  [SkillValue.Arcana]: 'rules.facet.skill.arcana',
  [SkillValue.Athletics]: 'rules.facet.skill.athletics',
  [SkillValue.Crafting]: 'rules.facet.skill.crafting',
  [SkillValue.Deception]: 'rules.facet.skill.deception',
  [SkillValue.Diplomacy]: 'rules.facet.skill.diplomacy',
  [SkillValue.Intimidation]: 'rules.facet.skill.intimidation',
  [SkillValue.Lore]: 'rules.facet.skill.lore',
  [SkillValue.Medicine]: 'rules.facet.skill.medicine',
  [SkillValue.Nature]: 'rules.facet.skill.nature',
  [SkillValue.Occultism]: 'rules.facet.skill.occultism',
  [SkillValue.Performance]: 'rules.facet.skill.performance',
  [SkillValue.Religion]: 'rules.facet.skill.religion',
  [SkillValue.Society]: 'rules.facet.skill.society',
  [SkillValue.Stealth]: 'rules.facet.skill.stealth',
  [SkillValue.Survival]: 'rules.facet.skill.survival',
  [SkillValue.Thievery]: 'rules.facet.skill.thievery',
  [SkillValue.None]: 'rules.facet.skill.none',
});

const MODE_LABELS = facetLabels({
  [ActionMode.Encounter]: 'rules.facet.mode.encounter',
  [ActionMode.Exploration]: 'rules.facet.mode.exploration',
  [ActionMode.Downtime]: 'rules.facet.mode.downtime',
});

/** Shared by feats and actions, so a mixed list filters both by one facet. */
const ACTION_COST_FACET: FacetDefinition = {
  id: FacetId.parse('action-cost'),
  type: FacetType.Set,
  label: ActionFacetMessage.ActionCost,
  values: ACTION_COST_LABELS,
  derive: (entry): readonly unknown[] => {
    if (entry.kind === ContentKind.Feat) {
      return [actionCostValue(entry.data.action)];
    }
    return entry.kind === ContentKind.Action ? [actionCostValue(entry.data)] : [];
  },
};

/** Shared by feats and actions, like the action cost. */
const SKILL_FACET: FacetDefinition = {
  id: FacetId.parse('skill'),
  type: FacetType.Set,
  label: ActionFacetMessage.Skill,
  values: SKILL_LABELS,
  derive: (entry): readonly unknown[] => {
    if (entry.kind === ContentKind.Feat) {
      return featSkills(entry);
    }
    return entry.kind === ContentKind.Action ? actionSkills(entry) : [];
  },
};

/** The feat facets (content-model.md, "Filters"), beyond the common ones. Prerequisites met needs a character. */
export const FEAT_FACETS: readonly FacetDefinition[] = [
  {
    id: FacetId.parse('feat-category'),
    type: FacetType.Set,
    label: ActionFacetMessage.FeatCategory,
    values: FEAT_CATEGORY_LABELS,
    derive: (entry): readonly unknown[] => (entry.kind === ContentKind.Feat ? [entry.data.category] : []),
  },
  ACTION_COST_FACET,
  {
    id: FacetId.parse('archetype'),
    type: FacetType.Set,
    label: ActionFacetMessage.Archetype,
    derive: (entry): readonly unknown[] => (entry.kind === ContentKind.Feat ? featArchetype(entry) : []),
  },
  SKILL_FACET,
];

/** The action facets beyond the common ones; an action's traits are the common `traits` facet. */
export const ACTION_FACETS: readonly FacetDefinition[] = [
  ACTION_COST_FACET,
  {
    id: FacetId.parse('mode'),
    type: FacetType.Set,
    label: ActionFacetMessage.Mode,
    values: MODE_LABELS,
    derive: (entry): readonly unknown[] => (entry.kind === ContentKind.Action ? [actionMode(entry)] : []),
  },
  SKILL_FACET,
];
