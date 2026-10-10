import { describe, expect, it } from 'vitest';

import { TextInput } from '../../controls/text-input/text-input.component';
import { FieldHarness } from '../../testing/field-harness';
import { FieldError } from './error/error.component';
import { Field } from './field.component';
import { FieldHint } from './hint/hint.component';
import { Label } from './label/label.component';

function input(harness: FieldHarness): HTMLInputElement {
  const found = harness.root.querySelector('input');
  if (found === null) {
    throw new Error('Expected an input');
  }
  return found;
}

describe(Field, () => {
  it('derives its control, label, hint and error ids from one id unique to the field', () => {
    const first = new FieldHarness().field.instance;
    const second = new FieldHarness().field.instance;
    expect(first.controlId).not.toBe(second.controlId);
    for (const field of [first, second]) {
      const base = field.controlId.replace(/-control$/u, '');
      expect([field.controlId, field.labelId, field.hintId, field.errorId]).toStrictEqual([
        `${base}-control`,
        `${base}-label`,
        `${base}-hint`,
        `${base}-error`,
      ]);
    }
  });

  it('gives its control its id, and its label points at the control', async () => {
    const harness = new FieldHarness();
    harness.add(Label, 'Name');
    harness.add(TextInput);
    await harness.stable();
    const label = harness.root.querySelector('label');
    expect(input(harness).id).toBe(harness.field.instance.controlId);
    expect(label?.htmlFor).toBe(input(harness).id);
    expect(label?.id).toBe(harness.field.instance.labelId);
  });

  it('describes its control with nothing until a hint or error is present', async () => {
    const harness = new FieldHarness();
    harness.add(TextInput);
    await harness.stable();
    expect(harness.field.instance.describedBy()).toBeUndefined();
    expect(input(harness).hasAttribute('aria-describedby')).toBe(false);
  });

  it('describes its control with the error first, then the hint', async () => {
    const harness = new FieldHarness();
    harness.add(TextInput);
    harness.add(FieldHint, 'As it appears on the sheet.');
    harness.add(FieldError, 'Name is required.');
    await harness.stable();
    expect(harness.described(input(harness))).toStrictEqual(['Name is required.', 'As it appears on the sheet.']);
  });

  it('stops describing its control with a part once that part is gone', async () => {
    const harness = new FieldHarness();
    harness.add(TextInput);
    harness.add(FieldHint, 'As it appears on the sheet.');
    const error = harness.add(FieldError, 'Name is required.');
    await harness.stable();
    error.destroy();
    await harness.stable();
    expect(harness.described(input(harness))).toStrictEqual(['As it appears on the sheet.']);
  });

  it('keeps describing its control while any of several hints remains', async () => {
    const harness = new FieldHarness();
    harness.add(TextInput);
    const first = harness.add(FieldHint, 'As it appears on the sheet.');
    harness.add(FieldHint, 'As it appears on the sheet.');
    await harness.stable();
    first.destroy();
    await harness.stable();
    expect(input(harness).getAttribute('aria-describedby')).toBe(harness.field.instance.hintId);
  });

  it('marks its control invalid with the field', async () => {
    const harness = new FieldHarness();
    harness.add(TextInput);
    await harness.stable();
    expect(input(harness).hasAttribute('aria-invalid')).toBe(false);
    harness.field.setInput('invalid', true);
    await harness.stable();
    expect(input(harness).getAttribute('aria-invalid')).toBe('true');
  });
});
