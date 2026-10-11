/**
 * Message keys the origin chain renders with, spelled out so the key check sees them. Joins are messages too,
 * spaces included, so a locale can change them.
 */
export const OriginChainMessage = {
  /** " → ": between one hop and the next. */
  Then: 'rules.originChain.then',
  /** "chosen for {slot}". */
  Choice: 'rules.originChain.choice',
  /** "granted by {name}". */
  Grant: 'rules.originChain.grant',
  /** "{item}, worn". */
  Inventory: 'rules.originChain.inventory',
  /** "{name} {value}": a condition, with its value when it has one. */
  Condition: 'rules.originChain.condition',
  /** "{hop}, applied by {event}": a condition or effect, with the campaign event that applied it. */
  AppliedBy: 'rules.originChain.appliedBy',
  /** "set by {user} ": the relative time follows. */
  SetBy: 'rules.originChain.setBy',
  /** ", “{note}”": why the user set it, in their words. */
  Note: 'rules.originChain.note',
  UnknownUser: 'rules.originChain.unknownUser',
  UnknownItem: 'rules.originChain.unknownItem',
  UnknownEntry: 'rules.originChain.unknownEntry',
} as const;
