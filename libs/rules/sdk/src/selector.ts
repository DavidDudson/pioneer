import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { RulesMessage } from './messages';

/**
 * Lowercase alphanumeric words joined by single `-` or `:`: `ac`, `save:fortitude`, `skill-check`.
 * Written with a lookahead instead of `([-:][a-z\d]+)*` to keep it linear-time.
 */
const KEY_PATH = /^[a-z\d](?:[a-z\d]|[-:](?=[a-z\d]))*$/u;
const KEY_PATH_LENGTH_MAX = 128;

/** The shape shared by selectors, domains and slot keys. Each brands it again, so they don't mix. */
const KeyPath = z
  .string()
  .max(KEY_PATH_LENGTH_MAX)
  .refine((value) => KEY_PATH.test(value), issueParams(message(RulesMessage.KeyFormat)))
  .brand<'KeyPath'>();

/**
 * The stable key of a statistic (`ac`, `perception`, `save:fortitude`, `skill:athletics`,
 * `speed:land`). Statistics are content, so the set is open; only the shape is fixed.
 */
export const Selector = KeyPath.brand<'Selector'>();
export type Selector = z.infer<typeof Selector>;

/**
 * A group of statistics one modifier can target at once (`all`, `check`, `skill-check`,
 * `dex-based`, `attack-roll`).
 */
export const Domain = KeyPath.brand<'Domain'>();
export type Domain = z.infer<typeof Domain>;

/** A slot the builder fills with a choice (`class-feat:1`, `skill-increase:3`). */
export const SlotKey = KeyPath.brand<'SlotKey'>();
export type SlotKey = z.infer<typeof SlotKey>;

/** A toggleable `RollOption` on the character: its entry and rule index, `<entry id>:<rule>`. */
export const ToggleKey = KeyPath.brand<'ToggleKey'>();
export type ToggleKey = z.infer<typeof ToggleKey>;

const SKILL_PREFIX = 'skill:';
const SAVE_PREFIX = 'save:';

/** A skill's selector (`skill:medicine`, `skill:lore-boneyard`): a divine skill, a ritual check. */
export const SkillSelector = Selector.refine((selector) => selector.startsWith(SKILL_PREFIX), {
  ...issueParams(message(RulesMessage.SkillSelector)),
});

/** A saving throw's selector (`save:reflex`): the save a spell asks for. */
export const SaveSelector = Selector.refine((selector) => selector.startsWith(SAVE_PREFIX), {
  ...issueParams(message(RulesMessage.SaveSelector)),
});
