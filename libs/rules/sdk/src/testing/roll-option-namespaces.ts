import { NamespaceKind, RollOptionNamespace } from '../roll-option-namespace';

const { Known, Situational } = NamespaceKind;

/**
 * The core rules pack's roll option namespaces, for tests below the content packs, as the table `PredicateFacts`
 * reads. The core rules pack holds the real list, and its tests check this copy against it.
 */
export const CORE_NAMESPACES: ReadonlyMap<RollOptionNamespace, NamespaceKind> = new Map(
  Object.entries({
    self: Known,
    'self:action': Situational,
    'self:flanking': Situational,
    'self:participant': Situational,
    item: Known,
    parent: Known,
    class: Known,
    feat: Known,
    feature: Known,
    ancestry: Known,
    heritage: Known,
    background: Known,
    deity: Known,
    armor: Known,
    skill: Known,
    defense: Known,
    action: Situational,
    attack: Situational,
    bonus: Situational,
    check: Situational,
    damage: Situational,
    encounter: Situational,
    inflicts: Situational,
    lighting: Situational,
    origin: Situational,
    penalty: Situational,
    proficiency: Situational,
    situation: Situational,
    spellcasting: Situational,
    target: Situational,
    terrain: Situational,
  }).map(([namespace, kind]) => [RollOptionNamespace.parse(namespace), kind]),
);
