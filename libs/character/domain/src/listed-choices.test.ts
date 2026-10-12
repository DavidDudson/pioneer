import { describe, expect, test } from 'bun:test';

import type { GrantResolution } from '@pioneer/rules/grants';
import { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { characterGrants } from './class-build';
import { listedChoices } from './listed-choices';
import { slotContent } from './slot-offer';
import { CharacterBuilder, playerCoreClasses, playerCoreClassId } from './testing';

const deities = new ContentPackBuilder().withId('deities').withDeity('sarenrae', { font: ['heal'] });
const registry = new ContentRegistry();
registry.register(playerCoreClasses());
registry.register(deities.build());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

/** A cleric of Sarenrae's grants, with `picks` made. */
function cleric(picks: readonly (readonly [string, string])[] = []): GrantResolution {
  const builder = new CharacterBuilder()
    .picking('class', playerCoreClassId('cleric'))
    .picking('deity', deities.idOf(ContentKind.Deity, 'sarenrae'));
  for (const [slot, pick] of picks) {
    builder.picking(slot, pick);
  }
  return characterGrants(builder.build().document, content);
}

/** Each listed choice as `<entry>: <flag>`. */
function namesOf(resolution: GrantResolution): readonly string[] {
  return listedChoices(resolution, content.lookup).map(({ slot, entryName }) => `${entryName}: ${slot.flag}`);
}

const FONT_SLOT = String(cleric().open.find((slot) => String(slot.flag) === 'divine-font')?.key);

describe('listedChoices', () => {
  test("lists a cleric's listed choices, with what each offers", () => {
    const font = listedChoices(cleric(), content.lookup).find(({ slot }) => String(slot.flag) === 'divine-font');

    expect(String(font?.entryName)).toBe('Divine Font');
    expect(font?.slot.options.map((option) => String(option.value))).toEqual(['heal']);
  });

  test('leaves out choices that query content: the doctrine and the feat slots', () => {
    const flags = listedChoices(cleric(), content.lookup).map(({ slot }) => String(slot.flag));

    expect(flags).not.toContain('cleric-doctrine');
    expect(flags.filter((flag) => flag.startsWith('class-feat'))).toEqual([]);
  });

  test('keeps a choice in its place once it is answered', () => {
    expect(namesOf(cleric([[FONT_SLOT, 'heal']]))).toEqual(namesOf(cleric()));
  });
});
