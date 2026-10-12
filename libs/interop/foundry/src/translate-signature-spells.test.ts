import { describe, expect, test } from 'bun:test';

import { RuleElementKey } from '@pioneer/rules/sdk';

import { rulesIn } from './testing/build-helpers';
import { translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { SIGNATURE_SPELLS, WIZARD_SPELLCASTING } from './testing/spellcasting-fixtures';

const { SignatureSpells } = RuleElementKey;

function signatures(name: string, fixture: DocumentFixture): unknown[] {
  return rulesIn(translate([fixture]), name).filter(
    (rule) => typeof rule === 'object' && rule !== null && 'key' in rule && rule.key === SignatureSpells,
  );
}

describe('translateKindData: signature spells', () => {
  test("Signature Spells gives the bard's entry signature spells", () => {
    expect(signatures('signature-spells', SIGNATURE_SPELLS)).toEqual([{ key: SignatureSpells, entry: 'bard' }]);
  });

  test('no other feature gives any', () => {
    expect(signatures('wizard-spellcasting', WIZARD_SPELLCASTING)).toEqual([]);
  });
});
