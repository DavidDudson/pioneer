import { SheetMode } from '@pioneer/character/domain';
import { describe, expect, it, vi } from 'vitest';

import { MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';

const MODES = [SheetMode.Plan, SheetMode.Encounter, SheetMode.Exploration, SheetMode.Downtime] as const;

/** The side panels' disclosures, in order. */
function panelsOf(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('pio-sheet-panels fr-disclosure')].filter(
    (panel) => panel.parentElement?.closest('fr-disclosure') === null,
  );
}

function titleOf(panel: HTMLElement): string {
  return present(panel.querySelector('summary')).textContent.trim();
}

describe('CharacterSheetPage side panels', () => {
  it.each(MODES)('shows hero points and the Skills, Conditions and Environments panels on the %s tab', async (mode) => {
    const { root } = await openerAt(mode)(MERISIEL);

    await vi.waitFor(() => {
      expect(panelsOf(root).map((panel) => titleOf(panel))).toStrictEqual(['Skills', 'Conditions', 'Environments']);
    });
    expect(root.querySelector('pio-sheet-panels pio-sheet-resources')).not.toBeNull();
  });

  it('puts hero points above the Skills panel, and the conditions only in the panels', async () => {
    const { root } = await openerAt(SheetMode.Encounter)(MERISIEL);

    await vi.waitFor(() => {
      expect(panelsOf(root)).toHaveLength(3);
    });
    const [first] = present(root.querySelector('pio-sheet-panels')).querySelectorAll(
      'pio-sheet-resources, fr-disclosure',
    );
    expect(first?.tagName).toBe('PIO-SHEET-RESOURCES');
    expect(root.querySelectorAll('pio-sheet-conditions')).toHaveLength(1);
  });

  it('opens each panel, and folds one away when its title is pressed', async () => {
    const { root } = await openerAt(SheetMode.Encounter)(MERISIEL);
    await vi.waitFor(() => {
      expect(panelsOf(root)).toHaveLength(3);
    });
    const [skills] = panelsOf(root);
    const details = present(present(skills).querySelector('details'));
    expect(details.open).toBe(true);

    present(present(skills).querySelector('summary')).click();

    await vi.waitFor(() => {
      expect(details.open).toBe(false);
    });
  });
});
