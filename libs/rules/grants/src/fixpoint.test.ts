import { describe, expect, test } from 'bun:test';

import { ContentKind, RollOption, Slug } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { GrantEntry, GrantRoot } from './grant-entry';
import { GrantsMessage } from './messages';
import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import type { TestInputs } from './testing/builders';
import { entry, grantOf, inputsOf, picked, picksOf, slotOf, toggleOf } from './testing/builders';

function resolve(
  entries: readonly GrantEntry[],
  roots: readonly GrantRoot[],
  more: Partial<TestInputs> = {},
): GrantResolution {
  return resolveGrants(inputsOf({ entries, roots, ...more }));
}

const names = (result: GrantResolution): string[] => result.items.map((item) => item.entry.name);
const options = (result: GrantResolution): string[] => result.rollOptions.map(String);

/** The names on the character once `entries` resolve from `roots`. */
const namesOf = (
  entries: readonly GrantEntry[],
  roots: readonly GrantRoot[],
  more: Partial<TestInputs> = {},
): string[] => names(resolve(entries, roots, more));

/** The roll options the character has once `entries` resolve from `roots`. */
const optionsOf = (
  entries: readonly GrantEntry[],
  roots: readonly GrantRoot[],
  more: Partial<TestInputs> = {},
): string[] => options(resolve(entries, roots, more));

/** `entry` of another kind. */
const ofKind = (made: GrantEntry, kind: ContentKind): GrantEntry => ({ ...made, kind });

/** A grant of `slug` while `predicate` holds. */
const grantWhen = (slug: string, predicate: unknown): object => ({ ...grantOf(slug), predicate });

const rollOption = (option: string, more: object = {}): object => ({ key: 'RollOption', option, ...more });

describe('resolveGrants to a fixpoint', () => {
  test('a grant reads what another root grants, whatever order the roots come in', () => {
    const content = [
      entry('fighter', [grantOf('shield-block')]),
      entry('warden', [grantWhen('warden-stance', ['feature:shield-block'])]),
      entry('shield-block'),
      entry('warden-stance'),
    ];
    const forward = resolve(content, [picked('fighter'), picked('warden')]);
    expect(names(forward)).toEqual(['fighter', 'shield-block', 'warden', 'warden-stance']);
    expect(resolve(content, [picked('warden'), picked('fighter')])).toEqual(forward);
  });

  test('follows chains of grants that each read the one before', () => {
    const content = [
      entry('root', [grantOf('a'), grantWhen('b', ['feature:a']), grantWhen('c', ['feature:b'])]),
      entry('a'),
      entry('b'),
      entry('c'),
    ];
    expect(namesOf(content, [picked('root')])).toEqual(['root', 'a', 'b', 'c']);
  });

  test('reads the level, so class features appear and disappear with it', () => {
    const content = [entry('fighter', [grantWhen('bravery', [{ gte: ['self:level', 3] }])]), entry('bravery')];
    expect(namesOf(content, [picked('fighter')], { level: 3 })).toEqual(['fighter', 'bravery']);
    expect(namesOf(content, [picked('fighter')], { level: 2 })).toEqual(['fighter']);
  });

  test('a condition implies another, and grants read both', () => {
    const content = [
      ofKind(entry('grabbed', [grantOf('off-guard')]), ContentKind.Condition),
      ofKind(entry('off-guard'), ContentKind.Condition),
      entry('sneak', [grantWhen('sneak-attack', ['self:condition:off-guard'])]),
      entry('sneak-attack'),
    ];
    const result = resolve(content, [picked('grabbed'), picked('sneak')]);
    expect(names(result)).toEqual(['grabbed', 'off-guard', 'sneak', 'sneak-attack']);
    expect(options(result)).toContain('self:condition:off-guard');
  });

  test.each([
    [ContentKind.Ancestry, ['ancestry:a']],
    [ContentKind.Background, ['background:a']],
    [ContentKind.Class, ['class:a']],
    [ContentKind.ClassFeature, ['feature:a']],
    [ContentKind.Condition, ['self:condition:a']],
    [ContentKind.Effect, ['self:effect:a']],
    [ContentKind.Feat, ['feat:a']],
    [ContentKind.Heritage, ['heritage:a']],
    [ContentKind.Creature, []],
    [ContentKind.Statistic, []],
  ] as const)('an entry of kind %s sets %p', (kind, expected) => {
    const made = ofKind(entry('a'), kind);
    expect(optionsOf([made], [picked('a')])).toEqual([...expected, 'self:level:1']);
  });

  test('a negative level sets no option', () => {
    const creature = ofKind(entry('a'), ContentKind.Creature);
    expect(optionsOf([creature], [picked('a')], { level: -1 })).toEqual([]);
  });

  test('an entry whose grant stops holding drops out with what it set', () => {
    const content = [
      entry('root', [grantOf('a'), grantWhen('b', [{ not: 'feature:c' }]), grantWhen('c', ['feature:a'])]),
      entry('a'),
      entry('b', [rollOption('self:b-set')]),
      entry('c'),
    ];
    const result = resolve(content, [picked('root')]);
    expect(names(result)).toEqual(['root', 'a', 'c']);
    expect(options(result)).not.toContain('self:b-set');
    expect(result.errors).toEqual([]);
  });

  test('a grant negated by what it grants is an error naming it, with only the settled entries kept', () => {
    const content = [entry('root', [grantOf('a'), grantWhen('b', [{ not: 'feature:b' }])]), entry('a'), entry('b')];
    const result = resolve(content, [picked('root')]);
    expect(names(result)).toEqual(['root', 'a']);
    expect(options(result)).toEqual(['feature:a', 'feature:root', 'self:level:1']);
    expect(result.errors).toEqual([{ error: message(GrantsMessage.Oscillates, { entries: 'b', count: 1 }), hops: [] }]);
  });

  test('a longer loop names every entry that comes and goes', () => {
    const content = [
      entry('root', [grantWhen('b', [{ not: 'feature:c' }]), grantWhen('c', ['feature:b'])]),
      entry('b'),
      entry('c'),
    ];
    const result = resolve(content, [picked('root')]);
    expect(names(result)).toEqual(['root']);
    expect(result.errors.map((failed) => failed.error)).toEqual([
      message(GrantsMessage.Oscillates, { entries: 'b, c', count: 2 }),
    ]);
  });

  test('a roll option that undoes itself is an error naming its entry', () => {
    const content = [entry('flicker', [rollOption('self:lit', { predicate: [{ not: 'self:lit' }] })])];
    const result = resolve(content, [picked('flicker')]);
    expect(names(result)).toEqual(['flicker']);
    expect(options(result)).not.toContain('self:lit');
    expect(result.errors.map((failed) => failed.error)).toEqual([
      message(GrantsMessage.Oscillates, { entries: 'flicker', count: 1 }),
    ]);
  });

  test('stops after a bounded number of rounds, naming what was still arriving', () => {
    const LENGTH = 40;
    const links = Array.from({ length: LENGTH }, (_value, index) => `link-${index}`);
    const root = entry('root', [
      grantOf('link-0'),
      ...links.slice(1).map((slug, index) => grantWhen(slug, [`feature:link-${index}`])),
    ]);
    const result = resolve([root, ...links.map((slug) => entry(slug))], [picked('root')]);
    expect(result.errors.map((failed) => failed.error)).toEqual([
      message(GrantsMessage.TooManyRounds, { entries: 'link-31', count: 1, maximum: 32 }),
    ]);
    expect(names(result)).not.toContain('link-31');
    expect(names(result)).toContain('link-30');
  });

  test('supplied situational facts settle a conditional grant', () => {
    const content = [entry('elf', [grantWhen('forest-climb', ['terrain:forest'])]), entry('forest-climb')];
    expect(namesOf(content, [picked('elf')])).toEqual(['elf']);
    const result = resolve(content, [picked('elf')], { situation: ['terrain:forest'] });
    expect(names(result)).toEqual(['elf', 'forest-climb']);
    expect(options(result)).not.toContain('terrain:forest');
    expect(result.facts.has('terrain:forest')).toBe(true);
  });
});

describe('roll options from the set', () => {
  test('a static RollOption in the all domain sets its option, and grants read it', () => {
    const content = [
      entry('fighter', [rollOption('self:armored'), grantWhen('juggernaut', ['self:armored'])]),
      entry('juggernaut'),
    ];
    const result = resolve(content, [picked('fighter')]);
    expect(names(result)).toEqual(['fighter', 'juggernaut']);
    expect(options(result)).toContain('self:armored');
  });

  test('skips options in another domain, with a value of false, or whose predicate does not hold', () => {
    const content = [
      entry('fighter', [
        rollOption('self:striking', { domain: 'attack-roll' }),
        rollOption('self:off', { value: false }),
        rollOption('self:gated', { predicate: ['terrain:forest'] }),
      ]),
    ];
    expect(optionsOf(content, [picked('fighter')])).toEqual(['feature:fighter', 'self:level:1']);
  });

  test('a toggle starts at its value and follows the state given', () => {
    const content = [
      entry('barbarian', [
        rollOption('self:effect:rage', { toggleable: true }),
        rollOption('self:effect:ready', { toggleable: true, value: true }),
      ]),
    ];
    const roots = [picked('barbarian')];
    const plain = resolve(content, roots);
    expect(options(plain)).toEqual(['feature:barbarian', 'self:effect:ready', 'self:level:1']);
    expect(plain.toggles.map((toggle) => [toggle.key, toggle.on])).toEqual([
      [toggleOf('barbarian', 0), false],
      [toggleOf('barbarian', 1), true],
    ]);
    const toggles = new Map([
      [toggleOf('barbarian', 0), { on: true, suboption: undefined }],
      [toggleOf('barbarian', 1), { on: false, suboption: undefined }],
    ]);
    expect(optionsOf(content, roots, { toggles })).toEqual(['feature:barbarian', 'self:effect:rage', 'self:level:1']);
  });

  test('a toggle that is on sets its suboption: the one picked if offered, else the first offered', () => {
    const suboptions = [
      { value: 'fire', label: 'Fire' },
      { value: 'cold', label: 'Cold', predicate: [{ gte: ['self:level', 5] }] },
      { value: 'acid', label: 'Acid' },
    ];
    const content = [entry('kineticist', [rollOption('self:aura', { toggleable: true, value: true, suboptions })])];
    const roots = [picked('kineticist')];
    const key = toggleOf('kineticist', 0);
    expect(optionsOf(content, roots)).toContain('self:aura:fire');
    const cold = new Map([[key, { on: true, suboption: Slug.parse('cold') }]]);
    expect(optionsOf(content, roots, { toggles: cold })).toContain('self:aura:fire');
    expect(optionsOf(content, roots, { toggles: cold, level: 5 })).toContain('self:aura:cold');
    const [toggle] = resolve(content, roots, { toggles: cold }).toggles;
    expect(toggle?.suboptions).toEqual([Slug.parse('fire'), Slug.parse('acid')]);
    expect(toggle?.suboption).toBe(Slug.parse('fire'));
  });

  test('a pick sets its rollOption, and its namespace is known, so other values read false', () => {
    const content = [
      entry('fighter', [
        {
          key: 'ChoiceSet',
          flag: 'group',
          rollOption: 'weapon-group',
          choices: [
            { value: 'sword', label: 'Sword' },
            { value: 'axe', label: 'Axe' },
          ],
        },
        grantWhen('sword-mastery', ['weapon-group:sword']),
        grantWhen('axe-mastery', ['weapon-group:axe']),
      ]),
      entry('sword-mastery'),
      entry('axe-mastery'),
    ];
    const picks = picksOf([[slotOf('fighter', 0), 'sword']]);
    const result = resolve(content, [picked('fighter')], { picks });
    expect(names(result)).toEqual(['fighter', 'sword-mastery']);
    expect(result.conditional).toEqual([]);
    expect(options(result)).toContain('weapon-group:sword');
    expect(result.facts.isKnown(RollOption.parse('weapon-group:axe'))).toBe(true);
  });
});

describe('options too long to write', () => {
  const LONG = 'a'.repeat(250);
  const LONGER = 'a'.repeat(260);

  test('a toggle whose suboption would outgrow a roll option sets only its option', () => {
    const suboptions = [{ value: 'cold', label: 'Cold' }];
    const option = `self:${LONG}`;
    const content = [entry('aura', [rollOption(option, { toggleable: true, value: true, suboptions })])];
    expect(optionsOf(content, [picked('aura')])).toEqual(['feature:aura', option, 'self:level:1']);
  });

  test('a pick whose rollOption would outgrow a roll option answers its slot without setting one', () => {
    const content = [
      entry('fighter', [
        { key: 'ChoiceSet', flag: 'long', rollOption: 'long', choices: [{ value: LONGER, label: 'Long' }] },
      ]),
    ];
    const result = resolve(content, [picked('fighter')], { picks: picksOf([[slotOf('fighter', 0), LONGER]]) });
    expect(result.answered[0]?.option).toBeUndefined();
    expect(options(result)).toEqual(['feature:fighter', 'self:level:1']);
  });
});
