import { describe, expect, it } from 'vitest';

import {
  chooseSchema,
  secondTextArea,
  openPlayground,
  pageText,
  present,
  typeInto,
  typeJson,
} from './playground-harness';

describe('RulesPlaygroundPage', () => {
  it('opens on a valid example predicate', async () => {
    const harness = await openPlayground();
    // Text from the route's `play` scope, loaded with the page's code.
    expect(pageText(harness)).toContain('Valid.');
    expect(pageText(harness)).toContain('"gte"');
    // The schema picker's label comes from the `play` scope, not a scope-prefixed key.
    const picker = present(harness.routeNativeElement?.querySelector('button')).textContent;
    expect(picker).toContain('Predicate');
    expect(picker).not.toContain('play.rules');
    expect(present(harness.routeNativeElement?.querySelector('textarea')).value).toContain('self:condition:frightened');
  });

  it('points at each problem with text from the rules and kernel bundles', async () => {
    const harness = await openPlayground();
    await typeJson(harness, '["Frightened", { "and": ["a:b"], "label": "x" }]');

    const text = pageText(harness);
    expect(text).toContain('2 problems');
    expect(text).toContain('[0]');
    expect(text).toContain('Use a namespace and a name joined by colons, like self:condition:frightened.');
    expect(text).toContain('[1].label');
    expect(text).toContain('“label” is not a field here.');
  });

  it('describes the textarea with the problem summary, so screen readers announce it', async () => {
    const harness = await openPlayground();
    await typeJson(harness, '["Frightened", { "and": ["a:b"], "label": "x" }]');

    const textarea = present(harness.routeNativeElement?.querySelector('textarea'));
    const describedBy = present(textarea.getAttribute('aria-describedby'));
    const description = present(document.querySelector(`#${CSS.escape(describedBy)}`));
    expect(description.textContent).toContain('2 problems, listed under Result.');
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
  });

  it('says when the text is not JSON yet', async () => {
    const harness = await openPlayground();
    await typeJson(harness, '[self:condition:frightened');
    expect(pageText(harness)).toContain('This is not valid JSON yet.');
  });

  it('checks rule elements, naming an element it does not know', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Rule element');
    expect(pageText(harness)).toContain('Valid.');
    expect(pageText(harness)).toContain('"FlatModifier"');

    await typeJson(harness, '{ "key": "ActiveEffectLike", "path": "system.attributes.ac.value" }');
    const text = pageText(harness);
    expect(text).toContain('1 problem');
    expect(text).toContain('key');
    expect(text).toContain('“ActiveEffectLike” is not a rule element Pioneer knows yet.');
  });

  it('switches to a one-line formula input that opens on a valid example', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Formula');
    expect(pageText(harness)).toContain('Value: 20');
    expect(pageText(harness)).toContain('10 + @attr.dex.capped + @prof.ac');
    expect(harness.routeNativeElement?.querySelector('textarea')).toBeNull();
  });

  it('evaluates the formula with a number box per reference', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Formula');
    expect(pageText(harness)).toContain('Value: 20');
    expect(pageText(harness)).toContain('@attr.dex.capped');

    const boxes = [...present(harness.routeNativeElement).querySelectorAll<HTMLInputElement>('input[type="number"]')];
    expect(boxes).toHaveLength(2);
    const proficiency = present(boxes[1]);
    await typeInto(harness, proficiency, '12');
    expect(pageText(harness)).toContain('Value: 25');
  });

  it('leaves a reference without a value while its box is empty, and points at it', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Formula');
    const boxes = [...present(harness.routeNativeElement).querySelectorAll<HTMLInputElement>('input[type="number"]')];
    const proficiency = present(boxes[1]);
    await typeInto(harness, proficiency, '');
    const text = pageText(harness);
    expect(text).toContain('“@prof.ac” at position 25 has no value.');
    expect(text).toContain(`10 + @attr.dex.capped + @prof.ac\n${' '.repeat(24)}^`);
    expect(proficiency.getAttribute('aria-invalid')).toBe('true');
  });

  it('keeps the boxes while the formula is mid-edit, and resets one whose reference left the formula', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Formula');
    const formula = present(harness.routeNativeElement?.querySelector<HTMLInputElement>('input:not([type="number"])'));
    const proficiency = present(
      [...present(harness.routeNativeElement).querySelectorAll<HTMLInputElement>('input[type="number"]')][1],
    );
    await typeInto(harness, proficiency, '');

    await typeInto(harness, formula, '10 + @attr.dex.capped + @prof.ac *');
    expect(proficiency.isConnected).toBe(true);

    await typeInto(harness, formula, '10 + @attr.dex.capped');
    await typeInto(harness, formula, '10 + @attr.dex.capped + @prof.ac');
    const boxes = [...present(harness.routeNativeElement).querySelectorAll<HTMLInputElement>('input[type="number"]')];
    expect(present(boxes[1]).value).toBe('7');
    expect(pageText(harness)).toContain('Value: 20');
  });

  it('says what each reference reads, and which ones stored formulas cannot use', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Formula');
    const formula = present(harness.routeNativeElement?.querySelector<HTMLInputElement>('input:not([type="number"])'));
    await typeInto(harness, formula, '@prof.ac + @actor.level + @luck');

    const text = pageText(harness);
    expect(text).toContain('The proficiency bonus for that statistic');
    expect(text).toContain('This is Foundry’s spelling. Stored formulas write @level.');
    expect(text).toContain('Pioneer has no such reference, so stored formulas cannot use it.');
  });

  it('points into a bad formula in a rule element', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Rule element');
    await typeJson(
      harness,
      '{ "key": "FlatModifier", "selectors": ["ac"], "type": "item", "value": "@level + @attr.luck" }',
    );

    const text = pageText(harness);
    expect(text).toContain('1 problem');
    expect(text).toContain('“@attr.luck” at position 10 is not a reference Pioneer knows.');
    expect(text).toContain(`@level + @attr.luck\n${' '.repeat(9)}^`);
  });

  it('points at the first mistake in a formula with text from the formula bundle', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Formula');
    const input = present(harness.routeNativeElement?.querySelector('input'));
    input.value = 'max(1, level)';
    input.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();

    const text = pageText(harness);
    expect(text).toContain('max(1, level)\n       ^');
    expect(text).toContain('“level” at position 8 is not a function.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('evaluates a predicate against roll options and shows each statement verdict', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Predicate verdict');

    const text = pageText(harness);
    expect(text).toContain('The predicate depends on the situation');
    expect(text).toContain('Holds');
    expect(text).toContain('Depends');
    expect(text).toContain('{"gte":["self:level",5]}');

    const facts = secondTextArea(harness);
    facts.value = 'self:condition:frightened\nself:level:5\naction:seek';
    facts.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    expect(pageText(harness)).toContain('The predicate holds.');
  });

  it('points at roll option lines that are not roll options', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Predicate verdict');

    const facts = secondTextArea(harness);
    facts.value = 'self:level:5\nFrightened';
    facts.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();

    expect(pageText(harness)).toContain('Line 2 is not a roll option.');
    expect(facts.getAttribute('aria-invalid')).toBe('true');
  });

  it('says in English when a predicate that depends on the situation would hold', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Predicate verdict');
    expect(pageText(harness)).toContain('It holds when you use Seek or you are in forest.');
  });

  // Snapshot of the en wording for Player Core conditions, from the rules/predicate vocabulary.
  it.each([
    ['["target:mark:hunted-prey"]', 'It holds when the target is your hunted prey.'],
    ['["terrain:forest"]', 'It holds when you are in forest.'],
    [
      '["encounter:round:1", { "or": ["self:participant:initiative:stat:deception", "self:participant:initiative:stat:stealth"] }]',
      'It holds when encounter:round:1 applies and either you rolled initiative with Deception or you rolled initiative with Stealth.',
    ],
    [
      '["terrain:forest", { "not": "lighting:darkness" }]',
      'It holds when you are in forest and you are not in darkness.',
    ],
    ['[{ "if": "terrain:forest", "then": "action:seek" }]', 'It holds when you are not in forest or you use Seek.'],
    [
      '[{ "not": "target:trait:undead" }, { "gte": ["target:level", 5] }]',
      'It holds when the target is not undead and target:level is at least 5.',
    ],
  ] as const)('words %s in English', async (predicate, expected) => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Predicate verdict');
    await typeJson(harness, predicate);
    expect(pageText(harness)).toContain(expected);
  });
});
