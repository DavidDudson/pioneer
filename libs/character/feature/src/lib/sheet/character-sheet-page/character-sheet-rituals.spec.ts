import { SheetMode } from '@pioneer/character/domain';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { describe, expect, it, vi } from 'vitest';

import { MERISIEL, openerAt } from '../../testing/sheet-page-harness';

const openSheet = openerAt(SheetMode.Encounter);

/** A ritual no loaded pack has, as an import keeps one whose pack was since unloaded. */
const SUMMON_DREAD = contentId(PackId.parse('player-core'), EntrySlug.parse('ritual:summon-dread'));

describe('CharacterSheetPage rituals', () => {
  it('lists the rituals the character knows, naming one the content lacks as unknown', async () => {
    const { root } = await openSheet({ ...MERISIEL, build: { ...MERISIEL.build, rituals: [SUMMON_DREAD] } });

    await vi.waitFor(() => {
      const rituals = root.querySelector('pio-sheet-rituals');
      expect(rituals?.textContent).toContain('Rituals');
      expect(rituals?.textContent).toContain('Unknown content');
    });
  });

  it('shows nothing when the character knows no rituals', async () => {
    const { root } = await openSheet();

    await vi.waitFor(() => {
      expect(root.querySelector('pio-sheet-rituals')).not.toBeNull();
    });
    expect(root.querySelector('pio-sheet-rituals')?.textContent.trim()).toBe('');
  });
});
