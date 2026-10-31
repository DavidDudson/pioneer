import { SKILLS } from './foundry-skills';

function titleCase(slug: string): string {
  return `${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
}

/** The skills Foundry's `skills` config lists, as choices. */
export const SKILL_CHOICES: readonly unknown[] = [...SKILLS].map((skill) => ({
  value: skill,
  label: titleCase(skill),
}));

/** Foundry's read of a choice's own value in the predicate of a config, which each skill choice fills with its skill. */
const CHOICE_VALUE = '{choice|value}';

/** A predicate with each `{choice|value}` in it replaced by `value`. */
function withChoiceValue(node: unknown, value: string): unknown {
  if (typeof node === 'string') {
    return node.replaceAll(CHOICE_VALUE, value);
  }
  if (Array.isArray(node)) {
    return node.map((each: unknown) => withChoiceValue(each, value));
  }
  if (typeof node === 'object' && node !== null) {
    return Object.fromEntries(Object.entries(node).map(([field, each]) => [field, withChoiceValue(each, value)]));
  }
  return node;
}

/** Each skill as a choice shown only while the config's predicate holds for it (`skill:{choice|value}:rank:0`). */
export function skillChoicesWhere(predicate: unknown): readonly unknown[] {
  return [...SKILLS].map((skill) => ({
    value: skill,
    label: titleCase(skill),
    predicate: withChoiceValue(predicate, skill),
  }));
}
