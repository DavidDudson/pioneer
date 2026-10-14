import { describe, expect, test } from 'bun:test';

import { Slug, ToggleKey } from '@pioneer/rules/sdk';

import {
  applyToggleCommand,
  TOGGLES_MAX,
  ToggleCommandField,
  ToggleCommandSchema,
  toggleStates,
} from './toggle-commands';
import type { ToggleCommand, Toggles } from './toggle-commands';

const RAGE = ToggleKey.parse('pack:effect:rage:0');
const STANCE = ToggleKey.parse('pack:effect:stance:2');
const FIRE = Slug.parse('fire');

function set(toggle: ToggleKey, on: boolean, suboption?: string): ToggleCommand {
  return {
    field: ToggleCommandField.SetToggle,
    toggle,
    state: suboption === undefined ? { on } : { on, suboption: Slug.parse(suboption) },
  };
}

describe('applyToggleCommand', () => {
  test('sets a toggle on, then off, keeping the others', () => {
    const on = applyToggleCommand({ [STANCE]: { on: true } }, set(RAGE, true));
    expect(on).toStrictEqual({ [STANCE]: { on: true }, [RAGE]: { on: true } });
    expect(applyToggleCommand(on, set(RAGE, false))).toStrictEqual({ [STANCE]: { on: true }, [RAGE]: { on: false } });
  });

  test('remembers the suboption picked', () => {
    expect(applyToggleCommand({}, set(RAGE, true, 'fire'))).toStrictEqual({ [RAGE]: { on: true, suboption: FIRE } });
  });

  test('does not keep a new toggle past the most a character remembers, but still updates one it has', () => {
    const full: Toggles = Object.fromEntries(
      Array.from({ length: TOGGLES_MAX }, (_unused, index) => [
        ToggleKey.parse(`pack:effect:e${index}:0`),
        { on: true },
      ]),
    );
    expect(applyToggleCommand(full, set(RAGE, true))).toBe(full);
    const [first] = Object.keys(full);
    const key = ToggleKey.parse(first);
    expect(applyToggleCommand(full, set(key, false))[key]).toStrictEqual({ on: false });
  });
});

describe('toggleStates', () => {
  test('reads the toggles as the grants engine does, a suboption left out as undefined', () => {
    const states = toggleStates({ [RAGE]: { on: true }, [STANCE]: { on: false, suboption: Slug.parse('fire') } });
    expect(states.get(RAGE)).toStrictEqual({ on: true, suboption: undefined });
    expect(states.get(STANCE)).toStrictEqual({ on: false, suboption: FIRE });
  });
});

describe('ToggleCommandSchema', () => {
  test('accepts a set toggle and rejects a toggle that is not a key', () => {
    expect(ToggleCommandSchema.safeParse(set(RAGE, true)).success).toBe(true);
    expect(ToggleCommandSchema.safeParse({ ...set(RAGE, true), toggle: '' }).success).toBe(false);
  });
});
